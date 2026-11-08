---
title: "Controllers"
linkTitle: "Controllers"
weight: 2
description: "Writing controllers with the Norca Go controller SDK, running them as jobs with workload identity, and scaffolding a project with norca operator init."
---

A controller watches the objects of a kind and reconciles them: it compares the
spec with the world, creates or changes what is missing, and writes the result
to the status. Any program that uses the [objects HTTP API](/docs/api/objects)
can be a controller. For Go, Norca ships a controller SDK that implements the
watch, queue, retry and leader election parts, so an operator only writes the
`Reconcile` function.

## The Go controller SDK

The SDK is the Go module in the `norca/controller` directory of the
[Norca repository](https://github.com/bacanoo-io/norca) (module path
`github.com/bacanoo-io/norca/norca/controller`, MPL-2.0). It depends only on the API
module (`norca/api`), never on the server code. It is not published as a
separate module: projects use `replace` directives to a Norca checkout
(`norca operator init -sdk` writes them).

| Building block | Purpose |
| --- | --- |
| `Informer` | Lists the objects of a kind, follows the `CustomObject` event topic and keeps a local cache; lists again when the server answers `410 Gone`. |
| `Queue` | Deduplicating work queue with per-key exponential backoff and an overall rate limit. A key is never reconciled by two workers at once. |
| `Controller` | Runs the `Reconciler` for the keys the informer, the owned jobs watch and extra `Source`s put on the queue, with periodic resynchronization. |
| `LeaderElector` | Leader election over a lease Variable written with check-and-set. |
| `Objects` | Reads and writes objects: spec, status (with check-and-set retries), finalizers, event log. |
| `EventRecorder` | Writes the object event log and drops repetitions. |
| `CommonStatus`, `Condition` | Status conventions: `observedGeneration` and the `Ready`, `Progressing`, `Degraded` conditions. |
| Owner helpers | `SetOwner`, `ListOwnedJobs`, `AdoptJobs`, `SetObjectOwner`, `SetManagedBy`, `PreserveScaledCounts`. |
| `controller/webhook` | Serves the [type-bound webhooks](/docs/features/operator-framework/ecosystem#type-bound-webhooks) of a kind. |
| `controller/envtest` | Starts a real dev agent from the `norca` binary for tests. |
| `controller/fake` | In-memory backend for unit tests without an agent. |

### Storage

`Options.Storage` selects where the objects live:

- `controller.StorageNative`: native objects of a kind registered with
  `norca object-kind apply`. This is the normal mode and the one this section
  describes.
- `controller.StorageVariables` (the default value of the field): the prototype
  storage, Variables under `crd/<path group>/<Kind>/<name>` with `spec`
  and `status` items. The path group is the group with its dashes doubled and
  its dots replaced with dashes (`db.example.com` is `db-example-com`,
  `my-db.example.com` is `my--db-example-com`), so distinct groups never share
  a path. It has no schema, finalizers, owners or event log; the
  controller records a hash of the spec instead of a generation. Reconcilers
  see the same `Object` type with both storages.

### The reconcile function

```go
type Reconciler interface {
	Reconcile(ctx context.Context, key ObjectKey) (requeueAfter time.Duration, err error)
}
```

A non-nil error retries the key with backoff; a positive `requeueAfter`
reconciles it again after the delay (for example to poll an external system).
The object may no longer exist when `Reconcile` runs, so it reads the current
state from the cache instead of relying on what triggered it. A simplified
version of the LoadBalancer reconciler (`ensure` and `cleanup` stand for the
provider calls of the sample):

```go
func (r *reconciler) Reconcile(ctx context.Context, key controller.ObjectKey) (time.Duration, error) {
	obj, ok := r.ctrl.Get(key)
	if !ok {
		return 0, r.cleanup(ctx, key) // gone: remove what it owned
	}
	if obj.Deleting() {
		if !obj.HasFinalizer(Finalizer) {
			return 0, nil
		}
		if err := r.cleanup(ctx, key); err != nil {
			r.ctrl.Recorder().Event(ctx, key, controller.EventTypeWarning, "CleanupFailed", err.Error())
			return 0, err
		}
		_, err := r.ctrl.Objects().RemoveFinalizer(ctx, obj, Finalizer)
		return 0, err
	}
	if !obj.HasFinalizer(Finalizer) {
		next, err := r.ctrl.Objects().AddFinalizer(ctx, obj, Finalizer)
		if err != nil {
			return 0, err
		}
		obj = next
	}

	var status Status // embeds controller.CommonStatus
	_ = obj.DecodeStatus(&status)
	status.Observe(obj) // observedGeneration = generation

	var spec Spec
	if err := obj.DecodeSpec(&spec); err != nil {
		return 0, err
	}
	res, err := r.ensure(ctx, obj, spec) // create or update the proxy job
	if err != nil {
		return 0, err
	}
	status.Addresses = res.Addresses
	status.SetCondition(controller.Condition{
		Type: controller.ConditionReady, Status: controller.ConditionTrue, Reason: "Ready",
	}, time.Now())

	_, err = r.ctrl.Objects().UpdateStatus(ctx, obj, status)
	return time.Minute, err
}
```

### Starting a controller

```go
client, err := controller.NewAPIClient() // NORCA_ADDR, NORCA_TOKEN; unix:// sockets allowed
if err != nil {
	return err
}
rec := &reconciler{}
ctrl, err := controller.New(controller.NewBackend(client), rec, controller.Options{
	Name:      "loadbalancer",
	Kind:      controller.Kind{Group: "norca.io", Kind: "LoadBalancer"},
	Storage:   controller.StorageNative,
	Namespace: "default", // "*" for every namespace the token can access
	Workers:   2,
	OwnsJobs:  true,      // reconcile the owner when its jobs or allocations change
	LeaderElection: &controller.LeaderElectionConfig{
		Namespace:       "default",
		ReleaseOnCancel: true,
	},
	Metrics: controller.NewTextMetrics(),
})
if err != nil {
	return err
}
rec.ctrl = ctrl
return ctrl.Run(ctx)
```

| Option | Default | Description |
| --- | --- | --- |
| `Name` | required | Used in logs, metrics and the default lease path. |
| `Kind` | required | `controller.Kind{Group, Kind}`. |
| `Storage` | Variables | `controller.StorageNative` for native objects. |
| `Namespace` | `default` | Namespace to watch; `*` for all. |
| `Workers` | `1` | Concurrent reconciles. |
| `ResyncPeriod` | 10 minutes | Reconciles every object and lists again periodically; negative disables it. |
| `WatchMode` | stream with fallback | Event stream, blocking queries, or the stream with fallback to blocking queries. |
| `OwnsJobs` | `false` | Watches the jobs owned by the objects and maps their changes back to the owner. |
| `Sources` | none | Extra change sources, for example an `EventSource` on another topic. |
| `Predicate` | `SpecChanged` | Filters object updates; status-only changes (the controller's own writes) are skipped. `AnyChange` reconciles every update. |
| `LeaderElection` | none | Runs reconciles only on the elected leader; the informer runs on every candidate, so a new leader starts with a warm cache. |
| `RateLimiter`, `Metrics`, `Logger` | defaults | Retry backoff, metrics sink, `slog` logger. |

### Leader election

Controllers usually run as a job with `count = 2`, and only the elected leader
reconciles. The lease is a Variable at `controller-lease/<controller name>`
(configurable with `LeaderElectionConfig.Path`) written with check-and-set. The
leader renews it every 4 seconds; candidates take over a lease that has not
changed for 20 seconds, measured with their own clock, so clock skew does not
matter. `ReleaseOnCancel` releases the lease on shutdown so the other instance
takes over at once.

What happens when the leader is in trouble (checked in the lab with the node
scaling operator):

- **The identity of a candidate is its allocation ID** (`NORCA_ALLOC_ID`). A
  leader whose task crashes and is restarted in the same allocation takes its
  own lease back at once: there is no handover to the other instance, and none
  is needed.
- **A leader that stops without exiting** (a long pause, a frozen VM, a
  partition) stops renewing; the other instance takes the lease 20 seconds after
  the last renewal and goes on from the state in the cluster. When the old
  leader comes back it reads the lease, sees another holder and does not lead
  again; only one instance reconciles.
- **Which instance leads:** the item `holder` of the lease Variable is the
  allocation ID of the leader
  (`norca var get -namespace <ns> controller-lease/<controller name>`), and
  `norca_controller_leader` is `1` on the leader and `0` on the others.

### Metrics

`controller.NewTextMetrics()` serves Prometheus text metrics (for example on
`/metrics`): `norca_controller_reconcile_total` (by `result`, including
`throttled`), `norca_controller_reconcile_seconds`,
`norca_controller_queue_depth`, `norca_controller_resync_total`,
`norca_controller_events_total` and `norca_controller_leader`.

## Running a controller as a job

A controller runs as an ordinary Norca job. It reaches the API on the task API
socket with its workload identity, so it needs no static token:

```hcl {filename="loadbalancer.norca.hcl"}
job "loadbalancer-controller" {
  group "controller" {
    count = 2

    task "controller" {
      driver = "raw_exec"

      config {
        command = "/usr/local/bin/norca-loadbalancer"
        args    = ["controller", "-objects", "native", "-namespace", "default"]
      }

      identity {
        env = true
      }

      env {
        NORCA_ADDR = "unix://${NORCA_SECRETS_DIR}/api.sock"
      }
    }
  }
}
```

Bind an ACL policy to the job, so the workload identity gets the capabilities
it needs: the object capabilities for its kind, job permissions for the jobs it
creates, and Variables access for the leases:

```hcl {filename="loadbalancer-policy.hcl"}
namespace "default" {
  capabilities = ["list-jobs", "read-job", "submit-job"]

  variables {
    path "controller-lease/loadbalancer*" {
      capabilities = ["list", "read", "write"]
    }
    path "nomad/jobs/lb-*" {
      capabilities = ["list", "read", "write", "destroy"]
    }
  }

  object "norca.io/LoadBalancer" {
    capabilities = ["read", "write", "write-status", "write-events", "manage-finalizers"]
  }
}

# The nodes of the instances: an instance on a node marked as leaving is not
# a target, and node events reconcile the load balancers.
node {
  policy = "read"
}
```

```shell
$ norca acl policy apply -namespace default -job loadbalancer-controller \
    loadbalancer-controller loadbalancer-policy.hcl
```

> [!NOTE]
> The event stream accepts only ACL tokens, not workload identities. With ACLs
> enabled, a controller that runs with its workload identity falls back to
> blocking queries, which work the same way but with more requests. To use the
> event stream, give the controller an ACL token of the same policy.

The [operator pack](/docs/features/operator-framework/ecosystem#operator-packs)
of an operator installs the kind, this policy and the job together.

## Where to run a controller

A controller keeps something else running: jobs, load balancers, databases,
and, for an operator that scales nodes, the nodes themselves. It has to be
there when the thing it keeps is gone or changing, so it must not depend on it.
These rules hold for every controller and for the provider applications it
calls:

- **Run it on nodes that nothing scales or drains for its sake.** Put the job in
  a node pool whose nodes are added by hand or by the deployer, not by a node
  scaling operator and not by an autoscaler policy. If the pool is shared,
  keep the job off scaled nodes with a constraint on the marker of the node
  scaling operator, `${meta.norca.instance}` `is_not_set`. A controller on a node that its own
  operator removes would delete itself.
- **Keep two instances on different nodes.** Use `count = 2` with
  `distinct_hosts`, and a `spread` on the datacenter if the pool has several;
  the leader election of the SDK lets one of them work, so the loss of a node
  does not stop it.
- **Do not scale the controller.** The job has no `scaling` block, and a
  priority above ordinary jobs so that it is not the first to be preempted.
- **One controller (or one set) per region** that has the objects it serves:
  objects belong to a region, and so does the controller.
- **Give it the least privilege**: the policy bound to the job, as above.
- **A provider application runs outside the failure domain it serves**: not on
  the nodes of the group it creates, not behind the load balancer it manages;
  it is reachable from the controller at the address it registered.

The [node scaling plan](/docs/design/cluster-scaling-plan#where-the-operator-and-the-providers-run)
makes the rules checkable for its operator (conditions such as
`RunsOnScaledNode`). The load balancer operator follows the same rules: run
the operator and the providers in a pool that is not scaled, because a node
group that removes the node of the operator or of a provider also removes the
load balancers it keeps.

## Testing

- **Unit tests** use the in-memory backend of `controller/fake`
  (`fake.New()`), which implements Variables, native objects (with a
  generation and a separate status, but without schema validation or default
  values), jobs and the event stream without an agent.
- **Integration tests** use `controller/envtest`, which starts a real dev agent
  from the `norca` binary (`NORCA_BINARY`, or `norca` on the `PATH`), on
  loopback ports with a temporary data directory, killed after
  `MaxLifetime` (default 30 minutes) at the latest. `envtest.StartT` skips the
  test when no binary is found; `Options.ACL` bootstraps ACLs and hands out the
  management token.

```go
func TestReconcile(t *testing.T) {
	agent := envtest.StartT(t, envtest.Options{})
	client := agent.Client
	// register the kind, run the controller, apply objects, assert the status
	_ = client
}
```

## Scaffolding an operator

[`norca operator init`](/docs/commands/operator/init) writes a complete
operator project without contacting the servers:

```shell
$ norca operator init -sdk ~/norca/norca db.example.com/PostgresCluster
$ cd postgres-cluster-operator && go mod tidy && go test ./...
```

The project contains:

- the kind (`postgrescluster.kind.hcl`) with a JSON Schema, a CEL rule,
  columns, a schema version and limits, and a sample object in `examples/`;
- the Go module of the controller (`main.go`, `types.go`, `reconcile.go`): a
  reconciler with a finalizer (`<group>/<kind>-cleanup`), status conditions and
  the event log, leader election and metrics;
- a validating webhook (`webhook.go`, the `webhook` subcommand);
- tests against the fake backend and against a dev agent (`envtest`);
- an operator pack in `pack/<name>/` and a `README.md` with the local workflow.

Check the generated kind with `norca object-kind lint` before you change it.

## Reference

- [Controller SDK source](https://github.com/bacanoo-io/norca/tree/main/norca/controller)
  and the [LoadBalancer operator](https://github.com/bacanoo-io/norca-platform/tree/main/loadbalancer/operator)
- [`norca operator init`](/docs/commands/operator/init)
- [Objects HTTP API](/docs/api/objects)
