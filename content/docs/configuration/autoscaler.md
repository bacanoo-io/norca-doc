---
title: "autoscaler Block"
linkTitle: "autoscaler"
description: "The \"autoscaler\" block of the server configuration enables and tunes the built-in autoscaler of Norca."
---

**Placement:** `server -> autoscaler`

The `autoscaler` block configures the [built-in autoscaler](/docs/features/autoscaler),
which runs on the leader server and evaluates the scaling policies of the
`builtin` engine. Set the same block on every server: the autoscaler runs on
whichever server is the leader.

```hcl
server {
  enabled = true

  autoscaler {
    enabled                     = true
    default_engine              = "builtin"
    min_eval_interval           = "10s"
    default_evaluation_interval = "30s"
    default_cooldown            = "2m"

    apm "prometheus" {
      driver = "prometheus"
      config {
        address = "http://prometheus.service.internal:9090"
      }
    }
  }
}
```

The whole block can be changed with a configuration reload; the autoscaler then
restarts its evaluations with the new settings. Clients need no configuration:
the servers tell them through the heartbeat response whether, and how often, to
send the usage of their task groups.

## `autoscaler` Parameters

- `enabled` `(bool: false)` - Runs the built-in autoscaler on the leader. While
  it is disabled, a job whose enabled scaling policy uses the `builtin` engine is
  rejected at submission.

- `default_engine` `(string: "external")` - The engine of scaling policies that
  do not set [`engine`](/docs/job-specification/scaling#scaling-parameters): `builtin` (the
  built-in autoscaler) or `external` (an external autoscaler agent). The default
  keeps the behavior of existing jobs unchanged.

- `min_eval_interval` `(string: "10s")` - The lower bound of a policy's
  `evaluation_interval`. A policy with a shorter interval is rejected at
  submission. Must be greater than zero.

- `min_cooldown` `(string: "10s")` - The lower bound of a policy's `cooldown`
  and `cooldown_on_scale_up`, checked at submission.

- `default_evaluation_interval` `(string: "10s")` - The `evaluation_interval` of
  policies that do not set one. It is raised to `min_eval_interval` if lower.

- `default_cooldown` `(string: "5m")` - The `cooldown` of policies that do not
  set one.

- `eval_workers` `(int: 10)` - The number of policy evaluations that may run in
  parallel on the leader.

- `rate_limit` `(float: 10)` - The number of scaling actions per second allowed
  in the region (a token bucket). Actions over the limit are dropped; the policy
  is evaluated again at its next interval with fresh metrics.

- `rate_limit_burst` `(int: 50)` - The burst size of the token bucket.

- `metrics_window` `(string: "5m")` - How long the leader keeps the task group
  usage reported by clients, the data of the built-in metrics. After a leader
  change, the new leader fills the window from its
  [metrics store](/docs/configuration/metrics_store); without the store, or
  for the part of the window the store has no data of, the built-in metrics
  report insufficient data until one full window has been collected. A check
  whose `query_window` reaches back beyond this window reads the built-in
  metrics from the metrics store (the mean of the interval averages, the
  largest maximum); without points there, from this window only. Must not be
  shorter than `client_metrics_interval`.

- `client_metrics_interval` `(string: "10s")` - The aggregation window of the
  task group usage on the clients, which is also how often they send it. Must be
  at least `1s`.

- `plugin_dir` `(string: "")` - The directory of external plugin binaries: APM
  and strategy plugins built with the autoscaler plugin SDK. Required if an
  `apm` or `strategy` block uses a driver that is not built in.

- `apm` <code>([APM](#apm-block): nil)</code> - Configures a named APM instance.
  May be repeated.

- `strategy` <code>([Strategy](#strategy-block): nil)</code> - Configures a named
  strategy instance. May be repeated.

The oscillation protection (three direction changes within 10 minutes suspend a
group for 15 minutes) is not configurable.

## `apm` Block

```hcl
apm "<name>" {
  driver = "<driver>"
  args   = ["<arg>"]
  config {
    <key> = "<value>"
  }
}
```

The label is the name a check uses as its [`source`](/docs/features/autoscaler/reference/policy#check-options).
The `nomad-apm` source is always available and serves the
[built-in metrics](/docs/features/autoscaler/reference/plugins/apm/nomad); it
does not need a block.

- `driver` `(string: <label>)` - The plugin implementation. The built-in drivers
  are `nomad-apm` and [`prometheus`](/docs/features/autoscaler/reference/plugins/apm/prometheus).
  Any other value is the name of an executable in `plugin_dir`. Defaults to the
  label of the block.

- `args` `(array<string>: [])` - Command line arguments of an external plugin
  binary.

- `config` `(map<string|string>: nil)` - The configuration passed to the plugin.
  Values are converted to strings.

## `node_scaling` Block

Settings of node scaling that concern the groups of a node pool together, or
the whole region. A node group is a [`norca.io/NodeGroup`](/docs/design/cluster-scaling-plan)
object; the built-in autoscaler derives its scaling policy from the object and
writes the scale to `spec.replicas`.

```hcl
autoscaler {
  enabled = true

  node_scaling {
    expander = "spread"        # the default of the region
    interval = "30s"           # how often the blocked work is looked at

    pool "edge" {
      expander  = "priority"   # overrides the region
      max_nodes = 12           # the sum of spec.replicas over the groups of the pool
      max_step  = 3            # nodes added to the pool by one decision
    }
  }
}
```

- `expander` `(string: "spread")` - Which group of a pool grows for work that
  can go to several: `spread` (the group with the fewest nodes), `fill` (the
  fullest group below its `max`), `priority` (the lowest `priority` of the
  group) or `weighted` (by the `weight` of the group).
- `interval` `(string: "30s")` - How often the blocked work is looked at.
- `pool` - Overrides `expander` for a pool and limits it with `max_nodes` and
  `max_step` (0: no limit).

### Blocked work

Work that cannot be placed for want of capacity raises the scale of the groups
that could take it, without waiting for a check or for the cooldown of the
group:

1. The unplaced allocations are packed into virtual nodes of the size of a
   node of the group (`status.allocatable` of the object, or `spec.node.capacity`
   less `spec.node.reserved`), the largest first. Four allocations of 6 GB on
   nodes of 8 GB need four nodes. An allocation under `distinct_hosts`, or one
   that asks for a port by number, needs a node of its own.
2. Work that can go to several groups (the datacenters of the job) is split
   between them by the expander. A `distinct_property` on the datacenter is
   respected: a group whose datacenter is used up for the job does not get the
   work.
3. The nodes that were asked for and have not joined yet (`status.joining`)
   count as capacity, so the same work is not asked for twice.
4. `spec.replicas` is raised by what is left, within `max` of the group and
   `max_nodes` and `max_step` of the pool. Without `spec.enforce` the decision is
   a dry run: it is recorded once in the event log of the object and
   `spec.replicas` is not changed.

### Headroom

A node takes minutes to start, so work that arrives after the capacity ran out
waits that long. `headroom_nodes` (or `headroom_percent`, a share of the nodes
the group has; the larger of the two applies) in the spec of a node group asks
the autoscaler to keep free capacity worth that many nodes ahead of the work.

The free capacity is read from the cluster gauges of the group's datacenter,
pool and class: the ready, eligible nodes and the share of CPU and memory
allocated (the scarcer of the two). Nodes that were asked for and have not
joined yet count as free capacity, so the same headroom is not asked for twice.
The nodes that blocked work needs are not free capacity: the headroom comes
on top of them. When the gauges can't be read, nothing is added. Unlike blocked
work, the headroom is an ahead-of-time trigger and waits for the cooldown of the
group.

When work is not helped by more nodes, a `ScalingNodeBlocked` event says why
(every group is at its maximum, a limit of the pool, the size of a node is not
known, no group fits it); a constraint that cannot be checked against a node that
does not exist yet gives `ScalingNodeUnverifiable`, and an allocation that does
not fit an empty node `ScalingNodeAllocationTooLarge`. Each is raised when
the reason appears or changes, not at every look.

## `advice` Block

The advice mode is read-only. It looks at the work that cannot be placed for
want of capacity (the blocked evaluations on the leader), packs it into nodes
of the size you give, and raises an event with the number of nodes that
would be needed. It adds and removes nothing. It runs while at least one
`advice` block is set.

- `advice_interval` `(string: "30s")` - How often the blocked work is looked
  at. Set it in the `autoscaler` block.

```hcl
autoscaler {
  enabled = true

  advice "workers-a" {
    pool       = "workers"
    datacenter = "dc-a"
    cpu        = 4000   # MHz, after the reserved resources
    memory     = 8192   # MB
    disk       = 20000  # MB
  }
}
```

The label names the node group in the events. The parameters are `pool` and
`datacenter` (required: the group the nodes would belong to) and `cpu`,
`memory` and `disk`, the allocatable size of one node.

The allocations are packed largest first, each into the first node where it
fits on CPU, memory and disk. Four allocations of 6 GB on nodes of 8 GB need
four nodes, not three. An allocation under `distinct_hosts`, or one that asks for a port by number
on the host (a proxy on ports 80 and 443), needs a node of its own, however
small it is; the room left on that node is used by the other work. An allocation that does not fit an empty node cannot be helped by
this group.

Events of the `Scaling` topic, raised when the picture changes (not at every
look):

| Event | Meaning |
| --- | --- |
| `ScalingNodeAdvice` | `Group` is `pool/datacenter`, `Count` the nodes the work would need, `PreviousCount` the number advised before. `Count` 0 withdraws the advice. `DryRun` is set. |
| `ScalingNodeUnverifiable` | A task group (`JobID`, `Group`) is blocked by a constraint that cannot be checked ahead of time; `Reason` names it. |
| `ScalingNodeAllocationTooLarge` | A task group (`JobID`, `Group`) has an allocation that does not fit an empty node of the configured size. |

A `distinct_property` on `${node.datacenter}` or `${node.pool}` is checked
against the group: the live allocations of the job (of the group, when the
constraint is on the group) are counted by the value of their node, and a
group whose value has no room left is not advised, so the node is advised in
the group of another datacenter. When there is room for fewer allocations than
are waiting, the count is capped at what is left. A `distinct_property` on
anything else (a `meta` key, an attribute) cannot be checked against a node
that does not exist yet: no node is advised, a `ScalingNodeUnverifiable` event
names the job and the constraint, and the allocations are counted by
`norca.cluster.blocked_unverifiable`. The fix is in the job.

The demand of a job that can use several datacenters is counted in each of
them. Work blocked by the quota of its namespace is not counted: more nodes
would not help it.

## `strategy` Block

```hcl
strategy "<name>" {
  driver = "<driver>"
  args   = ["<arg>"]
  config {
    <key> = "<value>"
  }
}
```

The built-in strategies `target-value`, `threshold`, `fixed-value` and
`pass-through` are always available under their own names. A `strategy` block is
only needed for an [external strategy plugin](/docs/features/autoscaler/reference/concepts/plugins),
or to register a built-in strategy under another name. The parameters are the
same as those of the `apm` block.

## Examples

### External plugins

```hcl
server {
  autoscaler {
    enabled    = true
    plugin_dir = "/opt/norca/autoscaler-plugins"

    # /opt/norca/autoscaler-plugins/my-apm; the config keys are those of
    # the plugin.
    apm "my-apm" {
      driver = "my-apm"
      config {
        address = "https://metrics.internal:8443"
      }
    }

    # /opt/norca/autoscaler-plugins/my-strategy
    strategy "my-strategy" {
      driver = "my-strategy"
      args   = ["-v"]
    }
  }
}
```

An external plugin runs in its own process. A plugin that crashes, hangs or
fails to start only fails the checks that use it; it is started again on its
next use, with an exponential backoff between attempts (1 second up to 2
minutes).

### Migrating from an external autoscaler

The engine of a policy decides which autoscaler evaluates it, so the built-in
and an external autoscaler can run side by side:

1. Upgrade the servers and set `enabled = true` with `default_engine = "external"`.
2. Configure the external autoscaler to list only its own policies with the
   `engine=external` filter of [`GET /v1/scaling/policies`](/docs/api/scaling-policies#list-scaling-policies).
3. Set `engine = "builtin"` job by job and run `norca job plan`: the servers
   validate the policy and report unsupported settings.
4. When every job is migrated, set `default_engine = "builtin"` and stop the
   external autoscaler.

Setting `engine = "external"` on a job hands it back to the external autoscaler
without a server restart.
