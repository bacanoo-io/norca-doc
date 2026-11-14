---
title: "Change data capture (CDC)"
linkTitle: "Change data capture"
description: "The changes of a region, as events on the system bus, delivered one way to systems outside Norca: jobs, allocations and the other objects of the namespaces, admin events by right, and Consul KV changes without values."
weight: 23
---

## What and why

**Change data capture (CDC) delivers the changes of a region to systems
outside Norca, one way.** Every change of the region's state becomes an
event, and the leader stores the events in durable streams on the
[system bus](/docs/features/system-bus). A controller, an audit archive or an
integration reads them from there: live, or later from where it stopped.

- **One way.** CDC is for reading. Changes are made through the
  [HTTP API](/docs/api), never through CDC.
- **Durable.** The events are kept for `max_age` (72h by default); a reader
  that was disconnected catches up with a JetStream consumer.
- **By right.** A reader receives what its ACL token or workload identity
  may see; secrets written into jobs and the values of the Consul KV never
  travel.

The [event stream](/docs/features/event-stream) API (`/v1/event/stream`) keeps
serving the same events over HTTP; CDC is the durable, bus-based way to read
them.

## What it carries

Each region has three streams:

| Stream | Content | Who receives it |
| --- | --- | --- |
| `NORCA_EVENTS_<region>` | the events of the namespaces: jobs, evaluations, allocations, deployments, services, Variables and secret metadata, CSI volumes, scaling, custom objects, ... | tokens and workloads by their `bus` rule |
| `NORCA_ADMIN_EVENTS_<region>` | ACL objects, node pools, nodes, quotas, admission policies, admin network policies, the audit of the secret store, server roles, backups | live: each topic with the right the event stream API asks for it; through a JetStream consumer: management tokens only |
| `NORCA_KV_CHANGES_<region>` | the [Consul KV notices](/docs/features/system-bus#consul-kv-notices): the key and the type (`KeySet`, `KeyDeleted`) of each write or delete, **never the value** | by the `bus` rule |

The subjects are `<prefix>.<region>.<namespace>.<topic>` (prefix `norca`,
for example `norca.eu.games.Allocation`), `<prefix>.admin.<region>.<namespace>.<topic>`
and `<prefix>.<region>.<namespace>.ConsulKV.<type>`. Events without a
namespace use `_`. The payload is the event JSON of `/v1/event/stream` with a
`Region` field in front.

**Headers let a reader filter without decoding the payload:**

| Header | Value |
| --- | --- |
| `Nomad-Topic`, `Nomad-Type` | topic and event type, e.g. `Allocation`, `AllocationUpdated` |
| `Nomad-Namespace`, `Nomad-Key` | namespace and key of the event |
| `Nomad-Index` | Raft index of the event |
| `Norca-Job` | the job of a `Job`, `Evaluation`, `Allocation`, `Deployment` or `Service` event |
| `Norca-Redacted` | `true` on a Job event without its secrets |

The full list is on the [system bus](/docs/features/system-bus#the-event-stream) page.

## Connecting

A reader connects to the bus port (`4649`) of any server of the region with
TLS and one of:

- **An ACL token** whose policy has a [`bus` rule](/docs/other-specifications/acl-policy#bus-rules).
  Its inbox prefix is `_INBOX.<accessor id of the token>`.
- **The workload identity of a task**, when a policy with a `bus` rule is
  bound to its job, group or task
  ([workload associated policies](/docs/concepts/workload-identity#workload-associated-acl-policies)).
  Its inbox prefix is `_INBOX.<allocation id>.<task name>`.

**Every JetStream reader sets its inbox prefix** (`nats --inbox-prefix`,
nats.go `CustomInboxPrefix`): the replies of its requests come only under it,
and with the default inbox of NATS a request times out. A plain live
subscriber needs no prefix.

Connections of NATS servers as leaf nodes are not accepted.

### A policy for a reader

The rule names what a reader needs: here the job lifecycle events of the
namespace `games` in region `eu`, live and through a consumer filtered to
the namespace.

```hcl
bus {
  subscribe = [
    "norca.eu.games.Job",
    "norca.eu.games.Evaluation",
    "norca.eu.games.Allocation",
    "norca.eu.games.Deployment",
    "norca.eu.games.Service",
  ]
  publish = [
    "$JS.API.INFO",
    "$JS.API.STREAM.INFO.NORCA_EVENTS_eu",
    "$JS.API.CONSUMER.CREATE.NORCA_EVENTS_eu.lifecycle-reader.norca.eu.games.>",
    "$JS.API.CONSUMER.INFO.NORCA_EVENTS_eu.lifecycle-reader",
    "$JS.API.CONSUMER.MSG.NEXT.NORCA_EVENTS_eu.lifecycle-reader",
    "$JS.ACK.NORCA_EVENTS_eu.lifecycle-reader.>",
  ]
}
```

**A consumer reads everything its filter selects**, so a reader limited to a
namespace may create only consumers filtered to it: the `CREATE` subject with
the filter (`...CREATE.<stream>.<consumer>.<filter>`) is the one to allow, not
`$JS.API.CONSUMER.*.NORCA_EVENTS_eu`. **Name the consumer in the rule**
(`lifecycle-reader` above): a wildcard in its place lets the reader read,
change or delete the consumers of every other reader of the stream. **Name the namespaces and topics** rather
than `norca.eu.>`: a rule over the whole region receives the full Job events
of every namespace. For the Consul KV changes, allow
`norca.eu.games.ConsulKV.>` and the same `$JS` subjects for
`NORCA_KV_CHANGES_eu`.

### Reading in Go

```go
nc, err := nats.Connect("tls://server1.eu:4649",
	nats.Token(token),
	nats.RootCAs("ca.pem"),
	nats.CustomInboxPrefix("_INBOX."+accessorID),
)
js, err := jetstream.New(nc)
cons, err := js.CreateOrUpdateConsumer(ctx, "NORCA_EVENTS_eu", jetstream.ConsumerConfig{
	Durable:       "lifecycle-reader",
	FilterSubject: "norca.eu.games.>",
	AckPolicy:     jetstream.AckExplicitPolicy,
})
cc, err := cons.Consume(func(msg jetstream.Msg) {
	if msg.Headers().Get("Norca-Job") == myJob {
		handle(msg.Headers().Get("Nomad-Type"), msg.Data())
	}
	_ = msg.Ack()
})
```

A task reads with its identity: `nats.Token(os.Getenv("NORCA_TOKEN"))` (with
`identity { env = true }`) and the inbox prefix
`"_INBOX." + os.Getenv("NORCA_ALLOC_ID") + "." + os.Getenv("NORCA_TASK_NAME")`.

With the NATS CLI:

```shell-session
$ nats --server tls://server1.eu:4649 --tlsca ca.pem --user "$TOKEN" \
    --inbox-prefix "_INBOX.$ACCESSOR_ID" sub 'norca.eu.games.Allocation'
```

## Following the allocations of a job

A controller that registers a job learns from CDC, in real time and
whatever the outcome, how its allocations fare:

| Step | Topic / type | What to read |
| --- | --- | --- |
| Registered | `Job` / `JobRegistered` | job ID, version |
| Scheduled or not | `Evaluation` / `EvaluationUpdated` | `Status` (`complete`, `blocked`, `failed`); per group in `FailedTGAllocs` the reasons, such as exhausted resources or constraints: waiting for capacity, or not placeable |
| Placed | `Allocation` / `PlanResult` | the new allocation: node, `ClientStatus` `pending`, the ports with their `HostIP` in `AllocatedResources` |
| Starting | `Allocation` / `AllocationUpdated` | the task events: `Received`, `Task Setup`, `Downloading Artifacts`, `Driver` (e.g. an image download), `Started`, `Driver Failure`, `Restarting` |
| Running | `Allocation` / `AllocationUpdated` | `ClientStatus` `running` |
| Ready | `Service` / `ServiceRegistration`, or `Deployment` / `DeploymentAllocHealth` | the address of a native service, or the health of the allocation in a deployment |
| Stopped | `Allocation` / `AllocationUpdateDesiredStatus`, `AllocationUpdated` | `DesiredStatus` `stop` or `evict`, then `ClientStatus` `complete` or `failed` |
| Lost or replaced | `Allocation` / `AllocationUpdated`, `PlanResult` | `ClientStatus` `lost`; `NextAllocation` and `PreviousAllocation` link the replacement |
| Job gone | `Job` / `JobDeregistered` | |

**What counts as ready, and how long to wait, is the controller's
decision**: an allocation may wait for capacity (a blocked evaluation) or
for a long download (`Driver` events). The results of native service checks
are not events; read them from the
[allocation checks](/docs/api/allocations) API when readiness depends on them.

**On every start, reconcile once with the API** (the job's allocations and
evaluations), then follow the events: a consumer replays what the reader
missed, within the retention of the stream.

## Consumers

The streams have many independent readers, and their settings keep them
apart:

- **No reader removes an event for the others**: the streams keep events by
  age and size (the limits policy), whatever the consumers acknowledge.
- **A bound on the consumers**: each stream takes at most
  [`max_consumers`](/docs/configuration/bus) (64); creating one more fails
  with "maximum consumers limit reached".
- **Idle consumers go**: a consumer idle longer than `max_age` would have
  nothing left to catch up; one without its own `inactive_threshold` gets
  `max_age`, and a larger one is refused.
- **At most 1000 messages unacknowledged** per consumer.

A reader keeps one durable consumer per stream and resumes it after a
restart, instead of creating a new one each time.

## Guarantees

- **Order:** the events of a region in Raft index order; the Consul KV
  notices in the order the leader wrote the keys.
- **At least once:** after a leader change the new leader continues with the
  newest index in the streams; duplicates within two minutes are dropped by
  their `Nats-Msg-Id`. A reader that needs exactly once keeps the
  `Nomad-Index` it processed.
- **Gaps are marked:** when the servers no longer hold the events a resume
  needs, the leader publishes a gap marker (topic `Bus`, type `EventGap`)
  and continues with the newest events.
- **Retention:** `max_age` (72h) and `max_bytes` of the
  [`bus` block](/docs/configuration/bus); the streams share `max_bytes`.

## What CDC does not give

- **The full record.** Job events leave out what may hold a secret: the
  values of `env` and `meta`, embedded templates, task driver configuration,
  artifact credentials, check headers and bodies, the dispatch payload
  ([details](/docs/features/system-bus#job-events-without-secrets)). A reader
  that needs the whole job reads it from the API with `read-job`.
- **Values of the Consul KV.** A notice says which key changed; the value is
  read through the Consul-compatible API with the Variables rights of the
  key.
- **Admin topics without the right.** A token without management, node,
  quota, admission, operator or backup read gets none of the admin events
  that need it.
- **Other regions.** Each region has its own CDC; the events of another
  region are read from its servers, or with `/v1/event/stream?region=<name>`.
- **Writing.** No token may create or change a stream on the bus, and the
  admin subjects can't be published to.
