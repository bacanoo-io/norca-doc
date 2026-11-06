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
| `status.nodes` | operator | One entry per instance of the provider: `instance`, `state` (`creating`, `running`, `deleting`, `failed`), `request`, `created`, a `reason` when it failed, `node` and `ready` once its node joined, `slow` while it joins after `join.slow_after`, and `removing` (the phase) for the instance a scale down removes. |
| `status.lastRequest` | operator | The number of the last request to the provider. A request ID is `<region>/<group>/<number>`; the provider creates nothing more for an ID it has seen. |
| `status.join` | operator | The join failures in a row: `failures`, `lastFailure`, and the template (`revision`) and resume generation (`resumed`) they count for. |
| `status.strayNodes` | operator | Nodes of the group without an instance: `node`, `name`, `instance` and `kind`: `gone` (down, what is left of a deleted instance) or `foreign` (ready, without a machine the operator asked for; made ineligible). |
| `status.removal` | operator | The instance a scale down removes: `instance`, `name`, `node`, `selector`, `phase` (`draining`, `settling`, `deleting`, `deleted`), `started`, and `settleUntil` for an empty node. Another operator instance goes on with it. |
| `status.scaleDown` | operator | The vetoes of the scale down in a row: `vetoes`, `retryAfter`, `reason` (`NoCandidate` or `DrainStuck`), `message`. Gone after a scale down that worked. |
| `status.deletion` | operator | While a deleted group is kept by the finalizer of the operator: the `policy` being applied, `deleted` (when each instance was deleted, by its name) and `waiting` (what the deletion waits for). |
| `status.rollout` | operator | The rolling replacement: `replacing` (per node being replaced: `instance`, `name`, `node`, `nodeName`, `reason` (`marked`, `revision`, `generation`, `age`, `expiry`), `surge`, `drain`, `phase` (`surging`, `emptying`, `draining`, `deleted`), `since`, `started`, and `expires`, its hard limit), `outdated` (the names of the outdated nodes not replaced yet) and `backoff` (`vetoes`, `retryAfter`, `reason`, `message`). |
| `status.conditions` | operator | `ProviderAvailable` (`False` with `UnknownProvider`, `ProviderUnavailable`, `UnknownGroup` or `InvalidProvider`) `Provisioned` (`False` with `Quota`, `NoCapacity`, `Invalid` or `ProviderError` when the provider can't create the instances, or `JoinFailing`) `JoinFailing` (`True` with `TooManyFailures`) `ForeignNode` (`True` while a ready node of the group runs without an instance) `ScaleDownBlocked` (`True` when no node of the group may go; `retryAfter` is the time, RFC 3339, before which the autoscaler does not lower the scale again) `DeletionBlocked` (`True` with `DrainTimeout` when the deletion of the group has waited longer than `deletion.drain_timeout`) `Rolling` (`True` with `Replacing` while nodes are replaced; `False` with `UpToDate`, or with `Waiting`, `BackedOff`, `Paused` or `DryRun` when outdated nodes are not replaced) `RollBlocked` (`True` while a backed off replacement has a node close to its hard age limit, with the reason of the backoff and `retryAfter`) and `NetworkCovered` (`True` when `network` is inside the cluster ranges the deployer publishes, `False` when the firewall of the servers would not let the nodes in, `Unknown` with `NetworkUnchecked` when the ranges are not published or `NoNetwork` when the group names none). |

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
`ForeignNode`, `NodeIneligible`, `NetworkNotCovered`, and of the scale down `ScaleDown`,
`InstanceDeleted`, `ScaleDownBlocked`, `DrainStuck`, `NodeNotEmpty` and `ScaleDownCanceled`, of the
rolling replacement `Replacing`, `InstanceDeleted`, `Replaced`, `ReplacementCanceled`,
`ReplacementFailed`, `DrainStuck` and `WouldReplace`, and of the deletion of the group `Deleting`, `DrainStarted`, `InstanceDeleted`, `DeletionFailed` and
`DeletionBlocked`.

A node with the marks of the group (`norca.node_group`, `norca.instance`) whose instance the provider
does not have is reported once: down, it is what is left of a deleted instance; ready, it is
**foreign** (a bootstrap that left through the user data, for example) and is made ineligible for
new work. A second ready node with the name of an instance that has one is foreign too. Nodes without
the marks, installed by hand, are left alone.

## The removal of nodes

When the group has more instances than `spec.replicas`, the operator removes one at a time:

1. An instance whose node has not joined goes first, at once: nothing runs on it.
2. Otherwise a node is chosen by `policy.scale_down.selector`:
   - `least_busy` (the default): the node with the fewest allocations (the oldest of them on a tie)
     is drained with `drain_deadline` (15 minutes by default), with the built-in drainer, so the
     [disruption budgets](/docs/features/disruption-budget) apply. It does not choose a node that
     holds an allocation under `distinct_hosts` that no other node of the job's datacenters and pool
     could take; other constraints of the job are not checked.
   - `empty`: only a node without allocations (system jobs aside). It is made ineligible, looked at
     again after 10 seconds, and removed only if it is still empty; work that arrived meanwhile
     keeps it (`NodeNotEmpty`). Nothing is ever drained, for work that must not be interrupted.
3. A node with the meta `norca.scale.protect = "true"` is never chosen.
4. When the drain is complete, or the node still empty, the instance is deleted; its node, once
   down, is purged.

When no node may go, the condition `ScaleDownBlocked` is set with a `retryAfter` time (10 minutes,
doubled with each veto in a row, at most 6 hours), and the autoscaler sets the scale back. A drain
that has not finished 5 minutes after its deadline is stopped and the node made eligible again
(`DrainStuck`), with the same wait: no instance is deleted with an unfinished drain. A raise of the
scale before the instance is deleted keeps the node (`ScaleDownCanceled`).

The operator reads the jobs of the allocations on a node, so its ACL policy needs `read-job` in
every namespace (the `nodescaler-operator` pack has it). The wait for a load balancer to drop an
edge node before its proxy stops is not done yet.

## The rolling replacement of nodes

A node the operator created is replaced when it is **outdated**:

| Reason | When |
| --- | --- |
| `marked` | It has the meta `norca.scale.replace = "true"` (`norca node meta apply -node-id <id> norca.scale.replace=true`). |
| `revision` | Its revision (the meta `norca.node_group_revision`) is not the one of the template: `provider`, `group` and `spec.node`. Changing `spec.node` (a new image, for example) replaces every node. |
| `generation` | Its generation (the meta `norca.node_group_generation`) is below `rolling.generation`. Raising it replaces every node with the same template. |
| `age` | It is older than its soft limit: `rolling.max_node_age` less a fixed jitter of up to `rolling.jitter` (15%) from a hash of its name, so nodes created together are not all due on one day. Without `max_node_age` the limit is three quarters of the life of its certificate (45 of 60 days). |
| `expiry` | Its certificate expires within a twelfth of its life (55 of 60 days): the hard limit. The expiry is in the meta `norca.cert_expires`. |

A node with `norca.scale.protect = "true"` is not replaced. At most `rolling.max_unavailable` nodes
(1) are replaced at a time, those at their hard limit first, then the oldest, and none while the
group grows, shrinks or its nodes fail to join.

With `rolling.max_surge` at 1 or more (the default), **the new node comes first**: the old node gets
no new work and no longer counts in the scale, so the operator asks for one more instance. When the
new node is ready, the old one is emptied, its instance deleted and the node purged once down. With
`max_surge = 0` the old node is emptied first and replaced once its instance is deleted, and the
capacity dips meanwhile. Emptied means drained with `policy.scale_down.drain_deadline`, except for a
node outdated only by its age, or of a group with the selector `empty`: it gets no new work and goes
when its work has ended. A node at its hard limit is always drained.

A replacement is not scaling: `spec.replicas` does not change, `status.replicas` counts the nodes that
stay, and no scale down starts during it. When the provider refuses the new node (quota, capacity),
or the new node has not joined by `join.deadline` and 5 minutes, the old node is made eligible again
and the replacements are backed off (10 minutes, doubled each time, at most 6 hours); a node at its
hard limit is then replaced remove first. When a node of a backed off rollout is a week (or an
eighth of its life) from its hard limit, the condition `RollBlocked` says why.

`rolling.mode = "paused"` starts no replacement except at the hard limit, and lets the one in
progress finish. With `enforce = false` nothing is replaced: the outdated nodes are listed in
`status.rollout.outdated` and in a `WouldReplace` event.

## The deletion of a group

The operator puts its finalizer, `norca.io/nodescaler`, on a group before it asks for its first
instance, so `norca object delete` only marks the group, and the autoscaler leaves it alone. The
instances are then dealt with by `deletion.policy`:

- `drain` (the default): the node of every instance is drained with `policy.scale_down.drain_deadline`,
  and the instance is deleted once the drain is complete. An instance whose node has not joined,
  or is down, is deleted at once.
- `terminate`: every instance is deleted at once; the allocations of its node are placed again
  when the node goes down.
- `orphan`: the instances stay, with the labels of the group, and only the object goes.

The node of a deleted instance is purged once it is down (if it stays up for 15 minutes, it is left
as it is), and then the finalizer is removed and the object goes. What the deletion waits for is in
`status.deletion`. When it has waited longer than `deletion.drain_timeout` (1 hour by default), the
condition `DeletionBlocked` names it; the deletion goes on waiting until a person sets
`deletion.policy` to `terminate` or `orphan` (the spec of a group being deleted can still be
changed), which the operator applies at once.

An instance of a group that is gone (deleted with `orphan`, or whose finalizer was removed by force)
is an **orphan**. The operator deletes an orphan without a node once it is older than
`-orphan-after` (15 minutes). An orphan that runs a node is left as it is and reported with an
`OrphanedInstance` event in the log of its `NodeProvider`; it is deleted only when the operator runs
with `-delete-orphans` (the variable `delete_orphans` of the pack). Adding the finalizer and
writing the events of a provider need `manage-finalizers` on `NodeGroup` and `write-events` on
`NodeProvider`; the `nodescaler-operator` pack grants both since version 0.3.0.

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
