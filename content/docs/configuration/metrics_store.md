---
title: "metrics_store Block"
linkTitle: "metrics_store"
description: "The \"metrics_store\" block configures the history of the task group usage, the nodes, the cluster, the control plane and the custom objects that every server keeps."
---

**Placement:** `server -> metrics_store`

The `metrics_store` block configures the history of the CPU and memory usage
of the task groups and of the nodes, of the capacity of the cluster, of the
scheduler and the control plane, and of the custom objects. The clients
publish their usage on
the [system bus](/docs/features/system-bus#task-group-usage); every server
reads every report, samples the rest itself, and keeps the history in its
data directory (`[data_dir]/server/tsdb`), in an embedded time-series store.
The history is never written to Raft and is not part of the backups.

The store is enabled by default on servers. It needs the
[system bus](/docs/configuration/bus): without the bus the clients report no
usage and nothing is stored. While the store or the
[built-in autoscaler](/docs/configuration/autoscaler) is enabled, the servers
ask the clients for their usage.

```hcl
server {
  metrics_store {
    enabled            = true
    retention          = "30d"
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

- `retention` `(string: "30d")` - How long the points are kept: from `1h` to
  `30d` (`720h`). It takes a duration (`"168h"`, `"90m"`) or whole days,
  optionally followed by a duration (`"7d"`, `"1d12h"`). The store drops a
  whole partition once the retention has passed since the partition was
  written to disk, so the oldest point can be up to two partitions older than
  the retention. A [reload](#reload) applies a new retention without a
  restart.

- `partition_duration` `(string: "6h")` - The time range of a partition. The
  points of the two newest partitions are kept in memory and in a write-ahead
  log, the older ones in compressed files mapped into memory. A report older
  than one partition before the newest one is dropped. It must not be longer
  than `retention`; without it, a retention shorter than six hours sets the
  partition to the retention (`retention = "2h"` gives two-hour partitions).

- `sample_interval` `(string: "30s")` - The resolution of the history. The
  reports of an interval are combined into one point per task group: the
  averages weighted by the number of samples, and the largest maximum.

- `max_disk_size` `(string: "2GiB")` - The disk cap. Above it the oldest
  partitions are removed first, whatever their age. A [reload](#reload)
  applies it without a restart.

- `max_series` `(int: 50000)` - The largest number of series. Every task
  group has 28 series (the average and the maximum of 14 metrics), every
  series of the other metrics counts 2 (a node has up to 7, so 14); the
  series beyond the limit are not stored. A [reload](#reload) applies it to
  new series.

- `wal_buffered_size` `(int: 4096)` - The bytes the write-ahead log buffers
  before it writes them: `0` writes every point, `-1` disables the log, so
  the newest points are lost when the server stops abruptly.

## Reload

A configuration reload of the agent (`SIGHUP`) applies three settings to the
running store, without a restart:

- `retention`: a shorter retention removes the partitions now past it at
  once; a longer one keeps what is still on disk longer. What was already
  removed does not come back.
- `max_disk_size`: applied at the next maintenance of the store, within a
  minute.
- `max_series`: applies to new series; the series stored already stay.

`partition_duration`, `sample_interval` and `wal_buffered_size` shape the
files and the sampling: a reload that changes them logs a warning and keeps
the running values until the next restart. Turning the store on or off with
`enabled` also needs a restart. A reload with an invalid block (a retention
outside `1h` to `30d`, or a `partition_duration` longer than `retention`)
changes nothing and logs the error.

Each server has its own store and its own configuration: give the servers of
a region the same `retention` and `max_disk_size`, so that they answer the
same query with the same range. The [deployer](/docs/deployer/configuration#metrics_store)
writes the same block to every server. The effective values of a server are
in the output of
[`norca operator metrics-store status`](/docs/commands/operator/metrics-store/status).

## Metrics

Each metric is stored as an average and a maximum per sample interval. The
usage values are per allocation of the task group, like those of the
[built-in autoscaler](/docs/features/autoscaler):

| Metric | Unit | Source |
| --- | --- | --- |
| `norca.group.cpu` | percent of the allocated CPU | clients |
| `norca.group.cpu_mhz` | MHz | clients |
| `norca.group.cpu_throttled` | percent of the time the tasks were throttled by their CPU limit; the tasks of an allocation add up | clients |
| `norca.group.memory` | percent of the allocated memory | clients |
| `norca.group.memory_mb` | MiB | clients |
| `norca.group.memory_cache_mb` | MiB of page cache (reclaimable) | clients |
| `norca.group.memory_peak_mb` | MiB: the highest memory usage the tasks of an allocation reached since they started (the sum over the tasks); only from the drivers that measure it, see below | clients |
| `norca.group.oom_kills` | tasks killed for running out of memory, of all allocations: the average is the sum in the interval or step | clients |
| `norca.group.restarts` | task restarts of all allocations in the interval: the average is the sum in the interval or step | servers, from the task states |
| `norca.group.allocs_running` | running allocations | servers, from the job summary |
| `norca.group.allocs_queued` | queued allocations | servers, from the job summary |
| `norca.group.allocs_starting` | starting allocations | servers, from the job summary |
| `norca.group.allocs_failed` | failed allocations the servers still keep (until the garbage collection removes them) | servers, from the job summary |
| `norca.group.allocs_lost` | lost allocations the servers still keep | servers, from the job summary |

The servers sample the allocations every sample interval, also of task groups
whose clients report no usage; a task group gets these series once it has a
running, queued or starting allocation or a task restart. Failed or lost
allocations alone, which the summary of an old job keeps, start no series.

`norca.group.restarts` is the increase of the restart counts of the tasks
(`Restarts` of the task states) between two samples of the server. The first
sample after a server starts only takes the counts; an allocation removed by
the garbage collection drops out without lowering the sum.

`norca.group.memory_peak_mb` is the peak the driver reports (`MaxUsage` of
the memory statistics): the `exec` and `java` drivers on cgroups v2 with
Linux 5.19 or later (`memory.peak`), and drivers on cgroups v1. `docker`,
`raw_exec` and `exec2` on cgroups v2 report none, and their task groups have
no points of this metric.

### Cluster and quota metrics

Every sample interval each server also samples the capacity of the cluster and
the quotas from its state and from the latest usage report of every node. A
series counts 2 towards `max_series`.

| Metric | Labels | Value |
| --- | --- | --- |
| `norca.cluster.cpu_allocated` | `dc`, `pool`, `class` | CPU of the running allocations, in percent of the CPU of the ready, eligible nodes after their reserved CPU |
| `norca.cluster.cpu_used` | `dc`, `pool`, `class` | CPU the allocations actually use, in percent of the same capacity |
| `norca.cluster.memory_allocated` | `dc`, `pool`, `class` | memory of the running allocations, in percent |
| `norca.cluster.memory_used` | `dc`, `pool`, `class` | memory the allocations actually use, in percent |
| `norca.cluster.disk_allocated` | `dc`, `pool`, `class` | ephemeral disk of the running allocations, in percent |
| `norca.cluster.nodes_ready` | `dc`, `pool`, `class` | ready, eligible nodes |
| `norca.nodes.down` | `dc`, `pool` | down nodes |
| `norca.nodes.disconnected` | `dc`, `pool` | disconnected nodes |
| `norca.nodes.draining` | `dc`, `pool` | ready nodes being drained |
| `norca.nodes.ineligible` | `dc`, `pool` | ready nodes not eligible for scheduling, the draining ones included: `nodes_ready` and `ineligible` add up to the ready nodes |
| `norca.cluster.blocked_cpu_mhz` | `dc`, `pool` | MHz of the allocations that could not be placed for want of capacity; stored by the leader only |
| `norca.cluster.blocked_memory_mb` | `dc`, `pool` | memory of those allocations, in MiB |
| `norca.cluster.blocked_evals` | `dc`, `pool` | blocked evaluations that wait for capacity |
| `norca.cluster.blocked_allocs_exclusive` | `dc`, `pool` | unplaced allocations that need a node of their own (`distinct_hosts`, or a port by number on the host) |
| `norca.cluster.blocked_unverifiable` | `dc`, `pool` | unplaced allocations blocked by a `distinct_property` on a property other than the datacenter or the node pool: what a node that does not exist yet would have is not known, so no node is advised for them |
| `norca.cluster.autopilot_healthy` | | 1 when the servers are healthy, else 0; stored by the leader only |
| `norca.cluster.autopilot_failure_tolerance` | | servers that can fail without losing the quorum; stored by the leader only |
| `norca.quota.cpu_mhz_allocated` | `quota` | MHz of the allocations of the namespaces of the quota in the region |
| `norca.quota.cpu_mhz_used` | `quota` | MHz they actually use |
| `norca.quota.memory_mb_allocated` | `quota` | MiB of the allocations |
| `norca.quota.memory_mb_used` | `quota` | MiB they actually use |

The label `class` is the node class. The series with `class` empty covers all the nodes of the datacenter and node pool, whatever their class; every node class that is set has a series of its own with the nodes of that class only. A series counts 2 towards `max_series`, so a node class adds six series per datacenter and pool.

The `used` values come from the clients' usage reports: a node whose latest
report is older than two report intervals counts as using nothing.

### Node metrics

The clients report the statistics of their host with their usage, once per
report: every server stores them per node. The value of an interval is the
mean of the measurements of the clients (every stats collection interval,
one second by default), its maximum the largest one.

| Metric | Value |
| --- | --- |
| `norca.node.cpu_used` | CPU time in user and system mode, in percent of the CPU of the node (the mean over its cores) |
| `norca.node.cpu_mhz` | the same in MHz; only when the client knows the CPU of the node |
| `norca.node.memory_used_mb` | memory in use, in MiB |
| `norca.node.memory_total_mb` | memory of the node, in MiB |
| `norca.node.disk_used_mb` | space in use on the file system of the allocation directory, in MiB |
| `norca.node.disk_total_mb` | size of that file system, in MiB |
| `norca.node.inodes_used_percent` | inodes in use on that file system, in percent |

The labels are `node` (the node ID), `dc`, `pool` and `class`. The server
takes the datacenter, node pool and node class from the node in its state, not
from the report; the report of a node the state does not know is not stored.
A node has up to 14 series (7 metrics), so with many nodes and a long
retention plan `max_disk_size` and `max_series` for them. A client with
[`usage`](/docs/configuration/client) disabled or off the bus reports no
statistics of its host either. The statistics of devices (GPUs) are not
stored.

### Scheduler and control plane metrics

Every sample interval each server also samples the scheduler and the control
plane. What only the leader has (the eval broker, the plan queue, the blocked
evaluations, the heartbeats, the secrets watchers and the autoscaler) is
stored by the leader only: after a leader change the history continues in the
store of the new leader. The jobs and the backups come from the state, which
every server has. The security events and the store's own values are those of
the server that stores them.

The security events are counters: each point is the number of events in the
sample interval on that server (the sum over a step of the history).

| Metric | Labels | Value | Stored by |
| --- | --- | --- | --- |
| `norca.sched.broker_ready` | | evaluations ready for a scheduler | leader |
| `norca.sched.broker_unacked` | | evaluations handed to a scheduler and not acknowledged yet | leader |
| `norca.sched.broker_pending` | | evaluations waiting behind another evaluation of the same job | leader |
| `norca.sched.broker_waiting` | | evaluations waiting for their wait time | leader |
| `norca.sched.broker_delayed` | | evaluations delayed until a time (rescheduling) | leader |
| `norca.sched.plan_queue_depth` | | plans waiting to be applied | leader |
| `norca.sched.blocked_total` | | blocked evaluations | leader |
| `norca.sched.blocked_escaped` | | blocked evaluations that escaped the node classes | leader |
| `norca.sched.blocked_quota_limit` | | evaluations blocked by a quota | leader |
| `norca.sched.heartbeats_active` | | nodes whose heartbeat the leader tracks | leader |
| `norca.jobs.pending` | `ns` | pending jobs of the namespace | every server |
| `norca.jobs.running` | `ns` | running jobs of the namespace | every server |
| `norca.jobs.dead` | `ns` | dead (stopped or finished) jobs of the namespace | every server |
| `norca.secrets.leases_active` | | active leases of the built-in secret store | leader |
| `norca.secrets.expiring` | | secrets about to expire | leader |
| `norca.secrets.expired` | | expired secrets | leader |
| `norca.secrets.rotation_due` | | secrets whose rotation is due | leader |
| `norca.backup.last_success_age_seconds` | | seconds since the newest usable (complete or partial) backup; no series before the first one | every server |
| `norca.backup.size_bytes` | `destination` | bytes of the state of the newest usable backup on the destination | every server |
| `norca.backup.duration_seconds` | `destination` | seconds the newest usable backup took on the destination | every server |
| `norca.security.certificates_issued` | | workload certificates issued by the [mTLS](/docs/configuration/mtls) certificate authority, per interval | each server |
| `norca.security.admission_denied` | | jobs and variables denied by [admission control](/docs/configuration/admission), per interval | each server |
| `norca.security.webhook_calls` | `webhook` | calls to the admission webhook, per interval | each server |
| `norca.security.webhook_errors` | `webhook` | failed calls to the admission webhook, per interval | each server |
| `norca.autoscaler.queue` | | scaling policies waiting for an evaluation; while the [built-in autoscaler](/docs/configuration/autoscaler) runs | leader |
| `norca.autoscaler.policies` | | scaling policies of the autoscaler | leader |
| `norca.autoscaler.oscillation_suspended` | | targets this leader suspended for oscillating, while suspended | leader |
| `norca.store.disk_bytes` | | disk use of the metrics store, in bytes | each server |
| `norca.store.series` | | series of the metrics store | each server |
| `norca.store.dropped_reports` | | usage reports dropped (too old, or late for a window written already), per interval | each server |

### Object metrics

Every sample interval each server samples the
[custom objects](/docs/other-specifications/custom-object) of its state.

| Metric | Labels | Value |
| --- | --- | --- |
| `norca.objects.count` | `kind` | objects of the kind (`group/Kind`, for example `norca.io/NodeGroup`), in all namespaces |
| `norca.objects.degraded` | `kind` | objects of the kind whose `Degraded` condition is `True` |
| `norca.nodegroup.replicas` | `group` | nodes the [node group](/docs/features/node-scaling) wants (`spec.replicas`); no series while it is not set |
| `norca.nodegroup.ready` | `group` | ready nodes (`status.replicas`) |
| `norca.nodegroup.joining` | `group` | nodes joining (`status.joining`) |
| `norca.nodegroup.failed` | `group` | nodes that failed to join (`status.failed`) |
| `norca.nodegroup.rollout_replacing` | `group` | nodes being replaced in a rollout |
| `norca.nodegroup.rollout_outdated` | `group` | nodes a rollout still has to replace |
| `norca.nodegroup.condition` | `group`, `type` | 1 while the condition of the type (`RollBlocked`, `JoinFailing`, `ScaleDownBlocked`, `ProviderAvailable`, ...) is `True`, else 0; a series for every condition type the status has |
| `norca.lb.targets` | `ns`, `name` | healthy targets of the load balancer (`norca.io/LoadBalancer`, from the LoadBalancer operator) |
| `norca.lb.ready` | `ns`, `name` | 1 while its `Ready` condition is `True`, else 0 |

The label `group` is the name of the NodeGroup object. No series is stored per
allocation; apart from the [node metrics](#node-metrics), the number of series
grows with the namespaces, the node groups, the load balancers, the object
kinds, the backup destinations and the admission webhooks.

### Access

The history and the series list of a metric need, when ACLs are enabled:

| Metrics | ACL |
| --- | --- |
| `norca.group.*` | `read-job` in the namespace of the job |
| `norca.cluster.*`, `norca.nodes.*`, `norca.node.*` | `node:read`; `operator:read` for `norca.cluster.autopilot_*` |
| `norca.quota.*` | `quota:read` |
| `norca.sched.*`, `norca.secrets.*`, `norca.security.*`, `norca.autoscaler.*`, `norca.store.*`, `norca.objects.*` | `operator:read` |
| `norca.jobs.*` | `list-jobs` in the namespace of the label `ns` |
| `norca.backup.*` | `backup:read` |
| `norca.nodegroup.*` | `read` on the objects of `norca.io/NodeGroup` (a rule in `namespace "*"`) |
| `norca.lb.*` | `read` on the objects of `norca.io/LoadBalancer` in the namespace of the label `ns` |

Read the history, the list of series and the usage summary of a task group
(the right-sizing view: average, 95th percentile and maximum against the
allocated resources) with the [metrics store API](/docs/api/metrics-store), and
the state of the store with
[`norca operator metrics-store status`](/docs/commands/operator/metrics-store/status).

## Autoscaler

A new leader fills the usage window of the
[built-in autoscaler](/docs/configuration/autoscaler) (`metrics_window`, 5
minutes by default) from its store, so the built-in metrics do not wait one
window after a leader change. Checks whose `query_window` is longer than
`metrics_window` read the built-in metrics from the store.

The cluster gauges are the data of the [`norca`](/docs/features/autoscaler/reference/plugins/apm/norca) source: a check with `source = "norca"` scales a job on the allocated or used share of a datacenter and node pool (and node class).

## High availability

Every server stores every report: the telemetry stream of the bus keeps the
reports for an hour, so a server that restarts catches up on what it missed in
that time. A server that was down for longer has a gap; a request can read the
history of another server with `server_id`.
