---
title: "Node scaling"
linkTitle: "Node scaling"
weight: 11
description: "Capacity groups of nodes (NodeGroup objects) whose size the built-in autoscaler decides: for work that cannot be placed, for the headroom you ask for, and by checks on the allocated share of the group."
---

## What and why

The [built-in autoscaler](/docs/features/autoscaler) scales task groups. Node scaling gives it
the other half of the picture: how many **nodes** a node pool needs. A node that is added takes
minutes to start, so a cluster that only grows when work is already waiting makes the work wait; a
cluster that is sized by hand is either too small or too expensive.

Node scaling is built from three parts:

- a **node group** is an object of the kind [`norca.io/NodeGroup`](/docs/features/node-scaling/nodegroup):
  the nodes of one node pool in one datacenter (and, if you want, one node class), with a
  minimum, a maximum and a **scale** (`spec.replicas`, the number of nodes it should have);
- the **built-in autoscaler** of the leader decides the scale: from the work that cannot be
  placed, from the **headroom** you ask for, and from **checks** on the group, and writes it to
  `spec.replicas`;
- an **operator** creates and deletes the machines to match the scale, through a
  **provider** application for a platform ([`norca.io/NodeProvider`](/docs/features/node-scaling/nodeprovider)).

> **What is available today.** The decisions are: the kinds, the policy derived from the objects,
> the trigger on blocked work, the headroom, the expanders and the dry run. The operator and the
> providers that turn the scale into machines are **not available yet**. Until they are, the scale
> is a recommendation: use it with `enforce = false` and read the events, or let your own tooling
> (or a person, with `norca object scale`) act on `spec.replicas`.

## How the scale is decided

Every `NodeGroup` that is enabled and of the built-in engine becomes a scaling policy, derived
from the object each time the objects change. The policy is evaluated like the policy of a task
group, so the checks, the strategies (`target-value`, `threshold`), the evaluation interval, the
cooldown, the rate limit and the oscillation guard are the ones described on the
[autoscaler](/docs/features/autoscaler) page. The target is the object itself: the decision is
written to `spec.replicas` through the scale subresource, and the cooldown is read from the event
log of the object, so a new leader keeps it.

Besides the checks, two triggers act on the groups. Both run every `interval` of the
[`node_scaling`](/docs/configuration/autoscaler#node_scaling-block) block (30 seconds by default).

### Blocked work

Work that cannot be placed for want of capacity raises the scale of the groups that could take
it, **without waiting for the cooldown of the group**:

1. The unplaced allocations are packed, the largest first, into virtual nodes of the size of a node
   of the group (`status.allocatable`, or `spec.node.capacity` less `spec.node.reserved`). Four
   allocations of 6 GB on nodes of 8 GB need four nodes, not three.
2. An allocation that cannot share a node with its own kind, because of `distinct_hosts` or a port
   by number (a proxy on ports 80 and 443), needs a node of its own, however small it is. The room
   that is left on that node is used by other work.
3. Work that can go to several groups (a job with several datacenters) is split between them by
   the **expander**: `spread` (the group with the fewest nodes, the default), `fill` (the fullest
   group below its maximum), `priority` (the lowest `priority`) or `weighted` (by `weight`). It is
   set for the region and can be overridden for a pool.
4. A `distinct_property` on `${node.datacenter}` or `${node.pool}` is respected: the live
   allocations of the job are counted by the value of their node, a group whose value has no room
   left gets no work, and the work is capped at the room each group has.
5. **Nodes that were asked for and have not joined yet** (`status.joining`) are empty room for the
   work, filled first. The same work is therefore not asked for twice, however the expander
   splits it at the next look.
6. A job of a node pool uses the groups of that pool. A job that may run in **any** pool (`node_pool = "all"`) grows no group by default; the groups with `spill = true` are the ones it may grow, in the datacenters it names. An event says so when no group allows it.
7. `spec.replicas` is raised by what is left, within the `max` of the group and the `max_nodes` and
   `max_step` of the pool.

When the nodes the group has are not known (an operator does not report them and the cluster gauges
cannot be read), the group is left alone: without that number the nodes on their way cannot be told
from the ready ones, and the work would be asked for again at every look.

### Headroom

`headroom_nodes` (or `headroom_percent`, a share of the nodes the group has; the larger of the two
applies) keeps free capacity worth that many nodes ahead of the work, so that new work can be placed
at once while the next node starts. The free capacity is read from the cluster gauges of the group:
the ready, eligible nodes and the allocated share of CPU and memory (the scarcer of the two). Nodes
on their way count as free; the nodes that blocked work needs do not. The headroom is an
ahead-of-time trigger, so it waits for the cooldown of the group. When the gauges cannot be read,
nothing is added.

## Dry run

A group is a **dry run** until you set `enforce = true`. A decision is then recorded in the event
log of the object (`norca object events norca.io/NodeGroup <name>`, reason `ScalingDryRun`, once
for the same decision) and `spec.replicas` is not changed. Run a group this way first and compare
the decisions with what you expect.

## Events and metrics

Decisions and the reasons for not deciding are events of the `Scaling` topic of the
[event stream](/docs/features/event-stream):

| Event | Meaning |
| --- | --- |
| `ScalingDecision` | The scale of a group was raised (`Check` is `blocked-demand`, `headroom` or the name of a check). |
| `ScalingNodeBlocked` | Work is not helped by more nodes: every group that could take it is at its maximum, a limit of the pool, the size of a node is unknown, or no group fits. `Reason` says which. |
| `ScalingNodeAllocationTooLarge` | An allocation does not fit an empty node of a group; the job and the group are named. |
| `ScalingNodeUnverifiable` | The work is blocked by a constraint that cannot be checked against a node that does not exist yet (a `distinct_property` on a `meta` key, for example). No node is added for it; the fix is in the job. |

The last three are raised when the reason appears or changes, not at every look. The demand that
cannot be placed is in the [cluster gauges](/docs/configuration/metrics_store) of the metrics store:
`norca.cluster.blocked_cpu_mhz`, `blocked_memory_mb`, `blocked_evals`, `blocked_allocs_exclusive`
and `blocked_unverifiable`, per datacenter and node pool; the allocated share and the ready nodes
per datacenter, node pool and node class are the other cluster gauges. The built-in source
`norca` of the autoscaler serves them to the checks of a group, with the pool, datacenter and
class of the group as defaults:

```hcl
policy {
  check "allocated" {
    source = "norca"
    query  = "cluster.cpu_allocated"
    strategy "target-value" { target = 70 }
  }
}
```

## Example

Two groups of the pool `workers`, in two datacenters, scaled from blocked work and a headroom of
one node. Both are a dry run until you are happy with the decisions:

```hcl
kind = "norca.io/NodeGroup"
name = "workers-dc-a"

spec {
  pool       = "workers"
  datacenter = "dc-a"
  min        = 1
  max        = 10
  replicas   = 3
  provider   = "hetzner-eu"
  enforce    = false

  headroom_nodes = 1

  node {
    capacity {
      cpu    = 4000   # MHz
      memory = 8192   # MB
      disk   = 40000  # MB
    }
    reserved {
      cpu    = 100
      memory = 256
    }
  }
}
```

```shell
$ norca object apply workers-dc-a.hcl
$ norca object events norca.io/NodeGroup workers-dc-a
```

In the server configuration, spread the work between the groups and cap the pool:

```hcl
autoscaler {
  enabled = true

  node_scaling {
    expander = "spread"

    pool "workers" {
      max_nodes = 12
      max_step  = 3
    }
  }
}
```

## Limits

- The groups of one node pool and datacenter must not overlap: use one group without `node_class`,
  or groups with different classes.
- A job fixed to one datacenter stays blocked until its owner changes the job or raises the group;
  the scaler never moves work between datacenters.
- Work that is blocked by a constraint on the node class is not checked against the class of a
  group yet.
- The blocked work and the headroom only raise the scale. A check on the group (for example `target-value`) can also lower it, but choosing, draining and deleting a node is the work of the operator, which is not available yet; the scale-down settings of the spec are stored and not used.
