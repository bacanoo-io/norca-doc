---
title: "metrics_store Block"
linkTitle: "metrics_store"
description: "The \"metrics_store\" block configures the history of the task group usage that every server keeps."
---

**Placement:** `server -> metrics_store`

The `metrics_store` block configures the history of the CPU and memory usage
of the task groups. The clients publish their usage on the
[system bus](/docs/features/system-bus#task-group-usage); every server reads
every report and keeps the history in its data directory
(`[data_dir]/server/tsdb`), in an embedded time-series store. The history is
never written to Raft and is not part of the backups.

The store is enabled by default on servers. It needs the
[system bus](/docs/configuration/bus): without the bus the clients report no
usage and nothing is stored. While the store or the
[built-in autoscaler](/docs/configuration/autoscaler) is enabled, the servers
ask the clients for their usage.

```hcl
server {
  metrics_store {
    enabled            = true
    retention          = "720h"
    partition_duration = "6h"
    sample_interval    = "30s"
    max_disk_size      = "2GiB"
    max_series         = 50000
    wal_buffered_size  = 4096
  }
}
```

## Parameters

- `enabled` `(bool: true)` - Stores the usage. With `false` the server creates
  no directory and stores nothing.

- `retention` `(string: "720h")` - How long the points are kept, at most 30
  days. The store drops a whole partition once it is older.

- `partition_duration` `(string: "6h")` - The time range of a partition. The
  points of the two newest partitions are kept in memory and in a write-ahead
  log, the older ones in compressed files mapped into memory. A report older
  than one partition before the newest one is dropped.

- `sample_interval` `(string: "30s")` - The resolution of the history. The
  reports of an interval are combined into one point per task group: the
  averages weighted by the number of samples, and the largest maximum.

- `max_disk_size` `(string: "2GiB")` - The disk cap. Above it the oldest
  partitions are removed first, whatever their age.

- `max_series` `(int: 50000)` - The largest number of series. Every task
  group has 8 series (the average and the maximum of 4 metrics); the task
  groups beyond the limit are not stored.

- `wal_buffered_size` `(int: 4096)` - The bytes the write-ahead log buffers
  before it writes them: `0` writes every point, `-1` disables the log, so
  the newest points are lost when the server stops abruptly.

## Metrics

The values are per allocation of the task group, like those of the
[built-in autoscaler](/docs/features/autoscaler):

| Metric | Unit |
| --- | --- |
| `norca.group.cpu` | percent of the allocated CPU |
| `norca.group.cpu_mhz` | MHz |
| `norca.group.memory` | percent of the allocated memory |
| `norca.group.memory_mb` | MiB |

Read the history with the [metrics store API](/docs/api/metrics-store), and
the state of the store with
[`norca operator metrics-store status`](/docs/commands/operator/metrics-store/status).

## High availability

Every server stores every report: the telemetry stream of the bus keeps the
reports for an hour, so a server that restarts catches up on what it missed in
that time. A server that was down for longer has a gap; a request can read the
history of another server with `server_id`.
