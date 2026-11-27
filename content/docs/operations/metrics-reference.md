---
title: "Metrics Reference"
description: "Learn about the different metrics available in Norca."
upstream:
  path: "website/content/docs/operations/metrics-reference.mdx"
---

The Norca agent collects various runtime metrics about the performance of
different libraries and subsystems. These metrics are aggregated on a ten
second interval and are retained for one minute.

This data can be accessed via an HTTP endpoint or via sending a signal to the
Norca process. This data is available via HTTP at `/metrics`. See
[Metrics](/docs/api/metrics/) for more information.

To view this data via sending a signal to the Norca process: on Unix,
this is `USR1` while on Windows it is `BREAK`. Once Norca receives the signal,
it will dump the current telemetry information to the agent's `stderr`.

This telemetry information can be used for debugging or otherwise
getting a better view of what Norca is doing.

Telemetry information can be streamed to both [statsite](https://github.com/armon/statsite)
as well as statsd based on providing the appropriate configuration options.

To configure the telemetry output please see the [agent
configuration](/docs/configuration/telemetry/).

Below is sample output of a telemetry dump:

```text
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.server.broker.total_pending': 0.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.server.plan.queue_depth': 0.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.runtime.malloc_count': 7568.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.runtime.total_gc_runs': 8.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.server.broker.total_ready': 0.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.runtime.num_goroutines': 56.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.runtime.sys_bytes': 3999992.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.runtime.heap_objects': 4135.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.server.heartbeat.active': 1.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.server.broker.total_unacked': 0.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.server.broker.total_waiting': 0.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.runtime.alloc_bytes': 634056.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.runtime.free_count': 3433.000
[2015-09-17 16:59:40 -0700 PDT][G] 'norca.runtime.total_gc_pause_ns': 6572135.000
[2015-09-17 16:59:40 -0700 PDT][C] 'norca.memberlist.msg.alive': Count: 1 Sum: 1.000
[2015-09-17 16:59:40 -0700 PDT][C] 'norca.serf.member.join': Count: 1 Sum: 1.000
[2015-09-17 16:59:40 -0700 PDT][C] 'norca.raft.barrier': Count: 1 Sum: 1.000
[2015-09-17 16:59:40 -0700 PDT][C] 'norca.raft.apply': Count: 1 Sum: 1.000
[2015-09-17 16:59:40 -0700 PDT][C] 'norca.server.rpc.query': Count: 2 Sum: 2.000
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.serf.queue.Query': Count: 6 Sum: 0.000
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.server.fsm.register_node': Count: 1 Sum: 1.296
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.serf.queue.Intent': Count: 6 Sum: 0.000
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.runtime.gc_pause_ns': Count: 8 Min: 126492.000 Mean: 821516.875 Max: 3126670.000 Stddev: 1139250.294 Sum: 6572135.000
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.raft.leader.dispatchLog': Count: 3 Min: 0.007 Mean: 0.018 Max: 0.039 Stddev: 0.018 Sum: 0.054
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.server.leader.reconcileMember': Count: 1 Sum: 0.007
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.server.leader.reconcile': Count: 1 Sum: 0.025
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.raft.fsm.apply': Count: 1 Sum: 1.306
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.server.client.get_allocs': Count: 1 Sum: 0.110
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.server.worker.dequeue_eval': Count: 29 Min: 0.003 Mean: 363.426 Max: 503.377 Stddev: 228.126 Sum: 10539.354
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.serf.queue.Event': Count: 6 Sum: 0.000
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.raft.commitTime': Count: 3 Min: 0.013 Mean: 0.037 Max: 0.079 Stddev: 0.037 Sum: 0.110
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.server.leader.barrier': Count: 1 Sum: 0.071
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.server.client.register': Count: 1 Sum: 1.626
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.server.eval.dequeue': Count: 21 Min: 500.610 Mean: 501.753 Max: 503.361 Stddev: 1.030 Sum: 10536.813
[2015-09-17 16:59:40 -0700 PDT][S] 'norca.memberlist.gossip': Count: 12 Min: 0.009 Mean: 0.017 Max: 0.025 Stddev: 0.005 Sum: 0.204
```

### Metric Types

| Type    | Description                                                                                                         | Quantiles |
| ------- | ------------------------------------------------------------------------------------------------------------------- | --------- |
| Gauge   | Gauge types report an absolute number at the end of the aggregation interval                                        | false     |
| Counter | Counts are incremented and flushed at the end of the aggregation interval and then are reset to zero                | true      |
| Timer   | Timers measure the time to complete a task and will include quantiles, means, standard deviation, etc per interval. | true      |

### Tagged Metrics

Norca emits metrics in a tagged format. Each metric can support more than one
tag, meaning that it is possible to do a match over metrics for datapoints
such as a particular datacenter, and return all metrics with this tag. Norca
supports labels for namespaces as well.

## Key Metrics

The metrics in the table below are the most important metrics for monitoring
the overall health of a Norca cluster.

When telemetry is being streamed to statsite or statsd, `interval` in the
table below is defined to be their flush interval. Otherwise, the interval can
be assumed to be 10 seconds when retrieving metrics using the above described
signals.

| Metrics                                      | Description                                                                                                                                                                                                       | Unit                           | Type    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------------ | ------- |
| `norca.runtime.alloc_bytes`                  | Memory utilization                                                                                                                                                                                                | # of bytes                     | Gauge   |
| `norca.runtime.heap_objects`                 | Number of objects on the heap. General memory pressure indicator                                                                                                                                                  | # of heap objects              | Gauge   |
| `norca.runtime.num_goroutines`               | Number of goroutines and general load pressure indicator                                                                                                                                                          | # of goroutines                | Gauge   |
| `norca.server.broker.total_pending`           | Evaluations that are pending until an existing evaluation for the same job completes                                                                                                                              | # of evaluations               | Gauge   |
| `norca.server.broker.total_ready`             | Number of evaluations ready to be processed                                                                                                                                                                       | # of evaluations               | Gauge   |
| `norca.server.broker.total_unacked`           | Evaluations dispatched for processing but incomplete                                                                                                                                                              | # of evaluations               | Gauge   |
| `norca.server.heartbeat.active`               | Number of active heartbeat timers. Each timer represents a Norca Client connection                                                                                                                                | # of heartbeat timers          | Gauge   |
| `norca.server.heartbeat.invalidate`           | The length of time it takes to invalidate a Norca Client due to failed heartbeats                                                                                                                                 | ms / Heartbeat Invalidation    | Timer   |
| `norca.server.plan.evaluate`                  | Time to validate a scheduler Plan. Higher values cause lower scheduling throughput. Similar to `norca.server.plan.submit` but does not include RPC time or time in the Plan Queue                                        | ms / Plan Evaluation           | Timer   |
| `norca.server.plan.node_rejected`             | Number of times a node has had a plan rejected. A node with a high rate of rejections may have an underlying issue causing it to be unschedulable. Refer to [Plan rejection tracker](/docs/operations/monitoring-nomad#plan-rejection-tracker) for more information | # of rejected plans            | Counter |
| `norca.server.plan.queue_depth`               | Number of scheduler Plans waiting to be evaluated                                                                                                                                                                 | # of plans                     | Gauge   |
| `norca.server.plan.submit`                    | Time to submit a scheduler Plan. Higher values cause lower scheduling throughput                                                                                                                                  | ms / Plan Submit               | Timer   |
| `norca.server.rpc.query`                      | Number of RPC queries                                                                                                                                                                                             | RPC Queries / `interval`       | Counter |
| `norca.server.rpc.request_error`              | Number of RPC requests being handled that result in an error                                                                                                                                                      | RPC Errors / `interval`        | Counter |
| `norca.server.rpc.request`                    | Number of RPC requests being handled                                                                                                                                                                              | RPC Requests / `interval`      | Counter |
| `norca.server.vault.token_last_renewal`       | Time since last successful Vault token renewal                                                                                                                                                                    | Milliseconds                   | Gauge   |
| `norca.server.vault.token_next_renewal`       | Time until next Vault token renewal attempt                                                                                                                                                                       | Milliseconds                   | Gauge   |
| `norca.server.worker.invoke_scheduler.<type>` | Time to run the scheduler of the given type                                                                                                                                                                       | ms / Scheduler Run             | Timer   |
| `norca.server.worker.wait_for_index`          | Time waiting for Raft log replication from leader. High delays result in lower scheduling throughput                                                                                                              | ms / Raft Index Wait           | Timer   |
| `norca.raft.apply`                           | Number of Raft transactions                                                                                                                                                                                       | Raft transactions / `interval` | Counter |
| `norca.raft.leader.lastContact`              | Time since last contact to leader. General indicator of Raft latency                                                                                                                                              | ms / Leader Contact            | Timer   |
| `norca.raft.replication.appendEntries`       | Raft transaction commit time                                                                                                                                                                                      | ms / Raft Log Append           | Timer   |

## Client Metrics

The Norca client emits metrics related to the resource usage of the allocations
and tasks running on it and the node itself. **Operators have to explicitly turn
on publishing host and allocation metrics.** Publishing allocation and host
metrics can be turned on by setting the value of `publish_allocation_metrics`
and `publish_node_metrics` to `true`.

By default the collection interval is 1 second but it can be changed by
changing the value of the `collection_interval` key in the `telemetry`
configuration block.

Please see the [agent configuration](/docs/configuration/telemetry/)
page for more details.

Additional labels are emitted for [parameterized](/docs/job-specification/parameterized/) and
[periodic](/docs/job-specification/periodic/) jobs. Norca
emits the parent job id as a new label `parent_id`. Also, the labels `dispatch_id`
and `periodic_id` are emitted, containing the ID of the specific invocation of the
parameterized or periodic job respectively. For example, a dispatch job with the id
`myjob/dispatch-1312323423423`, will have the following labels.

| Label       | Value                          |
| ----------- | ------------------------------ |
| job         | `myjob/dispatch-1312323423423` |
| parent_id   | `myjob`                        |
| dispatch_id | `1312323423423`                |

## Host Metrics

Norca will emit [tagged metrics][tagged-metrics], in the below format:

| Metric                                    | Description                                                                          | Unit       | Type    | Labels                                                                                           |
|-------------------------------------------|--------------------------------------------------------------------------------------|------------|---------|--------------------------------------------------------------------------------------------------|
| `norca.client.allocated.cpu`              | Total amount of CPU shares the scheduler has allocated to tasks                      | Mhz        | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.allocated.memory`           | Total amount of memory the scheduler has allocated to tasks                          | Megabytes  | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.allocated.disk`             | Total amount of disk space the scheduler has allocated to tasks                      | Megabytes  | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.allocations.blocked`        | Number of allocations waiting for previous versions to exit                          | Integer    | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.allocations.migrating`      | Number of allocations migrating data from previous versions (see [`sticky`][sticky]) | Integer    | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.allocations.pending`        | Number of allocations pending (received by the client but not yet running)           | Integer    | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.allocations.running`        | Number of allocations running                                                        | Integer    | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.allocations.start`          | Number of allocations starting                                                       | Integer    | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.allocations.terminal`       | Number of allocations terminal                                                       | Integer    | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.allocs.oom_killed`          | Number of allocations OOM killed                                                     | Integer    | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.host.cpu.idle`              | CPU utilization in idle state                                                        | Percentage | Gauge   | cpu, datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status  |
| `norca.client.host.cpu.system`            | CPU utilization in system space                                                      | Percentage | Gauge   | cpu, datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status  |
| `norca.client.host.cpu.total_percent`     | Total CPU utilization in percentage                                                  | Percentage | Gauge   | cpu, datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status  |
| `norca.client.host.cpu.total_ticks`       | Total CPU utilization in ticks                                                       | Integer    | Gauge   | cpu, datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status  |
| `norca.client.host.cpu.total_ticks_count` | Total CPU utilization in ticks since startup                                         | Integer    | Counter | cpu, datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status  |
| `norca.client.host.cpu.user`              | CPU utilization in user space                                                        | Percentage | Gauge   | cpu, datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status  |
| `norca.client.host.disk.available`        | Amount of space which is available                                                   | Bytes      | Gauge   | datacenter, disk, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status |
| `norca.client.host.disk.inodes_percent`   | Disk space consumed by the inodes                                                    | Percentage | Gauge   | datacenter, disk, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status |
| `norca.client.host.disk.size`             | Total size of the device                                                             | Bytes      | Gauge   | datacenter, disk, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status |
| `norca.client.host.disk.used_percent`     | Percentage of disk space used                                                        | Percentage | Gauge   | datacenter, disk, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status |
| `norca.client.host.disk.used`             | Amount of space which has been used                                                  | Bytes      | Gauge   | datacenter, disk, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status |
| `norca.client.host.memory.available`      | Total amount of memory available to processes which includes free and cached memory  | Bytes      | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.host.memory.free`           | Amount of memory which is free                                                       | Bytes      | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.host.memory.total`          | Total amount of physical memory on the node                                          | Bytes      | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.host.memory.used`           | Amount of memory used by processes                                                   | Bytes      | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.unallocated.cpu`            | Total amount of CPU shares free for the scheduler to allocate to tasks               | Mhz        | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.unallocated.disk`           | Total amount of disk space free for the scheduler to allocate to tasks               | Megabytes  | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.unallocated.memory`         | Total amount of memory free for the scheduler to allocate to tasks                   | Megabytes  | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |
| `norca.client.uptime`                     | Uptime of the host running the Norca client                                          | Seconds    | Gauge   | datacenter, host, node_class, node_id, node_pool, node_scheduling_eligibility, node_status       |

## Allocation Metrics

The following metrics are emitted for each allocation if allocation metrics
are enabled.

> [!NOTE]
> Note that allocation metrics available may be dependent on factors
> such as the task driver and control group (cgroup) version in use.

| Metric                                        | Description                                                       | Unit        | Type    | Labels                                           |
|-----------------------------------------------|-------------------------------------------------------------------|-------------|---------|--------------------------------------------------|
| `norca.client.allocs.complete`                | Number of complete allocations                                    | Integer     | Counter | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.cpu.allocated`           | Total CPU resources allocated by the task across all cores        | MHz         | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.cpu.system`              | Total CPU resources consumed by the task in system space          | Percentage  | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.cpu.throttled_periods`   | Total number of CPU periods that the task was throttled           | Nanoseconds | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.cpu.throttled_time`      | Total time that the task was throttled                            | Nanoseconds | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.cpu.total_percent`       | Total CPU resources consumed by the task across all cores         | Percentage  | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.cpu.total_ticks`         | CPU ticks consumed by the process in the last collection interval | Integer     | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.cpu.total_ticks_count`   | Total CPU ticks consumed by the task since startup                | Integer     | Counter | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.cpu.user`                | Total CPU resources consumed by the task in the user space        | Percentage  | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.failed`                  | Number of failed allocations                                      | Integer     | Counter | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.memory.allocated`        | Amount of memory allocated by the task                            | Bytes       | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.memory.cache`            | Amount of memory cached by the task                               | Bytes       | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.memory.kernel_max_usage` | Maximum amount of memory ever used by the kernel for this task    | Bytes       | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.memory.kernel_usage`     | Amount of memory used by the kernel for this task                 | Bytes       | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.memory.max_allocated`    | Maximum amount of oversubscription memory allocated by the task   | Bytes       | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.memory.max_usage`        | Maximum amount of memory ever used by the task                    | Bytes       | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.memory.rss`              | Amount of RSS memory consumed by the task                         | Bytes       | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.memory.swap`             | Amount of memory swapped by the task                              | Bytes       | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.memory.usage`            | Total amount of memory used by the task                           | Bytes       | Gauge   | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.oom_killed`              | Number of oom-killed allocations                                  | Integer     | Counter | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.restart`                 | Number of task restarts                                           | Integer     | Counter | alloc_id, host, job, namespace, task, task_group |
| `norca.client.allocs.running`                 | Number of running allocations                                     | Integer     | Counter | alloc_id, host, job, namespace, task, task_group |

## Job Summary Metrics

Job summary metrics are emitted by the Norca leader server.

| Metric                             | Description                              | Unit    | Type  | Labels                           |
| ---------------------------------- | ---------------------------------------- | ------- | ----- | -------------------------------- |
| `norca.server.job_summary.complete` | Number of complete allocations for a job | Integer | Gauge | host, job, namespace, task_group |
| `norca.server.job_summary.failed`   | Number of failed allocations for a job   | Integer | Gauge | host, job, namespace, task_group |
| `norca.server.job_summary.lost`     | Number of lost allocations for a job     | Integer | Gauge | host, job, namespace, task_group |
| `norca.server.job_summary.unknown`  | Number of unknown allocations for a job  | Integer | Gauge | host, job, namespace, task_group |
| `norca.server.job_summary.queued`   | Number of queued allocations for a job   | Integer | Gauge | host, job, namespace, task_group |
| `norca.server.job_summary.running`  | Number of running allocations for a job  | Integer | Gauge | host, job, namespace, task_group |
| `norca.server.job_summary.starting` | Number of starting allocations for a job | Integer | Gauge | host, job, namespace, task_group |

## Job Status Metrics

Job status metrics are emitted by the Norca leader server.

| Metric                           | Description            | Unit    | Type  | Labels |
| -------------------------------- | ---------------------- | ------- | ----- | ------ |
| `norca.server.job_status.dead`    | Number of dead jobs    | Integer | Gauge | host   |
| `norca.server.job_status.pending` | Number of pending jobs | Integer | Gauge | host   |
| `norca.server.job_status.running` | Number of running jobs | Integer | Gauge | host   |

## Server Metrics

The following table includes metrics for overall cluster health in addition to
those listed in [Key Metrics](#key-metrics) above.

| Metric                                               | Description                                                                    | Unit                 | Type    | Labels                                                  |
|------------------------------------------------------|--------------------------------------------------------------------------------|----------------------|---------|---------------------------------------------------------|
| `norca.memberlist.gossip`                            | Time elapsed to broadcast gossip messages                                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.acl.bootstrap`                          | Time elapsed for `ACL.Bootstrap` RPC call                                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.acl.delete_policies`                    | Time elapsed for `ACL.DeletePolicies` RPC call                                 | Nanoseconds          | Summary | host                                                    |
| `norca.server.acl.delete_tokens`                      | Time elapsed for `ACL.DeleteTokens` RPC call                                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.acl.get_policies`                       | Time elapsed for `ACL.GetPolicies` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.acl.get_policy`                         | Time elapsed for `ACL.GetPolicy` RPC call                                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.acl.get_token`                          | Time elapsed for `ACL.GetToken` RPC call                                       | Nanoseconds          | Summary | host                                                    |
| `norca.server.acl.get_tokens`                         | Time elapsed for `ACL.GetTokens` RPC call                                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.acl.list_policies`                      | Time elapsed for `ACL.ListPolicies` RPC call                                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.acl.list_tokens`                        | Time elapsed for `ACL.ListTokens` RPC call                                     | Nanoseconds          | Summary | host                                                    |
| `norca.server.acl.resolve_token`                      | Time elapsed for `ACL.ResolveToken` RPC call                                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.acl.upsert_policies`                    | Time elapsed for `ACL.UpsertPolicies` RPC call                                 | Nanoseconds          | Summary | host                                                    |
| `norca.server.acl.upsert_tokens`                      | Time elapsed for `ACL.UpsertTokens` RPC call                                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.alloc.exec`                             | Time elapsed to establish alloc exec                                           | Nanoseconds          | Summary | host                                                    |
| `norca.server.alloc.get_alloc`                        | Time elapsed for `Alloc.GetAlloc` RPC call                                     | Nanoseconds          | Summary | host                                                    |
| `norca.server.alloc.get_allocs`                       | Time elapsed for `Alloc.GetAllocs` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.alloc.list`                             | Time elapsed for `Alloc.List` RPC call                                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.alloc.stop`                             | Time elapsed for `Alloc.Stop` RPC call                                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.alloc.update_desired_transition`        | Time elapsed for `Alloc.UpdateDesiredTransition` RPC call                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.blocked_evals.cpu`                      | Amount of CPU shares requested by blocked evals                                | Integer              | Gauge   | datacenter, host, node_class                            |
| `norca.server.blocked_evals.memory`                   | Amount of memory requested by blocked evals                                    | Integer              | Gauge   | datacenter, host, node_class                            |
| `norca.server.blocked_evals.job.cpu`                  | Amount of CPU shares requested by blocked evals of a job                       | Integer              | Gauge   | host, job, namespace                                    |
| `norca.server.blocked_evals.job.memory`               | Amount of memory requested by blocked evals of a job                           | Integer              | Gauge   | host, job, namespace                                    |
| `norca.server.blocked_evals.total_blocked`            | Count of evals in the blocked state for any reason (cluster resource exhaustion or quota limits) | Integer | Gauge | host |
| `norca.server.blocked_evals.total_escaped`            | Count of evals that have escaped computed node classes. This indicates a scheduler optimization was skipped and is not usually a source of concern. | Integer | Gauge | host |
| `norca.server.blocked_evals.total_quota_limit`        | Count of blocked evals due to quota limits (the resources for these jobs are *not* counted in other blocked_evals metrics, except for `total_blocked`) | Integer | Gauge | host |
| `norca.server.broker.batch_ready`                     | Count of batch evals ready to be scheduled                                     | Integer              | Gauge   | host                                                    |
| `norca.server.broker.batch_unacked`                   | Count of unacknowledged batch evals                                            | Integer              | Gauge   | host                                                    |
| `norca.server.broker.eval_waiting`                    | Time elapsed with evaluation waiting to be enqueued                            | Nanoseconds          | Gauge   | eval_id, job, namespace                                 |
| `norca.server.broker.service_ready`                   | Count of service evals ready to be scheduled                                   | Integer              | Gauge   | host                                                    |
| `norca.server.broker.service_unacked`                 | Count of unacknowledged service evals                                          | Integer              | Gauge   | host                                                    |
| `norca.server.broker.system_ready`                    | Count of system evals ready to be scheduled                                    | Integer              | Gauge   | host                                                    |
| `norca.server.broker.system_unacked`                  | Count of unacknowledged system evals                                           | Integer              | Gauge   | host                                                    |
| `norca.server.broker.total_ready`                     | Count of evals in the ready state                                              | Integer              | Gauge   | host                                                    |
| `norca.server.broker.total_waiting`                   | Count of evals waiting to be enqueued                                          | Integer              | Gauge   | host                                                    |
| `norca.server.client.batch_deregister`                | Time elapsed for `Node.BatchDeregister` RPC call                               | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.deregister`                      | Time elapsed for `Node.Deregister` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.derive_si_token`                 | Time elapsed for `Node.DeriveSIToken` RPC call                                 | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.derive_vault_token`              | Time elapsed for `Node.DeriveVaultToken` RPC call                              | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.emit_events`                     | Time elapsed for `Node.EmitEvents` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.evaluate`                        | Time elapsed for `Node.Evaluate` RPC call                                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.get_allocs`                      | Time elapsed for `Node.GetAllocs` RPC call                                     | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.get_client_allocs`               | Time elapsed for `Node.GetClientAllocs` RPC call                               | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.get_node`                        | Time elapsed for `Node.GetNode` RPC call                                       | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.list`                            | Time elapsed for `Node.List` RPC call                                          | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.register`                        | Time elapsed for `Node.Register` RPC call                                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.stats`                           | Time elapsed for `Client.Stats` RPC call                                       | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.update_alloc`                    | Time elapsed for `Node.UpdateAlloc` RPC call                                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.update_drain`                    | Time elapsed for `Node.UpdateDrain` RPC call                                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.update_eligibility`              | Time elapsed for `Node.UpdateEligibility` RPC call                             | Nanoseconds          | Summary | host                                                    |
| `norca.server.client.update_status`                   | Time elapsed for `Node.UpdateStatus` RPC call                                  | Nanoseconds          | Summary | host                                                    |
| `norca.server.client_allocations.garbage_collect_all` | Time elapsed for `ClientAllocations.GarbageCollectAll` RPC call                | Nanoseconds          | Summary | host                                                    |
| `norca.server.client_allocations.garbage_collect`     | Time elapsed for `ClientAllocations.GarbageCollect` RPC call                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.client_allocations.restart`             | Time elapsed for `ClientAllocations.Restart` RPC call                          | Nanoseconds          | Summary | host                                                    |
| `norca.server.client_allocations.signal`              | Time elapsed for `ClientAllocations.Signal` RPC call                           | Nanoseconds          | Summary | host                                                    |
| `norca.server.client_allocations.stats`               | Time elapsed for `ClientAllocations.Stats` RPC call                            | Nanoseconds          | Summary | host                                                    |
| `norca.server.client_csi_controller.attach_volume`    | Time elapsed for `Controller.AttachVolume` RPC call                            | Nanoseconds          | Summary | host                                                    |
| `norca.server.client_csi_controller.detach_volume`    | Time elapsed for `Controller.DetachVolume` RPC call                            | Nanoseconds          | Summary | host                                                    |
| `norca.server.client_csi_controller.validate_volume`  | Time elapsed for `Controller.ValidateVolume` RPC call                          | Nanoseconds          | Summary | host                                                    |
| `norca.server.client_csi_node.detach_volume`          | Time elapsed for `Node.DetachVolume` RPC call                                  | Nanoseconds          | Summary | host                                                    |
| `norca.server.deployment.allocations`                 | Time elapsed for `Deployment.Allocations` RPC call                             | Nanoseconds          | Summary | host                                                    |
| `norca.server.deployment.cancel`                      | Time elapsed for `Deployment.Cancel` RPC call                                  | Nanoseconds          | Summary | host                                                    |
| `norca.server.deployment.fail`                        | Time elapsed for `Deployment.Fail` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.deployment.get_deployment`              | Time elapsed for `Deployment.GetDeployment` RPC call                           | Nanoseconds          | Summary | host                                                    |
| `norca.server.deployment.list`                        | Time elapsed for `Deployment.List` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.deployment.pause`                       | Time elapsed for `Deployment.Pause` RPC call                                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.deployment.promote`                     | Time elapsed for `Deployment.Promote` RPC call                                 | Nanoseconds          | Summary | host                                                    |
| `norca.server.deployment.reap`                        | Time elapsed for `Deployment.Reap` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.deployment.run`                         | Time elapsed for `Deployment.Run` RPC call                                     | Nanoseconds          | Summary | host                                                    |
| `norca.server.deployment.set_alloc_health`            | Time elapsed for `Deployment.SetAllocHealth` RPC call                          | Nanoseconds          | Summary | host                                                    |
| `norca.server.deployment.unblock`                     | Time elapsed for `Deployment.Unblock` RPC call                                 | Nanoseconds          | Summary | host                                                    |
| `norca.server.eval.ack`                               | Time elapsed for `Eval.Ack` RPC call                                           | Nanoseconds          | Summary | host                                                    |
| `norca.server.eval.allocations`                       | Time elapsed for `Eval.Allocations` RPC call                                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.eval.create`                            | Time elapsed for `Eval.Create` RPC call                                        | Nanoseconds          | Summary | host                                                    |
| `norca.server.eval.dequeue`                           | Time elapsed for `Eval.Dequeue` RPC call                                       | Nanoseconds          | Summary | host                                                    |
| `norca.server.eval.get_eval`                          | Time elapsed for `Eval.GetEval` RPC call                                       | Nanoseconds          | Summary | host                                                    |
| `norca.server.eval.list`                              | Time elapsed for `Eval.List` RPC call                                          | Nanoseconds          | Summary | host                                                    |
| `norca.server.eval.nack`                              | Time elapsed for `Eval.Nack` RPC call                                          | Nanoseconds          | Summary | host                                                    |
| `norca.server.eval.reap`                              | Time elapsed for `Eval.Reap` RPC call                                          | Nanoseconds          | Summary | host                                                    |
| `norca.server.eval.reblock`                           | Time elapsed for `Eval.Reblock` RPC call                                       | Nanoseconds          | Summary | host                                                    |
| `norca.server.eval.update`                            | Time elapsed for `Eval.Update` RPC call                                        | Nanoseconds          | Summary | host                                                    |
| `norca.server.file_system.list`                       | Time elapsed for `FileSystem.List` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.file_system.logs`                       | Time elapsed to establish `FileSystem.Logs` RPC                                | Nanoseconds          | Summary | host                                                    |
| `norca.server.file_system.stat`                       | Time elapsed for `FileSystem.Stat` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.file_system.stream`                     | Time elapsed to establish `FileSystem.Stream` RPC                              | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.alloc_client_update`                | Time elapsed to apply `AllocClientUpdate` raft entry                           | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.alloc_update_desired_transition`    | Time elapsed to apply `AllocUpdateDesiredTransition` raft entry                | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_acl_policy_delete`            | Time elapsed to apply `ApplyACLPolicyDelete` raft entry                        | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_acl_policy_upsert`            | Time elapsed to apply `ApplyACLPolicyUpsert` raft entry                        | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_acl_token_bootstrap`          | Time elapsed to apply `ApplyACLTokenBootstrap` raft entry                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_acl_token_delete`             | Time elapsed to apply `ApplyACLTokenDelete` raft entry                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_acl_token_upsert`             | Time elapsed to apply `ApplyACLTokenUpsert` raft entry                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_csi_plugin_delete`            | Time elapsed to apply `ApplyCSIPluginDelete` raft entry                        | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_csi_volume_batch_claim`       | Time elapsed to apply `ApplyCSIVolumeBatchClaim` raft entry                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_csi_volume_claim`             | Time elapsed to apply `ApplyCSIVolumeClaim` raft entry                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_csi_volume_deregister`        | Time elapsed to apply `ApplyCSIVolumeDeregister` raft entry                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_csi_volume_register`          | Time elapsed to apply `ApplyCSIVolumeRegister` raft entry                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_deployment_alloc_health`      | Time elapsed to apply `ApplyDeploymentAllocHealth` raft entry                  | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_deployment_delete`            | Time elapsed to apply `ApplyDeploymentDelete` raft entry                       | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_deployment_promotion`         | Time elapsed to apply `ApplyDeploymentPromotion` raft entry                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_deployment_status_update`     | Time elapsed to apply `ApplyDeploymentStatusUpdate` raft entry                 | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_job_stability`                | Time elapsed to apply `ApplyJobStability` raft entry                           | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_namespace_delete`             | Time elapsed to apply `ApplyNamespaceDelete` raft entry                        | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_namespace_upsert`             | Time elapsed to apply `ApplyNamespaceUpsert` raft entry                        | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_node_pool_upsert`             | Time elapsed to apply `ApplyNodePoolUpsert` raft entry                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_node_pool_delete`             | Time elapsed to apply `ApplyNodePoolDelete` raft entry                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_plan_results`                 | Time elapsed to apply `ApplyPlanResults` raft entry                            | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.apply_scheduler_config`             | Time elapsed to apply `ApplySchedulerConfig` raft entry                        | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.autopilot`                          | Time elapsed to apply `Autopilot` raft entry                                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.batch_deregister_job`               | Time elapsed to apply `BatchDeregisterJob` raft entry                          | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.batch_deregister_node`              | Time elapsed to apply `BatchDeregisterNode` raft entry                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.batch_node_drain_update`            | Time elapsed to apply `BatchNodeDrainUpdate` raft entry                        | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.cluster_meta`                       | Time elapsed to apply `ClusterMeta` raft entry                                 | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.delete_eval`                        | Time elapsed to apply `DeleteEval` raft entry                                  | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.deregister_job`                     | Time elapsed to apply `DeregisterJob` raft entry                               | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.deregister_node`                    | Time elapsed to apply `DeregisterNode` raft entry                              | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.deregister_si_accessor`             | Time elapsed to apply `DeregisterSITokenAccessor` raft entry                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.deregister_vault_accessor`          | Time elapsed to apply `DeregisterVaultAccessor` raft entry                     | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.node_drain_update`                  | Time elapsed to apply `NodeDrainUpdate` raft entry                             | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.node_eligibility_update`            | Time elapsed to apply `NodeEligibilityUpdate` raft entry                       | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.node_status_update`                 | Time elapsed to apply `NodeStatusUpdate` raft entry                            | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.persist`                            | Time elapsed to apply `Persist` raft entry                                     | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.register_job`                       | Time elapsed to apply `RegisterJob` raft entry                                 | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.register_node`                      | Time elapsed to apply `RegisterNode` raft entry                                | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.update_eval`                        | Time elapsed to apply `UpdateEval` raft entry                                  | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.upsert_node_events`                 | Time elapsed to apply `UpsertNodeEvents` raft entry                            | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.upsert_scaling_event`               | Time elapsed to apply `UpsertScalingEvent` raft entry                          | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.upsert_si_accessor`                 | Time elapsed to apply `UpsertSITokenAccessors` raft entry                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.fsm.upsert_vault_accessor`              | Time elapsed to apply `UpsertVaultAccessor` raft entry                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.allocations`                        | Time elapsed for `Job.Allocations` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.batch_deregister`                   | Time elapsed for `Job.BatchDeregister` RPC call                                | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.deployments`                        | Time elapsed for `Job.Deployments` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.deregister`                         | Time elapsed for `Job.Deregister` RPC call                                     | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.dispatch`                           | Time elapsed for `Job.Dispatch` RPC call                                       | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.evaluate`                           | Time elapsed for `Job.Evaluate` RPC call                                       | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.evaluations`                        | Time elapsed for `Job.Evaluations` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.get_job_versions`                   | Time elapsed for `Job.GetJobVersions` RPC call                                 | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.get_job`                            | Time elapsed for `Job.GetJob` RPC call                                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.latest_deployment`                  | Time elapsed for `Job.LatestDeployment` RPC call                               | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.list`                               | Time elapsed for `Job.List` RPC call                                           | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.plan`                               | Time elapsed for `Job.Plan` RPC call                                           | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.register`                           | Time elapsed for `Job.Register` RPC call                                       | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.revert`                             | Time elapsed for `Job.Revert` RPC call                                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.scale_status`                       | Time elapsed for `Job.ScaleStatus` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.scale`                              | Time elapsed for `Job.Scale` RPC call                                          | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.stable`                             | Time elapsed for `Job.Stable` RPC call                                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.job.validate`                           | Time elapsed for `Job.Validate` RPC call                                       | Nanoseconds          | Summary | host                                                    |
| `norca.server.job_summary.get_job_summary`            | Time elapsed for `Job.Summary` RPC call                                        | Nanoseconds          | Summary | host                                                    |
| `norca.server.leader.barrier`                         | Time elapsed to establish a raft barrier during leader transition              | Nanoseconds          | Summary | host                                                    |
| `norca.server.leader.reconcileMember`                 | Time elapsed to reconcile a serf peer with state store                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.leader.reconcile`                       | Time elapsed to reconcile all serf peers with state store                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.namespace.delete_namespaces`            | Time elapsed for `Namespace.DeleteNamespaces`                                  | Nanoseconds          | Summary | host                                                    |
| `norca.server.namespace.get_namespace`                | Time elapsed for `Namespace.GetNamespace`                                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.namespace.get_namespaces`               | Time elapsed for `Namespace.GetNamespaces`                                     | Nanoseconds          | Summary | host                                                    |
| `norca.server.namespace.list_namespace`               | Time elapsed for `Namespace.ListNamespaces`                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.namespace.upsert_namespaces`            | Time elapsed for `Namespace.UpsertNamespaces`                                  | Nanoseconds          | Summary | host                                                    |
| `norca.server.node_pool.list`                         | Time elapsed for `NodePool.List` RPC call                                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.node_pool.list_jobs`                    | Time elapsed for `NodePool.ListJobs` RPC call                                  | Nanoseconds          | Summary | host                                                    |
| `norca.server.node_pool.list_nodes`                   | Time elapsed for `NodePool.ListNodes` RPC call                                 | Nanoseconds          | Summary | host                                                    |
| `norca.server.node_pool.get_node_pool`                | Time elapsed for `NodePool.GetNodePool` RPC call                               | Nanoseconds          | Summary | host                                                    |
| `norca.server.node_pool.upsert_node_pools`            | Time elapsed for `NodePool.UpsertNodePools` RPC call                           | Nanoseconds          | Summary | host                                                    |
| `norca.server.node_pool.delete_node_pools`            | Time elapsed for `NodePool.DeleteNodePools` RPC call                           | Nanoseconds          | Summary | host                                                    |
| `norca.server.periodic.force`                         | Time elapsed for `Periodic.Force` RPC call                                     | Nanoseconds          | Summary | host                                                    |
| `norca.server.plan.apply`                             | Time elapsed to apply a plan                                                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.plan.evaluate`                          | Time elapsed to evaluate a plan                                                | Nanoseconds          | Summary | host                                                    |
| `norca.server.plan.node_rejected`                     | Number of times a node has had a plan rejected                                 | Integer              | Counter | host, node_id                                           |
| `norca.server.plan.rejection_tracker.node_score`      | Number of times a node has had a plan rejected within the tracker window       | Integer              | Gauge   | host, node_id                                           |
| `norca.server.plan.queue_depth`                       | Count of evals in the plan queue                                               | Integer              | Gauge   | host                                                    |
| `norca.server.plan.submit`                            | Time elapsed for `Plan.Submit` RPC call                                        | Nanoseconds          | Summary | host                                                    |
| `norca.server.plan.wait_for_index`                    | Time elapsed that planner waits for the raft index of the plan to be processed | Nanoseconds          | Summary | host                                                    |
| `norca.server.plugin.delete`                          | Time elapsed for `CSIPlugin.Delete` RPC call                                   | Nanoseconds          | Summary | host                                                    |
| `norca.server.plugin.get`                             | Time elapsed for `CSIPlugin.Get` RPC call                                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.plugin.list`                            | Time elapsed for `CSIPlugin.List` RPC call                                     | Nanoseconds          | Summary | host                                                    |
| `norca.server.scaling.get_policy`                     | Time elapsed for `Scaling.GetPolicy` RPC call                                  | Nanoseconds          | Summary | host                                                    |
| `norca.server.scaling.list_policies`                  | Time elapsed for `Scaling.ListPolicies` RPC call                               | Nanoseconds          | Summary | host                                                    |
| `norca.server.search.prefix_search`                   | Time elapsed for `Search.PrefixSearch` RPC call                                | Nanoseconds          | Summary | host                                                    |
| `norca.server.vault.create_token`                     | Time elapsed to create Vault token                                             | Nanoseconds          | Gauge   | host                                                    |
| `norca.server.vault.distributed_tokens_revoked`       | Count of revoked tokens                                                        | Integer              | Gauge   | host                                                    |
| `norca.server.vault.lookup_token`                     | Time elapsed to lookup Vault token                                             | Nanoseconds          | Gauge   | host                                                    |
| `norca.server.vault.renew_failed`                     | Count of failed attempts to renew Vault token                                  | Integer              | Gauge   | host                                                    |
| `norca.server.vault.renew`                            | Time elapsed to renew Vault token                                              | Nanoseconds          | Gauge   | host                                                    |
| `norca.server.vault.revoke_tokens`                    | Time elapsed to revoke Vault tokens                                            | Nanoseconds          | Gauge   | host                                                    |
| `norca.server.vault.token_last_renewal`               | Time since last successful Vault token renewal                                 | Milliseconds         | Gauge   | host                                                    |
| `norca.server.vault.token_next_renewal`               | Time until next Vault token renewal attempt                                    | Milliseconds         | Gauge   | host                                                    |
| `norca.server.vault.token_ttl`                        | Time to live for Vault token                                                   | Milliseconds         | Gauge   | host                                                    |
| `norca.server.vault.undistributed_tokens_abandoned`   | Count of abandoned tokens                                                      | Integer              | Gauge   | host                                                    |
| `norca.server.volume.claim`                           | Time elapsed for `CSIVolume.Claim` RPC call                                    | Nanoseconds          | Summary | host                                                    |
| `norca.server.volume.deregister`                      | Time elapsed for `CSIVolume.Deregister` RPC call                               | Nanoseconds          | Summary | host                                                    |
| `norca.server.volume.get`                             | Time elapsed for `CSIVolume.Get` RPC call                                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.volume.list`                            | Time elapsed for `CSIVolume.List` RPC call                                     | Nanoseconds          | Summary | host                                                    |
| `norca.server.volume.register`                        | Time elapsed for `CSIVolume.Register` RPC call                                 | Nanoseconds          | Summary | host                                                    |
| `norca.server.volume.unpublish`                       | Time elapsed for `CSIVolume.Unpublish` RPC call                                | Nanoseconds          | Summary | host                                                    |
| `norca.server.worker.create_eval`                     | Time elapsed for worker to create an eval                                      | Nanoseconds          | Summary | host                                                    |
| `norca.server.worker.dequeue_eval`                    | Time elapsed for worker to dequeue an eval                                     | Nanoseconds          | Summary | host                                                    |
| `norca.server.worker.invoke_scheduler_service`        | Time elapsed for worker to invoke the scheduler                                | Nanoseconds          | Summary | host                                                    |
| `norca.server.worker.send_ack`                        | Time elapsed for worker to send acknowledgement                                | Nanoseconds          | Summary | host                                                    |
| `norca.server.worker.submit_plan`                     | Time elapsed for worker to submit plan                                         | Nanoseconds          | Summary | host                                                    |
| `norca.server.worker.update_eval`                     | Time elapsed for worker to submit updated eval                                 | Nanoseconds          | Summary | host                                                    |
| `norca.server.worker.wait_for_index`                  | Time elapsed that worker waits for the raft index of the eval to be processed  | Nanoseconds          | Summary | host                                                    |
| `norca.raft.appliedIndex`                            | Current index applied to FSM                                                   | Integer              | Gauge   | host                                                    |
| `norca.raft.barrier`                                 | Count of blocking raft API calls                                               | Integer              | Counter | host                                                    |
| `norca.raft.commitNumLogs`                           | Count of logs enqueued                                                         | Integer              | Gauge   | host                                                    |
| `norca.raft.commitTime`                              | Time elapsed to commit writes                                                  | Nanoseconds          | Summary | host                                                    |
| `norca.raft.fsm.apply`                               | Time elapsed to apply write to FSM                                             | Nanoseconds          | Summary | host                                                    |
| `norca.raft.fsm.enqueue`                             | Time elapsed to enqueue write to FSM                                           | Nanoseconds          | Summary | host                                                    |
| `norca.raft.lastIndex`                               | Most recent index seen                                                         | Integer              | Gauge   | host                                                    |
| `norca.raft.leader.dispatchLog`                      | Time elapsed to write log, mark in flight, and start replication               | Nanoseconds          | Summary | host                                                    |
| `norca.raft.leader.dispatchNumLogs`                  | Count of logs dispatched                                                       | Integer              | Gauge   | host                                                    |
| `norca.raft.replication.appendEntries`               | Raft transaction commit time                                                   | ms / Raft Log Append | Timer   |                                                         |
| `norca.raft.state.candidate`                         | Count of entering candidate state                                              | Integer              | Gauge   | host                                                    |
| `norca.raft.state.follower`                          | Count of entering follower state                                               | Integer              | Gauge   | host                                                    |
| `norca.raft.state.leader`                            | Count of entering leader state                                                 | Integer              | Gauge   | host                                                    |
| `norca.raft.transition.heartbeat_timeout`            | Count of failing to heartbeat and starting election                            | Integer              | Gauge   | host                                                    |
| `norca.raft.transition.leader_lease_timeout`         | Count of stepping down as leader after losing quorum                           | Integer              | Gauge   | host                                                    |
| `norca.runtime.free_count`                           | Count of objects freed from heap by go runtime GC                              | Integer              | Gauge   | host                                                    |
| `norca.runtime.gc_pause_ns`                          | Go runtime GC pause times                                                      | Nanoseconds          | Summary | host                                                    |
| `norca.runtime.sys_bytes`                            | Go runtime GC metadata size                                                    | # of bytes           | Gauge   | host                                                    |
| `norca.runtime.total_gc_pause_ns`                    | Total elapsed go runtime GC pause times                                        | Nanoseconds          | Gauge   | host                                                    |
| `norca.runtime.total_gc_runs`                        | Count of go runtime GC runs                                                    | Integer              | Gauge   | host                                                    |
| `norca.serf.queue.Event`                             | Count of memberlist events received                                            | Integer              | Summary | host                                                    |
| `norca.serf.queue.Intent`                            | Count of memberlist changes                                                    | Integer              | Summary | host                                                    |
| `norca.serf.queue.Query`                             | Count of memberlist queries                                                    | Integer              | Summary | host                                                    |
| `norca.scheduler.allocs.rescheduled.attempted`       | Count of attempts to reschedule an allocation                                  | Integer              | Count   | alloc_id, job, namespace, task_group                    |
| `norca.scheduler.allocs.rescheduled.limit`           | Maximum number of attempts to reschedule an allocation                         | Integer              | Count   | alloc_id, job, namespace, task_group                    |
| `norca.scheduler.allocs.rescheduled.wait_until`      | Time that a rescheduled allocation will be delayed                             | Float                | Gauge   | alloc_id, job, namespace, task_group, follow_up_eval_id |
| `norca.state.snapshotIndex`                          | Current snapshot index                                                         | Integer              | Gauge   | host                                                    |

## Badger Metrics

The Badger databases of an agent report their shape every 10 seconds: the raft
log of a server as `norca.badger.raft.*`, the client state as
`norca.badger.client.*` (shown as `<db>` below).

| Metric                                  | Description                                                        | Unit         | Type    |
| --------------------------------------- | ------------------------------------------------------------------ | ------------ | ------- |
| `norca.badger.<db>.lsm_bytes`           | Size of the LSM tree                                               | Bytes        | Gauge   |
| `norca.badger.<db>.vlog_bytes`          | Size of the value log                                              | Bytes        | Gauge   |
| `norca.badger.<db>.level<N>_tables`     | Number of tables on level N; level 0 close to the stall threshold means writes are about to stall | Integer | Gauge |
| `norca.badger.<db>.vlog_gc`             | Time of a value log garbage collection run                         | Milliseconds | Summary |
| `norca.badger.raft.store_logs`          | Time to store a batch of raft log entries (one sync)               | Milliseconds | Summary |
| `norca.badger.raft.delete_range`        | Time to delete a range of raft log entries after a snapshot        | Milliseconds | Summary |

## Raft BoltDB Metrics

Servers with `raft_store = "boltdb"` emit the metrics of the `raft-boltdb` library for their raft
log.

| Metric                                    | Description                               | Unit        | Type    |
| ----------------------------------------- | ----------------------------------------- | ----------- | ------- |
| `norca.raft.boltdb.numFreePages`          | Number of free pages                      | Integer     | Gauge   |
| `norca.raft.boltdb.numPendingPages`       | Number of pending pages                   | Integer     | Gauge   |
| `norca.raft.boltdb.freePageBytes`         | Number of free page bytes                 | Integer     | Gauge   |
| `norca.raft.boltdb.freelistBytes`         | Number of freelist bytes                  | Integer     | Gauge   |
| `norca.raft.boltdb.totalReadTxn`          | Count of total read transactions          | Integer     | Counter |
| `norca.raft.boltdb.openReadTxn`           | Number of current open read transactions  | Integer     | Gauge   |
| `norca.raft.boltdb.txstats.pageCount`     | Number of pages in use                    | Integer     | Gauge   |
| `norca.raft.boltdb.txstats.pageAlloc`     | Number of page allocations                | Integer     | Gauge   |
| `norca.raft.boltdb.txstats.cursorCount`   | Count of total database cursors           | Integer     | Counter |
| `norca.raft.boltdb.txstats.nodeCount`     | Count of total database nodes             | Integer     | Counter |
| `norca.raft.boltdb.txstats.nodeDeref`     | Count of total database node dereferences | Integer     | Counter |
| `norca.raft.boltdb.txstats.rebalance`     | Count of total rebalance operations       | Integer     | Counter |
| `norca.raft.boltdb.txstats.rebalanceTime` | Sample of rebalance operation times       | Nanoseconds | Summary |
| `norca.raft.boltdb.txstats.split`         | Count of total split operations           | Integer     | Counter |
| `norca.raft.boltdb.txstats.spill`         | Count of total spill operations           | Integer     | Counter |
| `norca.raft.boltdb.txstats.spillTime`     | Sample of spill operation times           | Nanoseconds | Summary |
| `norca.raft.boltdb.txstats.write`         | Count of total write operations           | Integer     | Counter |
| `norca.raft.boltdb.txstats.writeTime`     | Sample of write operation times           | Nanoseconds | Summary |

## Agent Metrics

Agent metrics are emitted by all Norca agents running in either client or server mode.

| Metric                                    | Description                                           | Unit        | Type    |
| ----------------------------------------- | ----------------------------------------------------- | ----------- | ------- |
| `norca.agent.http.exceeded`               | Count of HTTP connections exceeding concurrency limit | Integer     | Counter |

[tagged-metrics]: /docs/operations/metrics-reference#tagged-metrics
[sticky]: /docs/job-specification/ephemeral_disk#sticky
