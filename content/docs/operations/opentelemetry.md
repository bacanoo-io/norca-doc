---
title: "OpenTelemetry"
linkTitle: "OpenTelemetry"
description: "An overview of what the Norca agents collect and export over OpenTelemetry: metrics, traces, logs and the event stream, their defaults and their main contents."
weight: 3
---

Norca agents export their own telemetry with [OpenTelemetry](https://opentelemetry.io)
over OTLP/gRPC. This page is a short overview of what is collected; each signal has its own
reference page, linked below.

## At a glance

| Signal | Collected | Default | Sent by |
| --- | --- | --- | --- |
| Metrics | yes | on once the [`otlp` block](/docs/configuration/telemetry#otlp) is set | every agent (server and client) |
| Traces | yes | on once the `otlp` block is set; the important operations always, the rest sampled at 0.1 | every agent |
| Logs | yes | **off**: `logs { enabled = true }` | every agent |
| Events (event stream) | yes, as log records | **off**: `logs { events { enabled = true } }` | the leader only |

- **Transport:** OTLP over gRPC to one endpoint (by default the collector on the local node),
  with per-signal overrides; TLS and mTLS, headers or a headers file, gzip, timeout and retry.
  `OTEL_*` environment variables are ignored: the agent configuration is the only source.
- **Without an `otlp` block** nothing is exported and no tracing work is done. The built-in
  metrics (in memory, [`/v1/metrics`](/docs/api/metrics), the history of the servers, the UI
  charts) always run, with or without OTLP.
- **Prometheus** output is separate and optional (the
  [`prometheus` block](/docs/configuration/telemetry#prometheus)).

## The resource of every signal

- `service.name = norca`, `service.version`, `service.instance.id`, `host.name`
- `norca.region`, `norca.datacenter`
- `norca.node.id`, `norca.node.name`, `norca.node_pool` on clients, `norca.server.id` on servers
- the attributes of `resource_attributes` in the agent configuration

What the agent traces, measures or logs while it starts is held until it has its node and
server IDs, then exported with the complete resource.

## Metrics

All names start with `norca.`; histograms are in milliseconds. The full list is in the
[metrics reference](/docs/operations/metrics-reference).

- **`norca.server.*`**: servers. RPC requests, FSM apply per message type, eval broker, plan
  queue and apply, scheduling workers, heartbeats, backups.
- **`norca.raft.*`**: Raft. Apply, commit time, replication, leader elections.
- **`norca.state.*`**: the state store. Snapshot index, restore.
- **`norca.scheduler.*`**: scheduling. Placements, reschedules.
- **`norca.autoscaler.*`**: the built-in autoscaler on the leader.
- **`norca.client.*`**: clients.
  - the host: CPU, memory, disk
  - allocations: CPU, memory and throttling per task
  - allocation counts by state (running, pending, blocked, ...)
- **`norca.badger.<db>.*`**: the Badger databases (Raft log, client state).
- **`norca.agent.*`**: the agent itself.
  - `norca.agent.otlp.export_errors{signal}`
  - `norca.agent.otlp.dropped{signal,reason}`: spans and log records lost
- **`norca.http.*`**: the rate limit of the HTTP API.
- **`norca.runtime.*`**: the Go runtime. Goroutines, heap, GC pauses.
- **`norca.memberlist.*`, `norca.serf.*`**: the gossip of the servers.

The series of a stopped allocation disappear after the expiry.

## Traces

Sampling is parent-based: the important operations are always sampled, the others at
`sample_ratio` (default 0.1). The response header `Norca-Trace-Id` gives the trace ID of a
request. Details: [Tracing](/docs/operations/tracing).

- **HTTP API**: one span per request, named after the route.
  - Not traced: health, metrics, the event stream, monitor, the UI, pprof, file and log
    streams, exec.
- **RPC**: a server span of every RPC, and `forward <method>` when a call goes on to the leader
  or another region.
  - Always sampled: the write calls of jobs, operator, keyring, backups, ACL, namespaces, nodes,
    allocations, deployments, secrets, Rigger, CSI and more.
- **Raft**: `raft.apply`, and `fsm.apply <type>` on the leader.
- **Scheduling**: one trace from the job registration to the plan.
  - `eval.process` → `scheduler.<type>` → `scheduler.compute` → `scheduler.select` (one per task
    group)
  - `plan.submit` → `plan.evaluate` → `plan.apply` → `fsm.apply ApplyPlanResults`
- **Allocation phases on a client**: separate root traces, always sampled, joined to the
  scheduling trace by `norca.eval.id` and `norca.alloc.id`.
  - `alloc.start`, `alloc.stop`, `alloc.restart`, `alloc.gc`
  - below them: `alloc.hook.<name>`, `task.start`, `task.stop`, `task.restart`,
    `task.hook.<name>`, `artifact.download`, and the RPCs a hook makes
  - the calls of an external driver plugin (such as `StartTask`) below `task.start`
- **Not traced**: CSI plugin calls, image pulls, the calls of internal drivers, restarts by the
  restart policy, the update hooks of allocations. Plugins and allocations receive no trace
  context.
- **Common attributes**: `norca.job.id`, `norca.namespace`, `norca.eval.id`, `norca.alloc.id`,
  `norca.task_group`, `norca.task`, `norca.scheduler.type`, `rpc.*`.

## Logs

Off by default. Details: [Logging](/docs/operations/logging#export-over-otlp).

- Every log line of the agent at or above `logs.level`, which is independent of `log_level`
  and changes on a reload.
- The record: timestamp, severity, the message as the body, `norca.logger` (such as
  `norca.worker` or `norca.audit`), the key/values as typed attributes (durations in
  milliseconds), an error as `exception.message` and `exception.type`.
- The `trace_id` and `span_id` of a traced request go into the trace context of the record, so
  the log lines and the spans of one request are linked.
- One key convention across the agent: `alloc_id`, `eval_id`, `job_id`, `node_id`, `namespace`,
  `task`, `error`, `http_method`, `http_path`, `rpc_method`, ...
- **Audit records**: one INFO record per operator write call (`audit = true`) with the
  operation, the caller, the server, the result and allow-listed parameters, never a secret.
  See [Audit records](/docs/operations/audit-log).
- Values are cut at 16 KiB; dropped records are counted
  (`norca.agent.otlp.dropped{signal="logs"}`); the export's own failure lines are never
  exported, so a failing export cannot feed itself.

## Events

Off by default; the leader exports. Details: [Event export](/docs/operations/event-export).

- The event stream of the region, sent as OTLP log records.
- Default topics: `Job`, `Allocation`, `Deployment`, `Node`, `Scaling`, `Backup`, `Server`.
  `ACL*`, `Variables`, `Secret` and `SecretAccess` go out only when listed.
- The record: the event payload (JSON) as the body, and the attributes `norca.event.topic`,
  `norca.event.type`, `norca.event.key`, `norca.event.index`, `norca.namespace`.
- At least once, resumed by the next leader. While the receiver is down the events wait in the
  stream (kept 72 hours by default); nothing is held in memory.

## See also

- [`telemetry` configuration](/docs/configuration/telemetry)
- [Monitoring](/docs/operations/monitoring)
- [Metrics reference](/docs/operations/metrics-reference)
- [Tracing](/docs/operations/tracing)
- [Logging](/docs/operations/logging)
- [Audit records](/docs/operations/audit-log)
- [Event export](/docs/operations/event-export)
