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
| `NORCA_EVENTS_<region>` | the events of the namespaces: jobs, evaluations, allocations, deployments, services, Variables and secret metadata, CSI volumes, scaling, custom objects, ... | tokens and workloads by their `cdc` rule |
| `NORCA_ADMIN_EVENTS_<region>` | ACL objects, node pools, nodes, quotas, admission policies, admin network policies, the audit of the secret store, server roles, backups | live: each topic with the right the event stream API asks for it; through a JetStream consumer: management tokens only |
| `NORCA_KV_CHANGES_<region>` | the [Consul KV notices](/docs/features/system-bus#consul-kv-notices): the key and the type (`KeySet`, `KeyDeleted`) of each write or delete, **never the value** | by the `cdc` rule |

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

A reader has a token, or is a task, whose policy has a
[`cdc` rule](/docs/other-specifications/acl-policy#cdc-rules):

- **An ACL token.** Its consumers are named after its accessor ID.
- **The workload identity of a task**, when the policy is bound to its job,
  group or task
  ([workload associated policies](/docs/concepts/workload-identity#workload-associated-acl-policies)).
  Its consumers are named `<allocation id>_<task name>`.

It connects to the bus port (`4649`) of any server of the region with TLS.

**The servers put a reader into a NATS account of its own.** The account
holds the subjects of the reader's `cdc` rule, its own consumers and the
replies of its own requests, and nothing else: a reader publishes nothing
into the bus, and no other connection sees its replies. The default inbox
of NATS works; a reader sets no inbox prefix.

- **A token with a `cdc` rule and no `bus` rule** is a reader as it
  connects, with the token.
- **A token that also has a [`bus` rule](/docs/other-specifications/acl-policy#bus-rules)**
  uses two connections. The plain one, with the token, has the subjects of
  the `bus` rule and the changes live, and no JetStream. To read its
  consumers it connects a second time as the reader: the user `cdc`, with
  the token (or the workload identity) as the password (`nats --user cdc
  --password "$TOKEN"`, nats.go `nats.UserInfo("cdc", token)`).

**A rule whose subjects overlap without one containing the other is refused
for a reader**, as for a leaf node (`norca.eu.*.Job` with
`norca.eu.games.>`): the reader would receive those changes twice, and it
can't connect.

**The changes leave the cluster through leaf nodes**: a NATS server of the
outside system attaches to the bus with a token whose `cdc` rule has
`leaf = true` ([below](#through-a-leaf-node)), and its applications read the
changes from it with their own NATS users. A reader may also connect
directly, as above.

> [!NOTE]
> **Observers do not take CDC off the voters.** A reader or a leaf node may
> connect to an [observer](/docs/features/server-roles), which then serves
> its connection and the delivery of the live events. The streams and the
> consumers stay where JetStream puts them: on any servers of the region,
> voters and observers alike, and this can't be steered to the observers.
> The leader always publishes the events. An observer is also a full member
> of the bus cluster: it may hold a replica of a stream and counts in the
> quorum of the bus, although it has no vote in Raft.

### A policy for a reader

The rule names what a reader needs: here the events of the namespace `games`
in region `eu`.

```hcl
cdc {
  receive = ["norca.eu.games.>"]
}
```

**Name the namespaces and topics** rather than `norca.eu.>`: a rule over the
whole region receives the full Job events of every namespace. For the Consul
KV changes add `norca.eu.games.ConsulKV.>`. The admin events need their right
in addition (management, `node`, `quota`, `admission`, `operator` or `backup`
read).

### The reader's consumer

**The servers keep the reader's consumer**, one per reader and stream, named
after the reader; a reader can't create or change consumers on the bus. It
asks for its consumer with its own token or identity:

```shell-session
$ norca cdc consumer apply -stream events \
    -filter norca.eu.games.Evaluation -filter norca.eu.games.Allocation
Stream                      = events (NORCA_EVENTS_eu)
Name                        = 9f3c51ad-6b7e-40f2-a1d4-3c2e8b7f0e15
Filters                     = norca.eu.games.Evaluation, norca.eu.games.Allocation
Deliver                     = all
...
```

or `PUT /v1/cdc/consumer/events` with `{"Filters": [...]}` ([API](/docs/api/cdc)).
A task uses the [Task API](/docs/api/task-api) with its workload identity
(`Authorization: Bearer $NORCA_TOKEN` on `${NORCA_SECRETS_DIR}/api.sock`).
**All filters are in one consumer, so the events arrive in the stream's
order across topics** (an evaluation before the allocation it placed). Every
filter lies within the reader's `cdc` rule and the stream; the filters do not
overlap; there are at most 16. Applying again changes the filters and keeps
the position.

### Reading in Go

```go
nc, err := nats.Connect("tls://server1.eu:4649",
	nats.Token(token), // with a bus rule too: nats.UserInfo("cdc", token)
	nats.RootCAs("ca.pem"),
)
js, err := jetstream.New(nc)
// The consumer the servers keep for this reader (made by norca cdc consumer apply).
cons, err := js.Consumer(ctx, "NORCA_EVENTS_eu", accessorID)
cc, err := cons.Consume(func(msg jetstream.Msg) {
	if msg.Headers().Get("Norca-Job") == myJob {
		handle(msg.Headers().Get("Nomad-Type"), msg.Data())
	}
	_ = msg.Ack()
})
```

A task reads with its identity: `nats.Token(os.Getenv("NORCA_TOKEN"))` (with
`identity { env = true }`) and the consumer
`os.Getenv("NORCA_ALLOC_ID") + "_" + os.Getenv("NORCA_TASK_NAME")`.

**Name such tasks with letters, digits, `-` and `_`.** In a task name with
other characters (a dot, a space), the ones a subject or a consumer name
can't hold become `_`, and `-` with the first eight hex digits of the
SHA-256 of the task name is appended, so that two tasks of an allocation
never share a consumer: the task `web.api` reads the consumer
`<allocation id>_web_api-<digest>`.
The consumer's name is also the `Name` in the answer of the
[consumer API](/docs/api/cdc).

With the NATS CLI:

```shell-session
$ nats --server tls://server1.eu:4649 --tlsca ca.pem --user "$TOKEN" \
    consumer next NORCA_EVENTS_eu "$ACCESSOR_ID"
$ nats --server tls://server1.eu:4649 --tlsca ca.pem --user "$TOKEN" \
    sub 'norca.eu.games.Allocation'
```

## Through a leaf node

A NATS server outside the cluster (the [`nats` pack](/docs/features/packages/registry#nats),
an edge site, the NATS of another system) attaches to the bus as a **leaf
node** and receives the changes of its token's `cdc` rule. **Only the leaf
holds a Norca token**; its applications connect to it with their own users.
**The data flows one way**: the bus accepts nothing from a leaf but the
fetches and acknowledgements of its own consumers.

1. **The servers run the leaf node listener** (off by default):

   ```hcl
   server {
     bus {
       leafnodes {
         enabled = true
       }
     }
   }
   ports {
     bus_leafnode = 4652
   }
   ```

   It uses the TLS of the bus; open the port to the leaf nodes only
   ([`bus` block](/docs/configuration/bus#leaf-nodes)).

2. **A policy whose `cdc` rule allows a leaf**, and a token of it:

   ```hcl
   cdc {
     receive = ["norca.eu.games.>"]
     leaf    = true
   }
   ```

3. **The leaf attaches with the secret ID of the token in its URL**, and
   verifies the servers with their CA:

   ```hcl
   leafnodes {
     remotes: [
       {
         urls: ["nats-leaf://<secret ID>@10.0.0.11:4652", "nats-leaf://<secret ID>@10.0.0.12:4652"]
         tls { ca_file: "/etc/nats/norca-ca.pem" }
       }
     ]
   }
   ```

   The `nats` pack does this with `norca_bus_leaf = true` and the secret
   `norca/bus/leaf` (items `token` and `ca`).

**What the leaf receives:**

- **Live:** the subjects of `receive`, narrowed to the change streams
  (`norca.eu.games.>` gives `norca.eu.games.*` of the events and
  `norca.eu.games.ConsulKV.*` of the Consul KV notices), arriving in the
  account the leaf binds them to. The admin topics the token may see arrive
  live too (all of them with a management token).
- **Its consumers:** the servers make `leaf-<accessor ID>` in the event
  stream and the Consul KV notices (and the admin events with a management
  token) when the leaf attaches, with the same subjects as filters; a new
  consumer starts at the beginning of the stream. **A client reaches them
  through the JetStream domain `norca-<region>`**, because the leaf's own
  NATS answers the plain JetStream API itself:

  ```go
  js, err := jetstream.NewWithDomain(nc, "norca-eu")
  cons, err := js.Consumer(ctx, "NORCA_EVENTS_eu", "leaf-"+accessorID)
  ```

  The user of the client needs to subscribe to the subjects and publish to
  `$JS.norca-eu.API.CONSUMER.>` and `$JS.ACK.>`.

**The limits of a leaf:**

- One leaf per token on a server; a second one is refused.
- At most 10000 subscriptions (the interest of the clients behind it).
- At most 4KiB per message it sends: fetches and acknowledgements only.
- **A fetch waits at most 30 seconds** (`expires`); a longer one is refused.
- **Fetches without end are cut off.** The server remembers the way back of
  every fetch for 35 seconds. A leaf with more than 32768 of them waiting
  (a client that fetches 900 times a second stays below it) is closed and
  refused for 30 seconds; the server logs a warning. Fetch in batches
  rather than one event at a time.
- A leaf that is slow to take the live events is cut off like any slow
  consumer, reconnects, and catches up from its consumer.
- In a region with several servers the leaf attaches to one of them; it can
  attach to another one at any time (name several servers in its URLs).

**Not accepted:** a rule whose subjects overlap without one containing the
other (`norca.*.games.>` and `norca.eu.*.Job`): the leaf would receive their
events twice. When the token is deleted or expires, or its rule changes, the
leaf is closed within seconds; it reconnects with the new subjects, or not at
all. The leader removes the consumers of a leaf that lost its right.

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
| Ready | `Service` / `ServiceRegistration`, or `Deployment` / `DeploymentAllocHealth` | of a native service: the address, `Ready` (from its startup and readiness checks), `Health` and the status of each check; or the health of the allocation in a deployment |
| Stopped | `Allocation` / `AllocationUpdateDesiredStatus`, `AllocationUpdated` | `DesiredStatus` `stop` or `evict`, then `ClientStatus` `complete` or `failed` |
| Lost or replaced | `Allocation` / `AllocationUpdated`, `PlanResult` | `ClientStatus` `lost`; `NextAllocation` and `PreviousAllocation` link the replacement |
| Job gone | `Job` / `JobDeregistered` | |

**What counts as ready, and how long to wait, is the controller's
decision**: an allocation may wait for capacity (a blocked evaluation) or
for a long download (`Driver` events). **The checks of native services are
in the events**: the clients report the state of every check, and each
recorded change of an instance (`Ready`, `Health`, the status of a check)
is a `ServiceRegistration` event of the
[health-based catalog](/docs/features/service-discovery/catalog). Changes of
one instance are recorded at most every 5 seconds (flapping protection);
liveness checks restart the task instead (`Restarting` in the allocation's
task events). The services of the Consul provider have their health in
Consul, not in these events.

**On every start, reconcile once with the API** (the job's allocations and
evaluations), then follow the events: a consumer replays what the reader
missed, within the retention of the stream.

## Consumers

The streams have many independent readers, and their settings keep them
apart:

- **No reader removes an event for the others**: the streams keep events by
  age and size (the limits policy), whatever the consumers acknowledge.
- **One consumer per reader and stream**, made by the servers and named
  after the reader; a reader reads only its own.
- **A bound on the consumers**: each stream takes at most
  [`max_consumers`](/docs/configuration/bus) (64); one more is refused with
  `409`.
- **Idle consumers go**: a consumer idle longer than `max_age` would have
  nothing left to catch up and is removed; the leader also removes the
  consumers of readers that lost their right (a deleted or expired token, a
  policy without the rule or without `leaf`, an ended allocation).
- **Limits of a consumer**: at most 1000 messages unacknowledged; a pull asks
  for at most 256 messages or 1MiB, and waits at most 30 seconds.

A reader keeps its consumer and resumes it after a restart.

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
  that needs the whole job reads it from the API with `read-job`. Service
  events leave out the outputs of the checks.
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
