---
title: "Event export"
linkTitle: "Event export"
description: "The leader of a region sends the events of the event stream as OpenTelemetry log records over OTLP: the events block, the topics, delivery across leader changes, backpressure and the record format."
weight: 7
---

The leader of a region can send the events of the region's
[event stream](/docs/features/system-bus#the-event-stream) (jobs,
allocations, deployments, nodes, scaling decisions, backups, ...) as
OpenTelemetry log records, over the same OTLP/gRPC connection as the agent's
own [logs](/docs/operations/logging#export-over-otlp). A log backend then
keeps the history of the cluster's changes next to the agent's logs and
traces, searchable by topic, type, object and namespace, without a consumer
of the [event stream API](/docs/api/events) to run and keep alive.

## Turn it on

The export is the `events` block of the `logs` block of the
[`otlp` block](/docs/configuration/telemetry#logs). It is off by default:

```hcl
telemetry {
  otlp {
    logs {
      enabled = true

      events {
        enabled = true
        # the default topics:
        # topics = ["Job", "Allocation", "Deployment", "Node", "Scaling", "Backup", "Server"]
      }
    }
  }
}
```

It has three requirements, which the agent checks when it starts:

- **The logs signal:** the events are log records, so `logs.enabled = true` is
  needed. Without it the agent does not start:
  `telemetry.otlp.logs.events.enabled: the event export sends log records: it needs logs.enabled = true`.
- **A server:** only a server has the event stream. On an agent without a
  server the block has no effect, and the agent logs a warning that says so.
- **The events on the system bus:** the export reads the event stream of the
  [system bus](/docs/configuration/bus), so `server.bus` and its `events`
  must be enabled (they are by default), and every exported topic must be
  published: `server.bus.events.topics` is `["*"]` or lists it. Otherwise
  the server does not start:

  ```text
  telemetry.otlp.logs.events: the export reads the event stream of the system bus: it needs server.bus and its events enabled
  telemetry.otlp.logs.events: the topics ["Scaling"] are not in server.bus.events.topics, so they are never exported
  ```

**Give every server the same `events` block and a reachable OTLP receiver.**
Only the leader exports, with its own configuration: after a leader change
the new leader's topics and receiver apply.

Enabling or disabling the export needs a restart of the agent; so does a
change of its topics.

## Topics

`topics` lists the exported topics by name: `Job`, `Allocation`,
`Deployment`, `Node`, `Scaling`, `Backup` and `Server` by default. The
[event stream API](/docs/api/events#event-topics) lists all topics.

**A topic is exported only when it is listed; there is no wildcard** (`"*"`
fails the start). The topics whose events may carry secrets or identities
are not in the default list and are sent only when listed explicitly:
the ACL topics (`ACLToken`, `ACLPolicy`, `ACLRole`, `ACLAuthMethod`,
`ACLBindingRule`), `Variables`, `Secret` and `SecretAccess` (the audit
records of the secret store). The receiver and the backend then hold these
events, readable by everyone who can read the logs there; the agent's ACL
does not reach them.

```hcl
events {
  enabled = true
  topics  = ["Job", "Allocation", "Deployment", "Node", "Scaling", "Backup", "Server", "SecretAccess"]
}
```

## How the events are delivered

- **The leader exports.** It reads the event stream
  (`NORCA_EVENTS_<region>`) and the admin event stream
  (`NORCA_ADMIN_EVENTS_<region>`), filtered to the exported topics, through a
  durable JetStream consumer named `norca-otlp-export` on each. A topic is
  read from either stream, whichever holds it.
- **At least once.** The leader acknowledges an event only when the receiver
  accepted its record. An event whose acknowledgement was lost is exported
  again, so a backend can see an event twice; the `norca.event.index`,
  `norca.event.topic`, `norca.event.type` and `norca.event.key` attributes
  identify it.
- **Across leader changes and restarts.** The consumers live in JetStream,
  replicated like their streams. A new leader, or a restarted server that
  becomes leader again, continues after the last acknowledged event. Events
  the old leader had fetched but not exported are handed back at once when it
  loses the leadership; those of a leader that stopped without handing them
  back are delivered again within a minute.
- **A new consumer starts with the new events.** When the export runs for
  the first time, the events already in the stream are not sent; the export
  begins with the next event.
- **Turning the export off leaves its consumers**, idle. They go after
  `bus.events.max_age` (72 hours) of idleness, like every consumer of the
  event streams. If the export is turned on again before that, it continues
  after the last exported event and sends the events of the pause that the
  stream still holds.

### Backpressure

The leader fetches at most 100 events at a time and sends them in batches of
at most 2 MiB of payload. While the receiver is down or refuses the records,
the leader keeps the one batch it fetched, retries it with a backoff of up
to 30 seconds, and fetches nothing more. **Nothing is buffered in the
agent's memory: the events wait in the stream**, which keeps them for
`server.bus.events.max_age` (72 hours by default) within its share of
`max_bytes`. Events the stream drops before the receiver is back (older than
`max_age`, or beyond its size) are not exported.

### Consumers

The two consumers count toward
[`server.bus.events.max_consumers`](/docs/configuration/bus) (64 by default),
one on each stream. When a stream has no room for another consumer, the
leader cannot create the export's consumer: it logs the warning
`system bus: an operation failed, retrying` with the operation
`exporting the events of NORCA_EVENTS_<region> over OTLP` and tries again.

## The event record

Each event is one log record:

| Record field | Value |
| --- | --- |
| Timestamp | When the event was stored in the stream |
| Observed timestamp | When the leader exported it |
| Severity | `INFO` (9) |
| Body | The JSON of the event's `Payload`, as a string, as the stream has it: the [Job events without their secrets](/docs/features/system-bus#job-events-without-secrets) |
| `norca.event.topic` | The topic: `Job`, `Allocation`, ... |
| `norca.event.type` | The type: `JobRegistered`, `AllocationUpdated`, ... |
| `norca.event.key` | The key of the event, usually the ID or name of the object |
| `norca.event.index` | The Raft index of the event (integer) |
| `norca.namespace` | The namespace; absent for events without one |
| `norca.event.truncated` | `true` when the body was cut |
| Scope | `github.com/bacanoo-io/norca/norca/events`, with the agent's version |
| Resource | The leader's [resource attributes](/docs/configuration/telemetry#resource-attributes) |

**A body is cut at 1 MiB** (at a character boundary) and the record gets
`norca.event.truncated = true`; the cut body is no longer valid JSON. The
records have no trace ID: the events are not part of a trace.

The scope tells the event records apart from the agent's own log lines,
whose scope is `github.com/bacanoo-io/norca/norca`, and the
`norca.event.topic` attribute only exists on event records.

An event of a deployment, as the record carries it:

```text
Timestamp:           2026-11-27T10:31:07.118Z
Severity:            INFO (9)
Scope:               github.com/bacanoo-io/norca/norca/events
norca.event.topic:   Deployment
norca.event.type:    DeploymentStatusUpdate
norca.event.key:     5b2c8e1a-3f4d-4e6b-9a7c-0d1e2f3a4b5c
norca.event.index:   48213
norca.namespace:     shop
Body:                {"Deployment":{"ID":"5b2c8e1a-3f4d-4e6b-9a7c-0d1e2f3a4b5c","JobID":"web","Status":"successful", ...}}
```

## Filtering the records

In the collector, a filter processor can keep only some of the events, for
example drop the allocation events and keep everything else (the agent's log
lines too):

```yaml
processors:
  filter/norca-events:
    error_mode: ignore
    logs:
      log_record:
        - 'instrumentation_scope.name == "github.com/bacanoo-io/norca/norca/events" and attributes["norca.event.topic"] == "Allocation"'
```

In the backend, filter on the attributes. In
[OpenObserve](/docs/operations/monitoring#a-metrics-traces-and-logs-stack-from-the-registry),
which writes the dots of attribute names as underscores, the failed
deployments of a namespace in the logs stream `default` are:

```sql
SELECT _timestamp, norca_event_type, norca_event_key, body
FROM "default"
WHERE norca_event_topic = 'Deployment'
  AND norca_namespace = 'shop'
  AND str_match(body, '"Status":"failed"')
ORDER BY _timestamp DESC
```

## Failures

A failed export is logged as a warning at most once a minute, with the number
of failures since the last line, and counted in the metric
`norca.agent.otlp.export_errors` with `signal="events"`; each retry is also
logged at `debug`. Unlike the failures of the logs signal, these warnings are
exported as ordinary log lines when the logs signal works.

| Metric | Labels | Meaning |
| --- | --- | --- |
| `norca.agent.otlp.export_errors` | `signal` = `events` | Failed exports of event batches (each retry counts) |

A rising count with no records arriving means the events are waiting in the
stream; they are sent once the receiver accepts them again, as long as the
stream still holds them.

## See also

- The [`logs` block](/docs/configuration/telemetry#logs) of the OTLP export
- [Logging](/docs/operations/logging#export-over-otlp): the export of the
  agent's log lines
- The [event stream](/docs/features/system-bus#the-event-stream) on the system
  bus and its [`events` settings](/docs/configuration/bus)
- The [event stream API](/docs/api/events)
