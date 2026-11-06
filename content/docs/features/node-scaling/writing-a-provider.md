---
title: "Writing a node provider"
linkTitle: "Writing a provider"
weight: 3
description: "How to write a node provider for a platform: the HTTP contract the node scaling operator calls, what the operator relies on, the registration and the heartbeat, a provider in Go, and the contract checks it runs."
---

A **node provider** is an application outside the core that creates and deletes the machines of one
platform (a cloud, a hosting provider, the VMs of a lab) for the node scaling operator. The operator
decides how many machines a [node group](/docs/features/node-scaling/nodegroup) needs and calls the
provider that the group names; the provider talks to the platform with its own credentials, which
never enter the cluster. This page is for writing one. The objects are described in
[NodeProvider](/docs/features/node-scaling/nodeprovider) and [NodeGroup](/docs/features/node-scaling/nodegroup).

The Go packages are in the repository `norca-platform`: `nodescaler/provider` (the contract, the
HTTP handler and the client), `nodescaler/registrar` (the registration and the heartbeat),
`nodescaler/provider/providertest` (the contract checks), and two providers to start from:
`nodescaler/provider/mock` (in memory) and `nodescaler/provider/docker` (containers on one host, for
the lab). `cmd/nodeprovider` runs either of them.

## The contract

The operator calls the provider over HTTP, with the token of the provider as a bearer token:

| Request | Answer |
| --- | --- |
| `GET /v1/groups/{group}` | The group: `name`, the `capacity` of one machine (`cpu` in MHz, `memory` and `disk` in MB) and its `instances`. The query string has the `parameters` of the node group, as strings. |
| `POST /v1/groups/{group}/instances` | Creates the instances of a request; the answer lists them (`instances`). |
| `DELETE /v1/groups/{group}/instances/{id}` | Deletes one instance. |
| `GET /v1/health` | `200` while the provider runs; it needs no token. |

A create request:

```json
{
  "request_id": "eu/workers-dc2/7",
  "instances": [
    { "name": "workers-dc2-7-1", "bootstrap": { "user_data": "#cloud-config\n..." } }
  ],
  "parameters": { "size": "cx32", "image": "norca-worker-4" },
  "labels": {
    "norca.region": "eu", "norca.node_group": "workers-dc2", "norca.pool": "workers",
    "norca.datacenter": "dc2", "norca.class": "", "norca.request": "eu/workers-dc2/7"
  }
}
```

An instance:

```json
{
  "id": "hz-58213077", "name": "workers-dc2-7-1", "state": "running",
  "request_id": "eu/workers-dc2/7", "labels": { "norca.node_group": "workers-dc2", "...": "..." },
  "addresses": ["10.77.2.14"], "created_at": "2026-11-06T10:42:00Z"
}
```

`state` is `creating`, `running`, `deleting` or `failed`; a failed instance says why in `reason`
and `message`. A request that cannot be served is answered with an error body `{"reason": ...,
"error": ...}`: `invalid` (status 400; an unknown group is 404), `quota` or `no_capacity` (422), or
`error` (500). With `provider.NewHandler` a provider returns Go errors and the handler writes them.

## What the operator relies on

The operator keeps no state of its own about the machines: what it knows is what the provider
lists. These rules are what make that safe.

- **A create is idempotent by its `request_id`, also after a restart of the provider.** The operator
  repeats a request after a failure or a restart of its own, and must get the instances of the first
  one back, not new ones. Keep the request ID on the platform (a tag or a label of the machine), not
  in memory.
- **List from the platform, not from memory.** A restarted provider lists the same instances as
  before. The lab restarts its provider to change its limits, and the docker provider finds its
  containers again by their labels.
- **Keep the name.** The machine is named after `name` (the platform's name of the machine, and the
  node name). The node registers with it in its meta (`norca.instance`), which is how the operator
  matches a node with its instance.
- **Keep the labels of the request on the instance.** The operator picks the instances of a group by
  `norca.node_group` and `norca.region`: an instance without them is not seen at all. The orphan
  sweep reads `norca.datacenter`, `norca.pool` and `norca.class` too.
- **Pass the bootstrap on unchanged** as the user data of the machine. It holds the configuration of
  the agent and either its certificate or a one-time join token; do not log it.
- **Report the capacity of a machine also when the group has no instance.** The scaler sizes its
  decisions with it, `min = 0` included.
- **Say why a create fails, and do not retry for ever.** `quota` for a limit of the platform or of
  the group, `no_capacity` when the zone has no machine of the kind now, `invalid` for a wrong
  request or parameter. The operator backs off, reports the reason in the conditions of the group,
  and tries another group or a smaller step. A rolling replacement whose new node is refused keeps
  the old node; see [the rolling replacement](/docs/features/node-scaling/nodegroup#the-rolling-replacement-of-nodes).
- **Report a machine that did not come up as `failed`,** with a message (the docker provider puts the
  last lines of the container's output there). The operator deletes it and asks for another; a row
  of failures stops the group (`JoinFailing`).
- **Delete is idempotent:** deleting an instance that is gone is not an error.
- **Set `created_at`.** The orphan sweep leaves an instance alone until it is older than
  `-orphan-after`.
- **The `max` of a group is the provider's quota.** The operator may ask for one more machine than
  the scale during a rolling replacement (`max_surge`); a provider that refuses it with `quota` is
  handled, one that overcommits the platform is not.

## Registration and heartbeat

A provider registers itself by writing its `NodeProvider` object (its `endpoint`, the
`token_variable`, the `groups` with their `max` and `parameters`) and keeps `status.heartbeat`
current. The operator takes a provider whose heartbeat is older than `-provider-ttl` (3 minutes) for
unavailable, so a heartbeat every 10–30 seconds is right.

- The operator calls only `https://` endpoints, unless it runs with `-provider-allow-http` (the
  `provider_allow_http` variable of the pack, for a lab).
- The token is the item `token` of the Variable `token_variable` names. The operator reads it with
  its own policy: the `nodescaler-operator` pack grants read on `nodescaler/*` in the namespace of
  the bootstrap, so put it there (for example `nodescaler/providers/<name>`).
- The provider writes its object and its status with a token of its own, which needs write and
  write-status on the kind `norca.io/NodeProvider`.
- Deregister on a clean exit, so the operator reports the provider as unknown at once instead of
  waiting for the heartbeat to run out.

## A provider in Go

A provider implements `provider.Provider`, serves it with `provider.NewHandler` and registers it
with `registrar.Registrar`. `cmd/nodeprovider` does exactly this for the mock and the docker
provider; a provider for a cloud replaces the implementation:

```go
type cloud struct{ api *cloudAPI } // the platform's client, with its credentials

func (c *cloud) Group(ctx context.Context, group string, params map[string]any) (*provider.Group, error) {
	zone, ok := c.api.Zone(group)
	if !ok {
		return nil, provider.ErrUnknownGroup
	}
	size, err := c.api.MachineType(ctx, params["size"])
	if err != nil {
		return nil, provider.Fail(provider.ReasonInvalid, "size: %v", err)
	}
	machines, err := c.api.List(ctx, zone, "norca.node_group") // by label, from the platform
	if err != nil {
		return nil, err
	}
	g := &provider.Group{Name: group, Capacity: &provider.Capacity{CPU: size.MHz, Memory: size.MB, Disk: size.DiskMB},
		Instances: []provider.Instance{}}
	for _, m := range machines {
		g.Instances = append(g.Instances, toInstance(m)) // ID, name, state, labels, request ID, created
	}
	return g, nil
}

func (c *cloud) Create(ctx context.Context, group string, req provider.CreateRequest) ([]provider.Instance, error) {
	if done, err := c.api.ListByLabel(ctx, "norca.request", req.RequestID); err != nil || len(done) > 0 {
		return toInstances(done), err // the same request again: what it created the first time
	}
	// Check the request (provider.ReasonInvalid), then the quota (provider.ReasonQuota) before
	// creating anything, and create one machine per instance with its name, the labels of the
	// request and the bootstrap as the user data.
	...
}

func (c *cloud) Delete(ctx context.Context, group, id string) error {
	err := c.api.Delete(ctx, id)
	if errors.Is(err, errNotFound) {
		return nil // gone already
	}
	return err
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	p := &cloud{api: newCloudAPI()}
	srv := &http.Server{Addr: ":8443", Handler: provider.NewHandler(p, token, logger), ReadHeaderTimeout: 10 * time.Second}
	go srv.ListenAndServeTLS(certFile, keyFile)

	store, _ := registrar.NewAPIStore(nil) // the Norca API of NORCA_ADDR (also unix://) and NORCA_TOKEN
	reg := &registrar.Registrar{
		Store: store,
		Registration: registrar.Registration{
			Name: "hetzner-eu", Endpoint: "https://provider.example.org:8443",
			TokenVariable: "nodescaler/providers/hetzner-eu",
			Groups: []registrar.GroupSpec{{Name: "fsn1", Max: 20}, {Name: "nbg1", Max: 20}},
		},
		Interval: 15 * time.Second, Version: version, DeregisterOnExit: true, Logger: logger,
	}
	_ = reg.Run(ctx) // registers, then reports the heartbeat until ctx ends
	_ = srv.Shutdown(context.Background())
}
```

The calls of `cloudAPI` stand for the platform's SDK; the license of the SDK must be on the allowed
list of the repository.

## The contract checks

`nodescaler/provider/providertest` checks a provider the way the operator uses it: it serves the
provider with `provider.NewHandler`, calls it with the operator's client over HTTP, and checks the
capacity of a group without instances, the idempotent create (names, labels, request IDs), invalid
requests and unknown groups, the quota reason of a full group, the delete, a restart that loses
nothing, and the token. The mock and the docker provider run it in their tests; a provider for a
cloud runs it against a test account, with groups of its own:

```go
func TestContract(t *testing.T) {
	providertest.Run(t, providertest.Config{
		New:        func(t *testing.T) provider.Provider { return newTestProvider(t) },
		Restart:    func(t *testing.T, _ provider.Provider) provider.Provider { return newTestProvider(t) },
		Group:      "fsn1",
		Params:     map[string]any{"size": "cx22"},
		QuotaGroup: "fsn1-small", QuotaMax: 2,
		Settle:     time.Minute, // the lists of the platform lag behind its writes
	})
}
```

`Restart` returns a new provider of the same platform, as after a restart of the application;
`Settle` lets a check wait for a list that shows a change late; `Bootstrap` gives a real bootstrap to
a provider that reads it.

## Where it runs

A provider runs outside the pools it scales, and outside the failure domain it serves: not on the
nodes it creates, and reachable from the operator at the address it registers. The rules are those of
[where to run a controller](/docs/features/operator-framework/controllers#where-to-run-a-controller).
