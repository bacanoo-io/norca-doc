---
title: "System bus"
linkTitle: "System bus"
description: "The Norca servers embed a NATS server with JetStream: the system bus carries the event stream of the region and the pack push notices, without a separate NATS."
weight: 46
---

## What and why

The Norca servers embed a [NATS](https://nats.io) server with JetStream. The
servers of a region form one NATS cluster: the system bus. It carries
Norca's own traffic:

- **The event stream.** The leader publishes the region's
  [events](/docs/features/event-stream) into a durable JetStream stream.
  History, audit and automation services read it from there instead of
  holding an HTTP stream open to every region.
- **The Consul KV of the Consul-compatible API.** The clients keep the KV in the key-value
  bucket `consul-kv` of the bus (backend `"auto"`, the default, or `"bus"` of [`consul_compat`](/docs/configuration/consul_compat)),
  shared by every node of the region and replicated over the servers. The clients reach the
  bucket through the RPC of the servers, which check the Variables ACL rules of every key with
  the token of the request; the nodes themselves have no access to it on the bus. When a single-server
  region gets its second server, the bus restarts clustered and the server carries the keys of
  its standalone store over; keys kept in Variables move with
  [`norca operator consul-kv migrate`](/docs/commands/operator/consul-kv/migrate).
- **Pack push notices.** A release pipeline announces that it pushed packs.
  The leader syncs the matching [cluster registries](/docs/features/packages/registry)
  at once, without waiting for their sync interval.
- **Task group usage.** The clients publish the CPU and memory usage of their
  task groups and the statistics of their host for the
  [built-in autoscaler](/docs/features/autoscaler) and the
  [metrics store](/docs/configuration/metrics_store); see
  [below](#task-group-usage).

**To read the changes of a region from outside**, see
[change data capture](/docs/features/change-data-capture): what the streams
carry, how to connect, the guarantees. This page is the technical layer.

**The bus is not a message broker for applications.** Applications keep their own
NATS, for example the `nats` pack. The bus is configured in the server's
[`bus` block](/docs/configuration/bus) and **is enabled by default.**

**One NATS account.** Every connection of the bus (the servers, the nodes, the
ACL tokens and the workload identities of tasks) is in the NATS account
`NORCA`, and the streams live in it; a NATS client sees `NORCA` as its account.
What a connection may do comes from its token: the
[`bus` and `cdc` rules](/docs/other-specifications/acl-policy#bus-rules) of its
policies, not the account. A server keeps the streams under
`server/bus/jetstream/NORCA` of its `data_dir`. A
[leaf node](/docs/features/change-data-capture#through-a-leaf-node) is in an
account of its own, which imports only its changes from `NORCA`.

## Task group usage

While the [built-in autoscaler](/docs/features/autoscaler) or the
[metrics store](/docs/configuration/metrics_store) is enabled, the servers ask
the clients in the heartbeat response for the usage of their task groups
every `client_metrics_interval` of the autoscaler (`10s` while only the
metrics store needs it). A client publishes the report as JSON
on its own subject, the only subject a node may publish on; a report larger
than one message is split into several of the same window. The report also
has the statistics of the node's host (in the first message of a split
report), so a node without running allocations still reports. **The reports travel
on the bus only: without it the clients are not asked for usage.**

| Item | Value |
| --- | --- |
| Stream | `NORCA_TELEMETRY_<region>` (file storage, S2 compression, created by the leader) |
| Subjects | `norca.telemetry.<region>.<node_id>` |
| Limits | 1 hour, a sixteenth of `max_storage`, 64KiB per message, 1024 reports per node; the oldest reports are dropped first, of a node that publishes too fast its own |
| Checks | The node ID of a report is the node of its subject; of its task groups only those the node has an allocation of are kept (the others are counted in `nomad.bus.telemetry.foreign_groups`) |
| Consumers | `norca-usage-<server_id>`: every server reads every report into its [metrics store](/docs/configuration/metrics_store); the leader also keeps them for the autoscaler |

## The event stream

| Item | Value |
| --- | --- |
| Stream | `NORCA_EVENTS_<region>` (file storage, S2 compression) |
| Subjects | `<prefix>.<region>.<namespace>.<topic>`, e.g. `norca.eu.default.Job`, `norca.eu.shop.Allocation` (prefix `norca` by default); events without a namespace use `_`, e.g. `norca.eu._.CustomObject` |
| Payload | the event JSON as `/v1/event/stream` returns it, with a `Region` field in front; the Job events without their secrets (see below) |
| Retention | `max_age` (72h) and five eighths of `max_bytes` (1GiB, at most a quarter of `max_storage` by default), the oldest events dropped first |
| Replicas | one per server, up to three |

**The admin events have a stream of their own.** These are the topics the
[event stream API](/docs/api/events) shows only with a right beyond reading
the jobs of a namespace:

| Topics | Right |
| --- | --- |
| `ACLToken`, `ACLPolicy`, `ACLRole`, `ACLAuthMethod`, `ACLBindingRule`, `NodePool` | management token |
| `Node` | `node` read |
| `Quota` | `quota` read |
| `AdmissionPolicy` | `admission` read |
| `SecretAccess` (the audit of the secret store), `Server`, `NetworkPolicy` of the admin network policies | `operator` read |
| `Backup` | `backup` read |

| Item | Value |
| --- | --- |
| Stream | `NORCA_ADMIN_EVENTS_<region>` |
| Subjects | `<prefix>.admin.<region>.<namespace>.<topic>`, e.g. `norca.admin.eu._.ACLPolicy` |
| Retention | `max_age` and a quarter of `max_bytes`; the event streams share the limit |

**A connection never receives an admin topic its token lacks the right
for**, whatever its `cdc` rule covers: a subscription to `norca.>` gets the
`Node` events only with `node` read. **The JetStream API of the admin stream
is open to a management token only**: a consumer reads every topic of a
stream, so the right of each topic can't hold there. A token without the
rights subscribes to the admin subjects live instead.

The headers repeat the metadata of the event, so consumers can filter without
decoding the payload:

| Header | Value |
| --- | --- |
| `Nats-Msg-Id` | `<region>:<index>:<topic>:<type>:<namespace>:<key>` (deduplication); an audit record of the secret store (`SecretAccess`, not written to Raft) adds `:<time>-<operation>-<result>`, so every access is a message of its own |
| `Nomad-Region` | region |
| `Nomad-Index` | Raft index of the event |
| `Nomad-Topic` | topic |
| `Nomad-Type` | event type, e.g. `JobRegistered` |
| `Nomad-Namespace` | namespace (if any) |
| `Nomad-Key` | key of the event, e.g. the job ID (if any) |
| `Norca-Job` | the job of a `Job`, `Evaluation`, `Allocation`, `Deployment` or `Service` event, so that a consumer keeps the events of its jobs without decoding the payload |
| `Norca-Redacted` | `true` on a Job event without its secrets, or a Service event without the outputs of its checks (see below) |

**Delivery is at least once and in order.**

- After a leader change, the new
  leader continues with the Raft index of the newest event in the stream and
  publishes the events of that index the stream does not have yet: the events
  of one index are one batch, and a batch can end half way.
- Republished events
  are dropped by their `Nats-Msg-Id` within the two-minute deduplication
  window.

If the event buffer of the servers no longer holds the events from
the newest one in the stream on, for example after a long outage, the leader
publishes a gap marker and continues with the newest events. The gap marker
is on `<prefix>.<region>.Bus`, with the type `EventGap` and a payload
`{"Gap": {"FromIndex": ..., "Reason": "index-gone"}}`.

`events.topics` limits the published topics. Long-term audit, such as the
`SecretAccess` and ACL events, is the job of a consumer that archives the
stream.

### Consuming the events

The changes of a region are read with a
[`cdc` rule](/docs/other-specifications/acl-policy#cdc-rules) in the policy of
a token, or of a task by a policy bound to its job; the user view, with the
guarantees, is [change data capture](/docs/features/change-data-capture).

```hcl
# events-reader policy: the events of the namespace shop in region eu
cdc {
  receive = ["norca.eu.shop.>"]
}
```

- **Live:** a reader subscribes to the subjects of its rule, or narrower
  (`nats sub 'norca.eu.shop.Job'`). The namespace in the subject limits it:
  `norca.eu.shop.>` gives the namespace `shop` only.
- **Through its consumer:** the servers keep one consumer per reader and
  stream, named after the reader (`norca cdc consumer apply`,
  [`/v1/cdc/consumer`](/docs/api/cdc)), its filters within the rule. On the bus
  a reader may only read its own consumers: their information, the next
  messages, the acknowledgements. The information of a stream it gets is the
  configuration and the state of the stream, without the subjects, the
  deleted messages and the servers of the stream. It never creates, changes or deletes a
  consumer or a stream there.

The events of a namespace follow the rule: a reader of `norca.eu.shop.>`
receives every topic of the namespace `shop`, including the job
specifications without their secrets. **Name the namespaces and topics a
reader needs** rather than `norca.eu.>`. **Wildcards are whole tokens.**

> [!IMPORTANT]
> **A reader is in a NATS account of its own**, which holds the subjects of its
> `cdc` rule, its own consumers and the replies of its own requests: it needs no
> inbox prefix. A token with a `cdc` rule and no `bus` rule is a reader as it
> connects. **A token that also has a `bus` rule reads its consumers over a second
> connection**, as the user `cdc` with the token as the password
> (`nats --user cdc --password "$TOKEN"`, nats.go `nats.UserInfo("cdc", token)`);
> its plain connection has the `bus` rule and the changes live, without JetStream.
> A fetch waits at most 30 seconds. The account is made on the server the reader
> connects to and is retired after 5 minutes without a connection; a reader that
> comes back later gets a new one
> ([guarantees](/docs/features/change-data-capture#guarantees)).

**A task connects with its workload identity instead of a token.** The rules
of the policies bound to its job, group or task apply
([workload associated policies](/docs/concepts/workload-identity#workload-associated-acl-policies)),
and its consumers are
named `<allocation id>_<task name>`. The task gets its identity with
`identity { env = true }` (or the file `secrets/norca_token`) and asks for its
consumer through the [Task API](/docs/api/task-api):

```shell-session
$ curl --unix-socket "$NORCA_SECRETS_DIR/api.sock" -H "Authorization: Bearer $NORCA_TOKEN"     -X PUT -d '{"Filters": ["norca.eu.shop.>"]}' localhost/v1/cdc/consumer/events
$ nats --server tls://server1:4649 --tlsca ca.pem --user "$NORCA_TOKEN"     consumer next NORCA_EVENTS_eu "${NORCA_ALLOC_ID}_${NORCA_TASK_NAME}"
```

The characters `.`, `*`, `>` and blanks of a task name become `_` in the
name. **The connection is closed when the allocation has
ended**, the identity no longer connects, and the leader removes the task's
consumers.

### Job events without secrets

**A Job event on the bus leaves out what may hold a secret written into the
job**: the values of `env` and `meta` (the keys stay), the embedded templates,
the task driver configurations (for example the `auth` of a docker image),
the user information and query of the artifact sources and their options and
headers, the headers and bodies of the service checks, and the payload of a
dispatched job. The replaced values read `<redacted>`, and the message has the
header `Norca-Redacted: true`. IDs, version, status, groups, counts, task names
and drivers stay. The [event stream API](/docs/api/events) and the job API
return the whole job, with `read-job`.

**A Service event leaves out the outputs of the checks** of the instance:
the beginning of what a check returned (for example the body of an HTTP
check) may hold anything. The name, role and status of each check, `Ready`
and `Health` stay, and the message has `Norca-Redacted: true`. The service
registration API returns the outputs.

Keep secrets out of jobs anyway: a template that reads a
[secret](/docs/job-specification/secret) or a Variable puts only the reference
into the job.

## Consul KV notices

When a key of the Consul KV is written or deleted through the
Consul-compatible API, the leader publishes a notice **without the value**, so
that a service learns that a setting changed:

| Item | Value |
| --- | --- |
| Subject | `<prefix>.<region>.<namespace>.ConsulKV.KeySet` or `.KeyDeleted`, e.g. `norca.eu.default.ConsulKV.KeySet`. `KeyDeleted` is sent only for a key that was deleted: the delete of a key that does not exist announces nothing |
| Payload | `{"Region": "eu", "Topic": "ConsulKV", "Type": "KeySet", "Key": "app/config/level", "Namespace": "default", "Payload": {"ConsulKV": {"Key": ..., "Time": ...}}}` |
| Headers | `Nomad-Region`, `Nomad-Topic`, `Nomad-Type`, `Nomad-Namespace`, `Nomad-Key` |
| Stream | `NORCA_KV_CHANGES_<region>` on `<prefix>.<region>.*.ConsulKV.*`; `max_age` and an eighth of `max_bytes` |

**The notices are stored in a stream of their own**, so a service that was
not connected catches up with a consumer of `NORCA_KV_CHANGES_<region>`. The
event stream keeps `<prefix>.<region>.<namespace>.<topic>`, one token less,
so the two streams do not share subjects. A failed CAS, a read and the
re-encryption of a full keyring rotation send nothing; a recursive delete
sends one notice per key. A `cdc` rule
`receive = ["norca.eu.default.ConsulKV.>"]` receives the notices of the
namespace `default`.

## Pack push notices

A push notice names the source of a registry, or a cluster registry by name.
The leader of the region syncs every registry whose `source` matches. Sources
are compared without the scheme case, a trailing `/` and `.git`.

```shell-session
$ curl -X POST -H "X-Nomad-Token: $TOKEN" \
    -d '{"Source": "oci://ghcr.io/acme/packs", "Pack": "web", "Version": "1.4.0"}' \
    https://server1:4646/v1/pack-registries/notify-push
```

The request needs a token that may write the cluster registries. The server
stores the notice on `<prefix>.packs.notices`, a subject only the servers
publish, in the stream `NORCA_PACK_PUSHES`, which keeps notices for 24
hours. The leader reads the
stream with the durable consumer `norca-sync-<region>`, so a notice sent
during a leader change is handled by the next leader. **A registry is synced at
most once a minute on push notices:** a notice that comes within that minute
waits for its end and is synced then, unless a sync that started after the
push has it already. Without the bus the server syncs the
matching registries of its region directly.

A pipeline with NATS tooling can also publish the notice itself, on
`<prefix>.packs.pushed`, with a token that has `bus { publish =
["norca.packs.pushed"] }`. A server takes it over and stores it. **Such a
notice is not acknowledged**: the publisher gets no answer. It is lost when:

- no server listens when it is published;
- it is empty, or larger than 64 KiB;
- the server that took it stops before it could store it.

A notice the server can't store at once (JetStream is not available, the bus
restarts, the stream does not take it) is kept in the memory of that server
and stored when the server tries again. **At most 256 notices are kept;
beyond that the oldest is dropped**, with a warning in the log of the server.
**The HTTP API above is the way that confirms a notice.**

Registry syncs on the events of other regions need the buses of the regions
connected to each other; that comes with the gateways between regions.
