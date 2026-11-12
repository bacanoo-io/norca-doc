---
title: "metrics_store Block"
linkTitle: "metrics_store"
description: "The \"metrics_store\" block configures the history of the task group usage, the nodes, the cluster, the control plane, the server internals and the custom objects that every server keeps."
---

**Placement:** `server -> metrics_store`

The `metrics_store` block configures the history of the CPU and memory usage
of the task groups and of the nodes, of the capacity of the cluster, of the
scheduler and the control plane, of the Raft log and the system bus of each
server, and of the custom objects. The clients
publish their usage on
the [system bus](/docs/features/system-bus#task-group-usage); every server
reads every report, samples the rest itself, and keeps the history in its
data directory, in an embedded time-series store. **The history is never
written to Raft and is not part of the backups.**

The store has two parts, each with its own retention and disk cap:

- the main store (`[data_dir]/server/tsdb`): the task groups, the cluster,
  the quotas, the scheduler and the control plane, and the custom objects;
  `retention` and `max_disk_size`.
- the hosts store (`[data_dir]/server/tsdb-hosts`): the
  [node metrics](#node-metrics) (`norca.node.*`) and the
  [server metrics](#server-metrics) (`norca.server.*`, `norca.bus.*`), the
  largest and the least needed far back; `host_retention` and
  `host_max_disk_size`.

A query reads the part that keeps its metric; `max_series` covers both.

**The store is enabled by default on servers.** It needs the
[system bus](/docs/configuration/bus): **without the bus the clients report no
usage and nothing is stored.** While the store or the
[built-in autoscaler](/docs/configuration/autoscaler) is enabled, the servers
ask the clients for their usage.

```hcl
server {
  metrics_store {
    enabled            = true
    retention          = "30d"
    host_retention     = "7d"
    partition_duration = "6h"
    sample_interval    = "30s"
    max_disk_size      = "4GiB"
    host_max_disk_size = "1GiB"
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
  optionally followed by a duration (`"7d"`, `"1d12h"`).
  - The store drops a
    whole partition once the retention has passed since the partition was
    written to disk, so **the oldest point can be up to two partitions older than
    the retention.**
  - A [reload](#reload) applies a new retention without a
    restart.
  - It applies to the main store; the hosts store has
    `host_retention`.

- `host_retention` `(string: "7d")` - How long the points of the hosts store
  are kept: the [node metrics](#node-metrics) and the
  [server metrics](#server-metrics). The same range and forms as `retention`
  (`1h` to `30d`, `"168h"` or `"7d"`), and the same way of dropping whole
  partitions. A [reload](#reload) applies it without a restart.

- `partition_duration` `(string: "6h")` - The time range of a partition, in
  both stores.
  - The points of the two newest partitions are kept in memory and
    in a write-ahead log, the older ones in compressed files mapped into memory.
  - **A report older than one partition before the newest one is dropped.**
  - It must
    not be longer than `retention` nor `host_retention`; without it, a retention
    shorter than six hours sets the partition to the shorter retention
    (`retention = "2h"` gives two-hour partitions).

- `sample_interval` `(string: "30s")` - The resolution of the history. The
  reports of an interval are combined into one point per task group: the
  averages weighted by the number of samples, and the largest maximum.

- `max_disk_size` `(string: "4GiB")` - The disk cap of the main store. **Above
  it the oldest partitions of the main store are removed first, whatever
  their age.** A [reload](#reload) applies it without a restart.

- `host_max_disk_size` `(string: "1GiB")` - The disk cap of the hosts store,
  enforced the same way on the partitions of the hosts store only. With the
  defaults the two stores take at most 5 GiB. A [reload](#reload) applies it
  without a restart.

- `max_series` `(int: 50000)` - The largest number of series, of both stores
  together. Every task group has 28 series (the average and the maximum of 14
  metrics), every series of the other metrics counts 2 (a node has up to 7,
  so 14); **the series beyond the limit are not stored.** A series without a
  point within the retention of its store no longer counts (see
  [Forgotten series](#forgotten-series)). A [reload](#reload) applies it to
  new series.

- `wal_buffered_size` `(int: 4096)` - The bytes the write-ahead log buffers
  before it writes them: `0` writes every point, `-1` disables the log, so
  **the newest points are lost when the server stops abruptly.**

## Reload

A configuration reload of the agent (`SIGHUP`) applies five settings to the
running store, without a restart:

- `retention` and `host_retention`, each to its own store: a shorter
  retention removes the partitions now past it at once; a longer one keeps
  what is still on disk longer. **What was already removed does not come back.**
- `max_disk_size` and `host_max_disk_size`, each to its own store: applied at
  the next maintenance of the store, within a minute.
- `max_series`: applies to new series; the series stored already stay.

`partition_duration`, `sample_interval` and `wal_buffered_size` shape the
files and the sampling: **a reload that changes them logs a warning and keeps
the running values until the next restart.** Turning the store on or off with
`enabled` also needs a restart. A reload with an invalid block (a retention
outside `1h` to `30d`, or a `partition_duration` longer than a retention)
changes nothing and logs the error.

Each server has its own store and its own configuration: **give the servers of
a region the same retentions and disk caps**, so that they answer the same
query with the same range. The [deployer](/docs/deployer/configuration#metrics_store)
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
| `norca.group.memory_swap_mb` | MiB of swap in use; only from the drivers that measure it, see below | clients |
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

`norca.group.memory_swap_mb` is the swap alone, without the memory: the
`exec` and `java` drivers report the swap of the task's cgroup
(`memory.swap.current` on cgroups v2, `memsw` minus the memory on v1), `exec2`
`memory.swap.current`, `raw_exec` the swap of the task's processes, and
`docker` the swap of the container on cgroups v1. **`docker` on cgroups v2 does
not measure the swap:** its task groups have no points of this metric rather
than a zero. A kernel without swap accounting (cgroups v2 without
`memory.swap.current`) reports zero.

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
| `norca.cluster.autopilot_voters` | | voters in the Raft configuration; stored by the leader only |
| `norca.cluster.autopilot_standbys_ready` | | [standby servers](/docs/configuration/server#role) ready for a promotion (healthy, without a vote); stored by the leader only |
| `norca.cluster.autopilot_standby_promotions` | | standby promotions the leader saw since it became the leader; stored by the leader only |
| `norca.cluster.autopilot_standby_demotions` | | promoted standbys that stepped back, since the leader became the leader; stored by the leader only |
| `norca.quota.cpu_mhz_allocated` | `quota` | MHz of the allocations of the namespaces of the quota in the region |
| `norca.quota.cpu_mhz_used` | `quota` | MHz they actually use |
| `norca.quota.memory_mb_allocated` | `quota` | MiB of the allocations |
| `norca.quota.memory_mb_used` | `quota` | MiB they actually use |

The label `class` is the node class. The series with `class` empty covers all the nodes of the datacenter and node pool, whatever their class; every node class that is set has a series of its own with the nodes of that class only. A series counts 2 towards `max_series`, so a node class adds six series per datacenter and pool.

The `used` values come from the clients' usage reports: **a node whose latest
report is older than two report intervals counts as using nothing.**

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

- The labels are `node` (the node ID), `dc`, `pool` and `class`. The server
  takes the datacenter, node pool and node class from the node in its state, not
  from the report; the report of a node the state does not know is not stored.
- The node metrics are kept in the hosts store, for `host_retention` (7 days by
  default) within `host_max_disk_size`.
- A node has up to 14 series (7 metrics):
  7 days of them take about 0.3 GB per 1 000 nodes, 30 days about 1.2 GB, so
  **with many nodes or a longer `host_retention` plan `host_max_disk_size` and
  `max_series` for them;** the series of a node that is gone are
  [forgotten](#forgotten-series) after `host_retention`.
- A client with
  [`usage`](/docs/configuration/client) disabled or off the bus reports no
  statistics of its host either.
- **The statistics of devices (GPUs) are not
  stored.**

### Volume metrics

The clients report the usage of the CSI volumes their node plugins have
published, as the plugins answer `NodeGetVolumeStats` (every
[`stats_interval`](/docs/job-specification/csi_plugin#stats_interval) of the
plugin, one minute by default), with their usage report. Only plugins with
the `GET_VOLUME_STATS` capability report usage, only plugins with
`VOLUME_CONDITION` a condition.

| Metric | Value |
| --- | --- |
| `norca.volume.used_bytes` | bytes used on the volume |
| `norca.volume.available_bytes` | bytes available |
| `norca.volume.capacity_bytes` | bytes in total |
| `norca.volume.inodes_used` | inodes used |
| `norca.volume.inodes_free` | inodes free |
| `norca.volume.abnormal` | 1 while the plugin reports the volume abnormal, else 0 |

- The labels are `ns`, `volume` (the volume ID), `plugin` and `node` (the node
  ID). A server stores a value only for a volume the node has a claim on, with
  the plugin of the volume.
- A value the plugin does not report (for example inodes of a block volume) has
  no series.
- A published volume has up to 12 series (6 metrics) per node.

### CSI capacity metrics

The leader asks the controllers of the CSI plugins with `GET_CAPACITY` for the
capacity of their storage every
[`capacity_interval`](/docs/job-specification/csi_plugin#capacity_interval) of
the plugin (five minutes by default). Only the metrics store of the leader
has these series.

| Metric | Value |
| --- | --- |
| `norca.csi.capacity_available_bytes` | bytes available for new volumes |
| `norca.csi.maximum_volume_size_bytes` | the largest size of a volume, when the plugin reports it |
| `norca.csi.minimum_volume_size_bytes` | the smallest size of a volume, when the plugin reports it |

- The labels are `plugin` and `topology`: empty for the whole storage, else the
  topology segment of the nodes as sorted `key=value` pairs joined by commas.
- An answer with an error has no point.

### Scheduler and control plane metrics

Every sample interval each server also samples the scheduler and the control
plane. What only the leader has (the eval broker, the plan queue, the blocked
evaluations, the heartbeats, the secrets watchers and the autoscaler) is
**stored by the leader only:** after a leader change the history continues in the
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
| `norca.backup.taken_by_observer` | | backups an observer took for the leader ([`prefer_observer`](/docs/configuration/backup)), per interval | each server |
| `norca.security.certificates_issued` | | workload certificates issued by the [mTLS](/docs/configuration/mtls) certificate authority, per interval | each server |
| `norca.security.admission_denied` | | jobs and variables denied by [admission control](/docs/configuration/admission), per interval | each server |
| `norca.security.webhook_calls` | `webhook` | calls to the admission webhook, per interval | each server |
| `norca.security.webhook_errors` | `webhook` | failed calls to the admission webhook, per interval | each server |
| `norca.autoscaler.queue` | | scaling policies waiting for an evaluation; while the [built-in autoscaler](/docs/configuration/autoscaler) runs | leader |
| `norca.autoscaler.policies` | | scaling policies of the autoscaler | leader |
| `norca.autoscaler.oscillation_suspended` | | targets this leader suspended for oscillating, while suspended | leader |
| `norca.store.disk_bytes` | | disk use of the metrics store, the main and the hosts store together, in bytes | each server |
| `norca.store.series` | | series of the metrics store | each server |
| `norca.store.dropped_reports` | | usage reports dropped (too old, or late for a window written already), per interval | each server |

### Server metrics

Every sample interval each server also samples its own Raft log and
replication, its RPC requests and its own
[system bus](/docs/configuration/bus) into its own store.

- The series have no
  `server` label: **the store of a server holds the values of that server only.**
  To see the history of one server, send the
  [history request](/docs/api/metrics-store#read-history) to it, or to any
  server with `server_id` set to it.
- Only `raft_append_entries_seconds` has a
  label, `peer`: the Raft server ID of the follower the leader sent the
  requests to.
- A server has 11 series of its own and, while it is the leader,
  one more for every other server: with 3 servers up to 13 series, which count
  26 towards `max_series` (a series counts 2).
- The server metrics are kept in
  the hosts store, for `host_retention` (7 days by default) within
  `host_max_disk_size`. The `peer` series of a server that left, or that the
  server no longer leads, are [forgotten](#forgotten-series) after
  `host_retention`.

| Metric | Value |
| --- | --- |
| `norca.server.raft_db_bytes` | bytes the Raft log store takes on disk, with either [`raft_store`](/docs/configuration/server): all the files of the Badger database (`badger`), or the file `raft.db` with its free pages (`boltdb`). Where the file system reports the blocks in use (Linux and the other Unix systems), it counts those, so the space both stores reserve ahead of the data does not count until it is written; on Windows it counts the length of the files. No series for a server in dev mode, whose Raft log is in memory |
| `norca.server.raft_last_contact_seconds` | seconds since the server last heard from the leader; 0 on the leader, no point on a server that never heard from one |
| `norca.server.raft_commit_lag` | committed Raft entries the server has not applied yet (commit index minus applied index); 0 when the applied index is ahead, as right after a restart |
| `norca.server.raft_fsm_pending` | batches of entries waiting for the state machine |
| `norca.server.raft_term` | the current Raft term; it rises with every election |
| `norca.server.raft_commit_seconds` | mean seconds from the moment the leader appends an entry until a quorum of servers stored it (committed), over the sample interval; only on the leader, and no point in an interval without a commit |
| `norca.server.raft_append_entries_seconds` (label `peer`) | mean seconds of the AppendEntries requests of the leader to the follower `peer` (log replication; the heartbeats are not counted), over the sample interval; only on the leader |
| `norca.server.rpc_requests` | RPC requests the server handled in the sample interval: from clients, other servers and the CLI over its RPC port, and in process from the HTTP API of its own agent and from the server itself |
| `norca.server.rpc_errors` | those of them answered with an error (permission denied and invalid requests included), or that failed on the connection, in the sample interval |
| `norca.bus.jetstream_bytes` | bytes of the JetStream streams the server stores a replica of; no point while JetStream does not run |
| `norca.bus.jetstream_messages` | messages of those streams |
| `norca.bus.routes` | other servers of the region the bus has a route to (counted by server, not by connection); 0 for a single server |

#### Reading the server metrics

- On a follower `raft_last_contact_seconds` grows between the heartbeats of the
  leader and is usually well below a second; **a value that keeps rising means the
  server lost the leader.**
- **A `raft_commit_lag` or `raft_fsm_pending` that stays
  above zero means the state machine of the server falls behind.**
- A
  `raft_commit_seconds` that rises with one `raft_append_entries_seconds` points
  at a slow follower or the network to it; one that rises with all of them at
  the disk or the load of the leader.
- The bus values are totals over the
  streams, not per stream: a token with full rights on the bus can create
  streams of its own, so their number has no bound.

#### Sources of the Raft times and RPC counts

The two Raft times come from the agent's own
[telemetry](/docs/configuration/telemetry), the same values the
[metrics API](/docs/api/metrics) shows as `nomad.raft.commitTime` and
`nomad.raft.replication.appendEntries.rpc` (in milliseconds there): **a
[`prefix_filter`](/docs/configuration/telemetry) that blocks them leaves these
series without points.** The telemetry keeps the last minute, so with a
`sample_interval` above 50 seconds the mean covers the last 50 seconds of the
interval. The RPC counts are kept by the server itself, whatever the
telemetry; unlike `nomad.rpc.request`, which counts the requests over the RPC
port only, they include the requests in process, and they count a request
answered with an error as an error.

### Object metrics

Every sample interval each server samples the
[custom objects](/docs/other-specifications/custom-object) of its state.

| Metric | Labels | Value |
| --- | --- | --- |
| `norca.objects.count` | `kind` | objects of the kind (`group/Kind`, for example `norca.io/NodeGroup`), in all namespaces |
| `norca.objects.degraded` | `kind` | objects of the kind whose `Degraded` condition is `True` |
| `norca.nodegroup.replicas` | `group` | nodes the [node group](/docs/features/node-scaling) wants (`spec.replicas`); no series while it is not set |
| `norca.nodegroup.ready` | `group` | ready nodes (`status.replicas`) |
| `norca.nodegroup.nodes_ready` | `group` | ready, eligible nodes that name the group in their meta (`norca.node_group`); zero while its nodes are down, no series for a group no node names |
| `norca.nodegroup.cpu_allocated`, `norca.nodegroup.memory_allocated` | `group` | the allocated share of the CPU and of the memory of those nodes, in percent. **Node scaling measures a group on these**, not on the cluster gauges of its datacenter and pool, which other groups and nodes no group made share |
| `norca.nodegroup.joining` | `group` | nodes joining (`status.joining`) |
| `norca.nodegroup.failed` | `group` | nodes that failed to join (`status.failed`) |
| `norca.nodegroup.rollout_replacing` | `group` | nodes being replaced in a rollout |
| `norca.nodegroup.rollout_outdated` | `group` | nodes a rollout still has to replace |
| `norca.nodegroup.condition` | `group`, `type` | 1 while the condition of the type (`RollBlocked`, `JoinFailing`, `ScaleDownBlocked`, `ProviderAvailable`, ...) is `True`, else 0; a series for every condition type the status has |
| `norca.nodegroup.cert_expires_min_hours` | `group` | hours until the earliest node certificate of the group expires: of the nodes that are not down and name the group in their meta `norca.node_group`, from their meta `norca.cert_expires`; 0 once a certificate has expired. No point for a group without such nodes, as one whose nodes renew their certificate themselves (`norca-join`) |
| `norca.lb.targets` | `ns`, `name` | healthy targets of the load balancer (`norca.io/LoadBalancer`, from the LoadBalancer operator) |
| `norca.lb.ready` | `ns`, `name` | 1 while its `Ready` condition is `True`, else 0 |

The label `group` is the name of the NodeGroup object. **No series is stored per
allocation;** apart from the [node metrics](#node-metrics), the number of series
grows with the namespaces, the node groups, the load balancers, the object
kinds, the backup destinations, the admission webhooks and the published CSI
volumes.

### Access

The history and the series list of a metric need, when ACLs are enabled:

| Metrics | ACL |
| --- | --- |
| `norca.group.*` | `read-job` in the namespace of the job |
| `norca.cluster.*`, `norca.nodes.*`, `norca.node.*` | `node:read`; `operator:read` for `norca.cluster.autopilot_*` |
| `norca.quota.*` | `quota:read` |
| `norca.sched.*`, `norca.secrets.*`, `norca.security.*`, `norca.autoscaler.*`, `norca.store.*`, `norca.server.*`, `norca.bus.*`, `norca.objects.*` | `operator:read` |
| `norca.jobs.*` | `list-jobs` in the namespace of the label `ns` |
| `norca.backup.*` | `backup:read` |
| `norca.nodegroup.*` | `read` on the objects of `norca.io/NodeGroup` (a rule in `namespace "*"`) |
| `norca.lb.*` | `read` on the objects of `norca.io/LoadBalancer` in the namespace of the label `ns` |
| `norca.volume.*` | `csi-read-volume` in the namespace of the label `ns` |
| `norca.csi.*` | `plugin:read` |

Read the history, the list of series and the usage summary of a task group
(the right-sizing view: average, 95th percentile and maximum against the
allocated resources) with the [metrics store API](/docs/api/metrics-store), and
the state of the store with
[`norca operator metrics-store status`](/docs/commands/operator/metrics-store/status).

### Forgotten series

A series (of a task group, a node or another metric) without a point within
the retention of its store (`host_retention` for the node and server
metrics, `retention` for the others) leaves the list of the series: **it no
longer counts toward**
`max_series` and is no longer in the [series list](/docs/api/metrics-store#list-series),
so the series of nodes, jobs and objects that are gone make room for new ones.
The store checks every minute; a series whose newest point is not written
yet stays. Its old points stay on disk until their partition expires. A
forgotten series that gets a point again, a node that reports again for
example, starts again. The status of the store counts the forgotten series
(`Forgotten Series`, as they counted toward `max_series`).

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
history of another server with `server_id`. The [server metrics](#server-metrics)
are the exception: each server has only its own.
