---
title: "norca: the capacity of the cluster"
linkTitle: "norca"
description: "The \"norca\" source serves the allocated and used capacity of the cluster per datacenter, node pool and node class, from the metrics store."
---

The `norca` source provides the capacity of the cluster as the servers sample it
from their state: the share of the CPU, memory and disk of the ready, eligible
nodes that the running allocations have allocated or actually use, and the number
of ready nodes. It needs no `apm` block and no ACL token, but it needs the
[metrics store](/docs/configuration/metrics_store), which keeps the gauges.

A check selects the source with `source = "norca"` and names the gauge without
the prefix `norca.`:

```hcl
scaling {
  min = 1
  max = 10

  policy {
    check "cluster_cpu" {
      source = "norca"
      query  = "cluster.cpu_allocated?dc=dc1&pool=workers"

      strategy "target-value" {
        target = 70
      }
    }
  }
}
```

## Queries

| Query | Value |
| --- | --- |
| `cluster.cpu_allocated` | CPU of the running allocations, in percent of the CPU of the nodes |
| `cluster.cpu_used` | CPU the allocations actually use, in percent |
| `cluster.memory_allocated` | memory of the running allocations, in percent |
| `cluster.memory_used` | memory the allocations actually use, in percent |
| `cluster.disk_allocated` | ephemeral disk of the running allocations, in percent |
| `cluster.nodes_ready` | the number of ready, eligible nodes |

These are the cluster gauges of the [metrics store](/docs/configuration/metrics_store#metrics).
Nodes that are not ready, or that are ineligible (a node being drained, for
example), count in none of them.

The query selects the series with parameters:

| Parameter | Meaning |
| --- | --- |
| `dc` | the datacenter |
| `pool` | the node pool |
| `class` | the node class; empty (the default) covers all the nodes of the datacenter and pool |
| `op` | `avg` (the default) is the mean of the sample intervals in the query window, `max` their largest maximum |

A series that is not selected is the series with an empty label, so **name `dc` and
`pool` for the gauge you mean.** The value is a single data point for the query
window (`query_window`; an `instant` query reads the latest two minutes). A query
for a series that has no samples in the window fails with an error that names the
series, and `on_error` of the check decides what the autoscaler does then.
