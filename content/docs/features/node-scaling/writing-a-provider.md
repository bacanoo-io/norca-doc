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

A provider is usually a **type of `norca-provider`**, the provider application in the repository
`norca-platform`: one package per platform under `providers/`, which can serve node groups and
[load balancer classes](/docs/features/operator-framework/loadbalancer-providers) with the same
credentials. The Go packages: `provider/node` (the contract, the HTTP handler and the client),
`provider/registrar` (the registration and the heartbeat of `NodeProvider` and `LoadBalancerClass`
objects), `provider/node/providertest` (the contract checks), `provider` (the type registry, the
configuration and the server of `norca-provider`), and two providers to start from:
`providers/mock` (in memory) and `providers/docker` (containers on one host, for the lab).

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
"error": ...}`:

- `invalid` (status 400; an unknown group is 404),
- `quota` or `no_capacity` (422),
- or `error` (500).

With `node.NewHandler` a provider returns Go errors and the handler writes them. The
load balancer contract answers its failures in the same shape.

## What the operator relies on

**The operator keeps no state of its own about the machines: what it knows is what the provider
lists.** These rules are what make that safe.

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
- **Report the `addresses` of an instance** if the platform knows them (optional): every IP address
  the node's traffic to the operator can come from, its own and the public address of a NAT in front
  of it. The [join endpoint](/docs/features/node-scaling/nodegroup#nodes-that-make-their-own-keys)
  accepts the join and the renewals of the node only from them; without addresses there is no
  address binding. Return them already from the create when you can: the first join of a node waits
  until the operator has them, or until the instance is `running` without any. A list replaces the
  one before; an empty list does not clear it. The docker provider reports the container's bridge
  address and the host's (its parameter `host_addresses`, by default the address of its endpoint):
  its containers reach other machines from the host's address.
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
unavailable, so **a heartbeat every 10–30 seconds is right.**

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

A provider implements `node.Provider` (`Group`, `Create`, `Delete`) and registers its platform as a
type of `norca-provider`. `norca-provider` serves it with `node.NewHandler` at
`advertise_url` + `/providers/<name>`, checks the token, and registers the `NodeProvider` object with
the generic registrar; the platform only talks to its API:

```go
type cloud struct{ api *cloudAPI } // the platform's client, with its credentials

func (c *cloud) Group(ctx context.Context, group string, params map[string]any) (*node.Group, error) {
	zone, ok := c.api.Zone(group)
	if !ok {
		return nil, node.ErrUnknownGroup
	}
	size, err := c.api.MachineType(ctx, params["size"])
	if err != nil {
		return nil, node.Fail(node.ReasonInvalid, "size: %v", err)
	}
	machines, err := c.api.List(ctx, zone, "norca.node_group") // by label, from the platform
	if err != nil {
		return nil, err
	}
	g := &node.Group{Name: group, Capacity: &node.Capacity{CPU: size.MHz, Memory: size.MB, Disk: size.DiskMB},
		Instances: []node.Instance{}}
	for _, m := range machines {
		g.Instances = append(g.Instances, toInstance(m)) // ID, name, state, labels, request ID, created
	}
	return g, nil
}

func (c *cloud) Create(ctx context.Context, group string, req node.CreateRequest) ([]node.Instance, error) {
	if done, err := c.api.ListByLabel(ctx, "norca.request", req.RequestID); err != nil || len(done) > 0 {
		return toInstances(done), err // the same request again: what it created the first time
	}
	// Check the request (node.ReasonInvalid), then the quota (node.ReasonQuota) before creating
	// anything, and create one machine per instance with its name, the labels of the request and
	// the bootstrap as the user data.
	...
}

func (c *cloud) Delete(ctx context.Context, group, id string) error {
	err := c.api.Delete(ctx, id)
	if errors.Is(err, errNotFound) {
		return nil // gone already
	}
	return err
}

// The parameters the node and the load balancer side of the platform share, and those of a group.
var shared = []params.Param{
	{Name: "token", Type: params.ParamString, Required: true, Secret: true, Description: "API token"},
}
var groupParams = []params.Param{
	{Name: "location", Type: params.ParamString, Required: true, Description: "the zone of the group"},
}

func init() {
	provider.Register(provider.Type{
		ID: "mycloud", Description: "My Cloud", Params: shared,
		Node: &provider.NodeSpec{
			GroupParams: groupParams,
			New: func(cfg provider.NodeConfig) (node.Provider, error) {
				// cfg.Values: the shared and node parameters; cfg.Groups: name, max, parameters.
				return &cloud{api: newCloudAPI(cfg.Values.String("token"), cfg.Groups)}, nil
			},
		},
		// LB: &provider.LBSpec{...} for load balancers of the same platform.
	})
}
```

With a blank import in `providers/all`, the type is configured in the file of `norca-provider`:

```json
{
  "listen": ":8443",
  "tls": { "cert": "/secrets/tls.crt", "key": "/secrets/tls.key" },
  "advertise_url": "https://norca-provider.service.eu.norca:8443",
  "providers": [{
    "name": "mycloud-eu", "type": "mycloud",
    "params": { "token": "env:MYCLOUD_TOKEN" },
    "token_file": "/secrets/provider-token",
    "token_variable": "nodescaler/providers/mycloud-eu",
    "node": { "groups": [{ "name": "fsn1", "max": 20, "params": { "location": "fsn1" } }] }
  }]
}
```

The `NodeProvider` object `mycloud-eu` then has the endpoint
`https://norca-provider.service.eu.norca:8443/providers/mycloud-eu`, its groups with `max` and the
parameters that are not secret, and the heartbeat of the process. A type without a node section in
its code fails at start when the file asks for one. `norca-provider types` lists the linked types
and their parameters; the `norca-provider` pack of the pack registry runs it as a job.

An application of its own can use the packages directly: `node.NewHandler` for the server and
`registrar.Registrar` with `registrar.NodeProvider(name, endpoint, tokenVariable, groups, parameters)`
in its `Registrations` for the object and the heartbeat.

The calls of `cloudAPI` stand for the platform's API; a dependency must be on the allowed license
list of the repository.

## The contract checks

`provider/node/providertest` checks a provider the way the operator uses it: it serves the
provider with `node.NewHandler`, calls it with the operator's client over HTTP, and checks:

- the capacity of a group without instances,
- the idempotent create (names, labels, request IDs),
- invalid requests and unknown groups,
- the quota reason of a full group,
- the delete,
- a restart that loses nothing,
- and the token.

The mock and the docker provider run it in their tests; a provider for a
cloud runs it against a test account, with groups of its own:

```go
func TestContract(t *testing.T) {
	providertest.Run(t, providertest.Config{
		New:        func(t *testing.T) node.Provider { return newTestProvider(t) },
		Restart:    func(t *testing.T, _ node.Provider) node.Provider { return newTestProvider(t) },
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

**A provider runs outside the pools it scales, and outside the failure domain it serves**: not on the
nodes it creates, and reachable from the operator at the address it registers. The rules are those of
[where to run a controller](/docs/features/operator-framework/controllers#where-to-run-a-controller).
