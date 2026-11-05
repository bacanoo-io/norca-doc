---
title: "NodeGroup"
linkTitle: "NodeGroup"
weight: 1
description: "Reference of the cluster-scoped kind norca.io/NodeGroup: the fields of the spec, the status, the rules and what writes what."
---

A `NodeGroup` is a [custom object](/docs/features/operator-framework/object-kinds) of the kind
`norca.io/NodeGroup`. It is **cluster-scoped** (it has no namespace) and local to the region.
The core registers the kind when a server becomes leader; its definition cannot be changed or
deleted through the API. Objects are managed with `norca object apply`, `get`, `list`, `delete`,
`events` and `scale`, and need an [object rule](/docs/features/operator-framework/object-kinds)
of the kind in the ACL of the token.

See [Node scaling](/docs/features/node-scaling) for how the groups are used.

## Spec

Fields marked *operator* are stored and validated now but used only by the operator that creates
the machines, which is not available yet.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `pool` | string, required | | The node pool of the nodes of the group. Cannot be changed. |
| `datacenter` | string, required | | The datacenter of the nodes. Cannot be changed. |
| `node_class` | string | | Only nodes of this class belong to the group. Cannot be changed. |
| `enabled` | bool | `true` | A disabled group is left alone. |
| `enforce` | bool | `false` | `false`: decisions are dry runs (events only). `true`: they are written to `replicas`. |
| `engine` | `builtin` or `external` | `builtin` | `external`: an external autoscaler owns the group; the built-in one leaves it alone. |
| `replicas` | integer | | The scale: the number of nodes the group should have. Written by the autoscaler, by a person or tool (`norca object scale`). |
| `min` | integer | `0` | The fewest nodes. |
| `max` | integer, required | | The most nodes. |
| `priority` | integer | `0` | For the `priority` expander: lower is tried first. |
| `weight` | integer, at least 1 | `1` | For the `weighted` expander. |
| `headroom_nodes` | integer | `0` | Keep free capacity worth this many nodes ahead of the work. |
| `headroom_percent` | number, 0 to 100 | | Keep free capacity worth this share of the nodes of the group. The larger of the two applies. |
| `spill` | bool | `false` | Let work of a job that may run in any node pool (`node_pool = "all"`) grow this group, whatever its pool is. |
| `provider` | string | | The `NodeProvider` that creates the nodes. Required unless `engine` is `external`. *operator* |
| `group` | string | | The provider's name of the zone or group. *operator* |
| `network` | CIDR | | The range of the nodes. *operator* |
| `node.capacity` | `cpu` (MHz), `memory`, `disk` (MB) | | The size of one node, for groups whose provider does not report it. Used to size requests. |
| `node.reserved` | `cpu`, `memory`, `disk` | | Reserved by the agent: allocatable is capacity less reserved. |
| `node.meta`, `node.attributes` | map of strings | | The meta and attributes a new node will have. *operator* |
| `node.parameters` | object | | Parameters for the provider (machine size, image). *operator* |
| `rolling` | object | | Replacement of nodes: `mode` (`auto` or `paused`), `generation`, `max_node_age`, `max_unavailable` (at least 1), `max_surge`, `jitter`. *operator* |
| `deletion` | object | | `policy` (`drain`, `orphan` or `terminate`) and `drain_timeout`. *operator* |
| `join` | object | | `deadline`, `slow_after`, `max_failures`, `resume_generation`. *operator* |
| `policy.evaluation_interval` | duration | server default | How often the checks run. |
| `policy.cooldown` | duration | server default | The wait after a change, for the checks. |
| `policy.check` | map of checks | | Checks on the group, see below. |
| `policy.scale_down` | object | | `unneeded_for`, `delay_after_add`, `utilization_below`, `selector` (`least_busy` or `empty`), `drain_deadline`. *operator* |

Durations are written as numbers with `s`, `m`, `h` or `d`: `30s`, `15m`, `1h30m`, `45d`.

### Checks

`policy.check` is a map from the name of a check to its settings. It has the same meaning as a
`check` of a task group policy:

| Field | Meaning |
| --- | --- |
| `source` | The source of the metric, for example `norca` (the cluster gauges). |
| `query` | The query of the source, for example `cluster.cpu_allocated`. |
| `query_window` | The range of the query. |
| `strategy` | Exactly one strategy with its settings: `strategy "target-value" { target = 70 }`. |
| `on_error` | `fail` or `ignore`. |

## Status

| Field | Written by | Meaning |
| --- | --- | --- |
| `status.replicas` | operator | Nodes of the group that are ready. Without it the autoscaler reads the ready nodes from the cluster gauges. |
| `status.joining`, `status.failed` | operator | Nodes asked for and not joined yet, and failed. Joining nodes count as capacity for the blocked work. |
| `status.allocatable`, `status.capacity` | operator | The size of one node (`cpu`, `memory`, `disk`). Without `allocatable` the size comes from `spec.node`. |
| `status.nodes`, `status.rollout`, `status.decision` | operator, autoscaler | Reserved for the operator. |
| `status.conditions` | operator | Conditions with a reason. |

## Rules

The kind refuses an object when:

- `min` is greater than `max`;
- `replicas` is not between `min` and `max`;
- `provider` is not set and `engine` is not `external`;
- `pool`, `datacenter` or `node_class` is changed;
- a duration, a CIDR, a share or an enum value is not in the form above, a nested block has an
  unknown field, or a check has no strategy or more than one.

## Events

`norca object events norca.io/NodeGroup <name>` shows the log of a group, oldest first:
`Scaled` when the scale was changed (with the reason and the previous count) and `ScalingDryRun`
for a dry run.

## Example

```hcl
kind = "norca.io/NodeGroup"
name = "edge-dc-a"

spec {
  pool       = "edge"
  datacenter = "dc-a"
  min        = 1
  max        = 4
  replicas   = 1
  provider   = "hetzner-eu"
  enforce    = true

  node {
    capacity {
      cpu    = 2000
      memory = 4096
      disk   = 20000
    }
  }

  policy {
    cooldown = "10m"

    check "allocated" {
      source = "norca"
      query  = "cluster.memory_allocated"
      strategy "target-value" { target = 60 }
    }
  }
}
```
