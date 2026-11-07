---
title: Metrics
linkTitle: Metrics
description: The metrics of Norca compared with Nomad v1.6.5. The agent telemetry is unchanged; every server also keeps a history of the cluster in an embedded store.
weight: 1
---

Nomad v1.6.5 shows only current values: the agent telemetry keeps one minute in memory, the
allocation and node statistics are read live from the client, and any history needs an external
system such as Prometheus. Norca keeps that telemetry unchanged. On top of it, every server stores
a history in an embedded time-series store, the [metrics store](/docs/configuration/metrics_store):
- the usage of the task groups and the nodes, reported by the clients on the
  [system bus](/docs/features/system-bus#task-group-usage);
- the capacity of the cluster, the scheduler, the Raft log, the system bus and the custom objects,
  sampled by the servers themselves.

The API, the CLI, the web UI and the built-in autoscaler read this history. No external metrics
system is needed for it.

## Comparison

| Area | Nomad v1.6.5 | Norca | Change |
| --- | --- | --- | --- |
| Agent telemetry | go-metrics: one minute in memory, [`/v1/metrics`](/docs/api/metrics), statsd, Prometheus and other sinks | The same, under the same `nomad.*` names | Unchanged |
| `publish_allocation_metrics`, `publish_node_metrics` | Allocation and node values sent to the telemetry sinks | The same; the metrics store does not depend on them | Unchanged |
| History in the cluster | None; it needs an external time-series database | An embedded store on every server, in its data directory | New |
| Usage of the task groups | Read live from the client (`/v1/client/allocation/:id/stats`) | The clients also publish it on the system bus, and every server stores it; `usage` in the [client block](/docs/configuration/client) | New |
| Statistics of the host | Read live from the client (`/v1/client/stats`) | Also reported with the usage and stored as `norca.node.*` | New |
| Metrics kept | — | Task groups, the cluster and quotas, the nodes, the scheduler and the control plane, the servers (Raft, RPC, bus), and the custom objects (NodeGroup, LoadBalancer) | New |
| Retention and disk use | — | Two stores: the main one for 30 days within 4 GiB, the hosts one for 7 days within 1 GiB; at most `max_series` series, 50 000 | New |
| Changing the settings | — | Retention, disk caps and `max_series` change with a reload (`SIGHUP`), without a restart | New |
| Series of things that are gone | — | Forgotten after the retention, so they no longer count against `max_series` | New |
| History API | Only current values | [`/v1/metrics/history`](/docs/api/metrics-store#read-history), `/series`, `/summary`, `/v1/operator/metrics-store` | New |
| Access to the history | — | ACL by metric family: `read-job`, `node:read`, `operator:read` and others | New |
| CLI | — | [`norca operator metrics-store status`](/docs/commands/operator/metrics-store/status) | New |
| Deployment | — | The [deployer](/docs/deployer/configuration#metrics_store) writes the same `metrics_store` block to every server | New |
| High availability | — | Every server keeps every report; the bus keeps the reports for an hour, so a restarted server catches up; `server_id` reads another server | New |
| Web UI charts | Live charts, kept in the browser only while the page is open | The live charts stay, plus history charts whose range follows the retention: task group, client, server, node group, load balancer, dashboard; a store status card | Changed |
| Autoscaling | An external Nomad Autoscaler; its APM plugins read current values | A [built-in autoscaler](/docs/features/autoscaler) on the leader. A new leader refills its window from the store, a long `query_window` reads the store, and the `norca` source scales on cluster capacity; `engine = "external"` keeps the old way | Changed |
| Swap of a task (`exec`, `java`) | `Swap` in the allocation statistics was memory plus swap | Swap alone, there and in `norca.group.memory_swap_mb` | Changed |
| Swap of `docker` on cgroups v2 | Listed as measured, always 0 | Not listed as measured; no point instead of a zero | Changed |

## Left out or not used

| Item | In Norca | Why |
| --- | --- | --- |
| Application metrics (the jobs' own metrics) | Not collected | Planned for later; an external system collects them today |
| Device (GPU) statistics | Not stored | Not needed yet |
| Series per allocation | Not stored; the task group series hold the mean of its allocations | Keeps the number of series bounded |
| Peak memory of a task | Not stored | Only `exec` and `java` report it, on cgroups v2 with Linux 5.19 or later |
| Statistics per stream or per connection of the bus | Totals only | Users can create streams, so their number has no bound |
| RPC counts per method or per peer | Totals per server | Only Raft replication is per peer (`raft_append_entries_seconds`) |
| A `server` label | None; each server stores only its own server metrics | Read another server with `server_id` |
| Raft and backups | The history is not written to Raft and is not backed up | It is local data of each server; after a restart the bus refills up to an hour, and another server can be read with `server_id` |
| The telemetry's one-minute memory | Not used as a source, except for the two Raft times | The store samples the state itself |
| An external time-series database (Prometheus, VictoriaMetrics) | Not built in and not required | The telemetry sinks still feed one if it is wanted |
| The external Nomad Autoscaler | Not needed | The built-in autoscaler replaces it; `engine = "external"` still works |
