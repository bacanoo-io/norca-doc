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
  bucket `consul-kv` of the bus (backend `"auto"` of [`consul_compat`](/docs/configuration/consul_compat)),
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
  task groups for the [built-in autoscaler](/docs/features/autoscaler); see
  [below](#task-group-usage).

The bus is not a message broker for applications. Applications keep their own
NATS, for example the `nats` pack. The bus is configured in the server's
[`bus` block](/docs/configuration/bus) and is enabled by default.

## Task group usage

While the [built-in autoscaler](/docs/features/autoscaler) or the
[metrics store](/docs/configuration/metrics_store) is enabled, the servers ask
the clients in the heartbeat response for the usage of their task groups
every `client_metrics_interval` of the autoscaler (`10s` while only the
metrics store needs it). A client publishes the report as JSON
on its own subject, the only subject a node may publish on; a report larger
than one message is split into several of the same window. The reports travel
on the bus only: without it the clients are not asked for usage.

| Item | Value |
| --- | --- |
| Stream | `NORCA_TELEMETRY_<region>` (memory storage, created by the leader) |
| Subjects | `norca.telemetry.<region>.<node_id>` |
| Limits | 1 hour, a quarter of `max_memory`, 64KiB per message; the oldest reports are dropped first |
| Consumers | `norca-usage-<server_id>`: every server reads every report into its [metrics store](/docs/configuration/metrics_store); the leader also keeps them for the autoscaler |

## The event stream

| Item | Value |
| --- | --- |
| Stream | `NORCA_EVENTS_<region>` (file storage, S2 compression) |
| Subjects | `<prefix>.<region>.<namespace>.<topic>`, e.g. `nomad.eu.default.Job`, `nomad.eu.shop.Allocation` (prefix `nomad` by default); events without a namespace (nodes, operator events) use `_`, e.g. `nomad.eu._.Node` |
| Payload | the event JSON exactly as `/v1/event/stream` returns it, with a `Region` field in front |
| Retention | `max_age` (72h) and `max_bytes` (1GiB, at most a quarter of `max_storage` by default), the oldest events dropped first |
| Replicas | one per server, up to three |

The headers repeat the metadata of the event, so consumers can filter without
decoding the payload:

| Header | Value |
| --- | --- |
| `Nats-Msg-Id` | `<region>:<index>:<topic>:<type>:<namespace>:<key>` (deduplication) |
| `Nomad-Region` | region |
| `Nomad-Index` | Raft index of the event |
| `Nomad-Topic` | topic |
| `Nomad-Type` | event type, e.g. `JobRegistered` |
| `Nomad-Namespace` | namespace (if any) |
| `Nomad-Key` | key of the event, e.g. the job ID (if any) |

Delivery is at least once and in order. After a leader change, the new
leader continues after the newest event in the stream. Republished events
are dropped by their `Nats-Msg-Id` within the two-minute deduplication
window. If the event buffer of the servers no longer holds the events after
the newest one in the stream, for example after a long outage, the leader
publishes a gap marker and continues with the newest events. The gap marker
is on `<prefix>.<region>.Bus`, with the type `EventGap` and a payload
`{"Gap": {"FromIndex": ..., "Reason": "index-gone"}}`.

`events.topics` limits the published topics. Long-term audit, such as the
`SecretAccess` and ACL events, is the job of a consumer that archives the
stream.

### Consuming the events

Consumers connect to the `bus` port (`4649`) of any server with an ACL token
whose policy has a [`bus` rule](/docs/other-specifications/acl-policy#bus-rules):

```hcl
# events-reader policy: the events of region eu, live and from the stream
bus {
  subscribe = ["nomad.eu.>"]
  publish = [
    "$JS.API.INFO",
    "$JS.API.STREAM.INFO.NORCA_EVENTS_eu",
    "$JS.API.CONSUMER.*.NORCA_EVENTS_eu",
    "$JS.API.CONSUMER.*.NORCA_EVENTS_eu.>",
    "$JS.API.CONSUMER.MSG.NEXT.NORCA_EVENTS_eu.>",
    "$JS.ACK.NORCA_EVENTS_eu.>",
  ]
}
```

A JetStream consumer of the stream needs the `$JS.API` subjects of the
stream and its consumers, and `$JS.ACK` to acknowledge messages; the replies
come to the connection's own `_INBOX`, which is always allowed. A plain
subscriber of the live events needs only `subscribe = ["nomad.eu.>"]`.
Wildcards are whole tokens, so the stream is named in full.

The namespace in the subject limits a live subscriber to the events of some
namespaces: `subscribe = ["nomad.eu.shop.>"]` receives the events of the
namespace `shop` only, `["nomad.*.*.Job"]` the job events of every region and
namespace. A JetStream consumer reads whatever its filter subject selects, so
for a namespace-limited reader of the stream allow only consumers filtered
to the namespace (`$JS.API.CONSUMER.CREATE.NORCA_EVENTS_eu.*.nomad.eu.shop.>`)
instead of `$JS.API.CONSUMER.*.NORCA_EVENTS_eu`.

```shell-session
$ nats --server tls://server1:4649 --tlsca ca.pem --user "$TOKEN" \
    sub 'nomad.eu.*.Job'
```

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
publishes the notice on `<prefix>.packs.pushed` in the stream
`NORCA_PACK_PUSHES`, which keeps notices for 24 hours. The leader reads the
stream with the durable consumer `norca-sync-<region>`, so a notice sent
during a leader change is handled by the next leader. A registry is synced at
most once a minute on push notices. Without the bus the server syncs the
matching registries of its region directly.

A pipeline with NATS tooling can also publish the notice itself with a token
that has `bus { publish = ["nomad.packs.pushed"] }`.

Registry syncs on the events of other regions need the buses of the regions
connected to each other; that comes with the gateways between regions.
