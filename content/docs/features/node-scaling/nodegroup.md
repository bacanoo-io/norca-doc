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
| `policy.check` | map of checks | | Checks on the group, see below. They only raise the scale. |
| `policy.scale_down` | object | | Lowers the scale; without it the autoscaler never does. `unneeded_for` (`10m`), `delay_after_add` (`10m`), `utilization_below` (percent, `40`), see [scale down](/docs/features/node-scaling#scale-down); `selector` (`least_busy` or `empty`) and `drain_deadline` *operator*. |

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
| `status.decision` | autoscaler | What the last raise of the scale was made for, kept until the group has that many ready nodes (or its scale is set below it): `time`, `replicas`, `previous`, `check` (`blocked-demand` or `headroom`), `reason`, `evaluations` (the IDs of the blocked evaluations, at most 50) and `work` (`namespace`, `job`, `group` and `count` of the blocked work, at most 20). Not written for a dry run. |
| `status.nodes` | operator | One entry per instance of the provider: `instance`, `state` (`creating`, `running`, `deleting`, `failed`), `request`, `created`, a `reason` when it failed, `node` and `ready` once its node joined, and `slow` while it joins after `join.slow_after`. |
| `status.lastRequest` | operator | The number of the last request to the provider. A request ID is `<region>/<group>/<number>`; the provider creates nothing more for an ID it has seen. |
| `status.join` | operator | The join failures in a row: `failures`, `lastFailure`, and the template (`revision`) and resume generation (`resumed`) they count for. |
| `status.strayNodes` | operator | Nodes of the group without an instance: `node`, `name`, `instance` and `kind`: `gone` (down, what is left of a deleted instance) or `foreign` (ready, without a machine the operator asked for; made ineligible). |
| `status.rollout` | operator | Reserved for the operator. |
| `status.conditions` | operator | `ProviderAvailable` (`False` with `UnknownProvider`, `ProviderUnavailable`, `UnknownGroup` or `InvalidProvider`) `Provisioned` (`False` with `Quota`, `NoCapacity`, `Invalid` or `ProviderError` when the provider can't create the instances, or `JoinFailing`) `JoinFailing` (`True` with `TooManyFailures`) `ForeignNode` (`True` while a ready node of the group runs without an instance) `ScaleDownBlocked` (`True` when no node of the group may go; `retryAfter` is the time, RFC 3339, before which the autoscaler does not lower the scale again) and `NetworkCovered` (`True` when `network` is inside the cluster ranges the deployer publishes, `False` when the firewall of the servers would not let the nodes in, `Unknown` with `NetworkUnchecked` when the ranges are not published or `NoNetwork` when the group names none). |

## The join of the nodes

An instance whose node has not joined by `join.deadline` (15 minutes by default), or that the
provider reports as failed, is deleted, and counts as a join failure. After `join.max_failures`
(3) failures in a row the group stops asking for instances (`JoinFailing`), so a template that
does not work does not create and delete machines for ever. It asks again when the template
changes (`spec.node`, `provider` or `group`) or `join.resume_generation` is raised; a node that
joins ends the row. A node still joining after `join.slow_after` (5 minutes) stays in
`status.nodes` but no longer counts in `status.joining`, so the autoscaler may ask for another.

The events of the operator in the log of the group: `InstancesRequested`, `CreateFailed`,
`NodeJoined`, `JoinSlow`, `JoinTimeout`, `InstanceFailed`, `JoinFailing`, `NodeWithoutInstance`,
`ForeignNode`, `NodeIneligible` and `NetworkNotCovered`.

A node with the marks of the group (`norca.node_group`, `norca.instance`) whose instance the provider
does not have is reported once: down, it is what is left of a deleted instance; ready, it is
**foreign** (a bootstrap that left through the user data, for example) and is made ineligible for
new work. A second ready node with the name of an instance that has one is foreign too. Nodes without
the marks, installed by hand, are left alone.

## Rules

The kind refuses an object when:

- `min` is greater than `max`;
- `replicas` is not between `min` and `max`;
- `provider` is not set and `engine` is not `external`;
- `pool`, `datacenter` or `node_class` is changed;
- a duration, a CIDR, a share or an enum value is not in the form above, a nested block has an
  unknown field, or a check has no strategy or more than one.

The status is written by the operator and by the autoscaler, and a status write replaces the
whole status: a writer reads the object, changes its own fields and writes it back with the index
it read (the `CAS` of the status write), so neither removes the fields of the other.

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
