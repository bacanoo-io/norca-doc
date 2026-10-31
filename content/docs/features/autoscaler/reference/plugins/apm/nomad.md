---
title: "nomad-apm: built-in metrics"
linkTitle: "nomad-apm"
description: "The \"nomad-apm\" source serves the CPU and memory usage of task groups that the clients report to the servers."
upstream:
  path: "website/content/tools/autoscaling/plugins/apm/nomad.mdx"
---

The `nomad-apm` source provides the CPU and memory usage of task groups without
an additional application. In the built-in autoscaler it does not query the
clients at evaluation time: the clients aggregate the usage of their allocations
per task group over a short window (`client_metrics_interval`, default `10s`) and
publish it on the [system bus](/docs/features/system-bus#task-group-usage). The leader keeps the
reports in memory for `metrics_window` (default `5m`) in a fixed number of time
buckets per task group, so the memory used does not depend on the number of
nodes or allocations, and no RPC is made per allocation.

`nomad-apm` is the default `source` of a check. It needs no `apm` block and no
ACL token, but it needs the system bus: without it the clients report no usage
and the checks of this source return an error.

> [!NOTE]
> The window is kept in the memory of the leader. After a leader change the new
> leader fills it from its [metrics store](/docs/configuration/metrics_store),
> which every server keeps from the same reports, so the checks continue at
> once. Without the store the new leader starts with an empty window, and
> checks of this source return an "insufficient data" error until one full
> `metrics_window` has been collected.
> With the default `on_check_error = "ignore"` such a check is left out of the
> evaluation, so the group is not scaled on partial data.

## Built-in metrics

The typed form of a check names the metric with `metric`, without a query:

```hcl
check "cpu" {
  metric   = "nomad.cpu"
  strategy = "target-value"
  target   = 70
}
```

| Metric | Value |
| --- | --- |
| `nomad.cpu` | CPU usage as a percentage of the CPU reserved by the allocations |
| `nomad.memory` | Memory usage as a percentage of the memory reserved by the allocations |
| `nomad.cpu_mhz` | CPU usage in MHz |
| `nomad.memory_mb` | Memory usage in MiB |

Each value is the average over the allocations of the task group and over the
[`query_window`](/docs/features/autoscaler/reference/policy#check-options) of the
check (default `1m`, limited to `metrics_window`). With
`query_window = "instant"` only the latest time bucket is used.

## Query form

For compatibility with policies written for the external autoscaler, a check can
also use `source = "nomad-apm"` (or no source) with a query of the form
`<operation>_<metric>`:

```hcl
check "memory" {
  source = "nomad-apm"
  query  = "avg_memory-allocated"

  strategy "target-value" {
    target = 75
  }
}
```

The operations are:

- `avg` - the average of the metric value across the allocations of the task
  group.

- `max` - the highest metric value among the allocations of the task group.

- `sum` - the average multiplied by the number of running allocations of the
  task group.

The metrics are:

- `cpu-allocated` - the percentage of CPU used out of the total CPU reserved for
  the allocation.

- `memory-allocated` - the percentage of memory used out of the total memory
  reserved for the allocation.

- `memory` - memory usage in bytes.

The `min` operation, the `cpu` metric and the client node queries
(`percentage-allocated_cpu`, `percentage-allocated_memory`) of the external
autoscaler are not supported: the built-in autoscaler does not scale clients.

A query normally refers to the task group of its policy. The canonical form
`<query>/<group>/<job>@<namespace>`, for example
`avg_cpu-allocated/cache/example@default`, reads the usage of another task
group.
