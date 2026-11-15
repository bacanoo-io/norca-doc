---
title: "Placement rules: distinct hosts, affinity and anti-affinity"
linkTitle: "Placement rules compared"
weight: 29
description: "Which rule keeps allocations apart or together, and how: distinct_hosts, distinct_property, affinity, spread, the built-in job anti-affinity, colocate and separate. Which of them filter nodes and which only score them."
---

## What and why

Several parts of a job decide where its allocations go, and their names
overlap: `distinct_hosts` keeps instances apart, an `affinity` with a negative
weight is often called an anti-affinity, and the scheduler has an anti-affinity
of its own. They work differently. Two questions tell them apart:

- **Hard or soft?** A hard rule is a filter: a node that breaks it is not a
  candidate, and **an allocation that has no candidate left is not placed**. A
  soft rule is a score: it orders the candidates, and **the allocation is placed
  even if the rule cannot be met**.
- **Does it look at the node or at other allocations?** `affinity` compares
  properties of the node. `distinct_hosts` and `separate` look at the
  allocations that are already there.

## The rules side by side

| Rule | Looks at | Kind |
| --- | --- | --- |
| [`constraint`](/docs/job-specification/constraint) with an attribute | properties of the node | hard |
| [`distinct_hosts`](/docs/job-specification/constraint#operator-values) | allocations of the same job, or of the same group, on the node | hard |
| [`distinct_property`](/docs/job-specification/constraint#operator-values) | allocations of the same job per value of a node property (for example per rack) | hard |
| [`affinity`](/docs/job-specification/affinity) | properties of the node | soft, weight -100 to 100 |
| [`spread`](/docs/job-specification/spread) | the share of the group's allocations per value of a node property | soft |
| job anti-affinity (built in) | allocations of the same group on the node | soft |
| [`colocate`](/docs/job-specification/colocate), [`separate`](/docs/job-specification/separate) | allocations selected by their `meta`, of any job, per node, datacenter or other domain | hard with `required = true`, soft with a `weight` |

## `distinct_hosts`: never two on one node

```hcl
group "db" {
  count = 3

  constraint {
    distinct_hosts = true
  }
}
```

- **It is a filter.** A node that already holds such an allocation is left
  out.
- **The level decides what "such" means.** In a `group`, no two allocations of
  that group share a node. In the `job`, no two allocations of the job share a
  node, whichever group they belong to.
- **The count cannot exceed the number of nodes that fit.** The remaining
  allocations wait (the evaluation is blocked) until a node appears;
  `norca job status` shows `distinct_hosts` as the reason the nodes were
  filtered.
- **An update that adds instances before it stops old ones needs a free
  node**, for example canaries.
- `distinct_hosts = false` switches the rule off where it is written. It does
  not cancel a rule of the job from inside a group.

## `affinity`: a preference about nodes

```hcl
affinity {
  attribute = "${node.class}"
  value     = "ssd"
  weight    = 80
}
```

- **It is a score, never a filter.** A positive weight prefers the nodes that
  match, **a negative weight avoids them**; that is the "anti-affinity" of this
  block.
- **It does not see other allocations.** An `affinity` cannot say "not next to
  another instance"; it can only say "not on nodes of this kind".
- The score of a node is the sum of the weights that match, divided by the sum
  of the absolute weights. It is averaged with the other scores of the node
  (bin packing, job anti-affinity, spread).

## The built-in job anti-affinity

Nothing has to be written for it. For service and batch jobs, a node that
already holds allocations of the same group gets a penalty that grows with
their number (with `n` of them on the node: `-(n+1) / count`).

- **Instances are spread over the nodes when there is room.**
- **It is soft**: with fewer nodes than instances, they share nodes and the job
  runs.

## Anti-affinity between allocations: `separate`

`separate` and `colocate` are the rules that look at **other allocations**,
of the same job or of other jobs, selected by the `meta` of their job and
group. They can be hard or soft, and "apart" can mean the node, the datacenter
or any node property:

```hcl
job "db" {
  meta {
    app = "postgres"
  }

  group "replica" {
    count = 3

    # Prefer one replica per datacenter, but run anyway.
    separate {
      selector {
        app = "postgres"
      }
      scope  = "${node.datacenter}"
      weight = 80
    }
  }
}
```

With `scope = "${node.unique.id}"` and `required = true`, and a selector that
matches the group itself, `separate` does what `distinct_hosts` does. See
[Cross-job affinity and anti-affinity](/docs/features/cross-job-affinity).

## Which one to use

| Goal | Rule |
| --- | --- |
| Two instances of a group must never share a node | `distinct_hosts` in the group |
| Allocations of several jobs must never share a node or a datacenter | `separate` with `required = true` |
| At most N instances per rack or zone | `distinct_property` with `value = "N"` |
| Instances should be on different nodes, but must run | nothing: the built-in job anti-affinity |
| Instances should be spread evenly over datacenters or racks | `spread` |
| Keep away from the allocations of another job if possible | `separate` with a `weight` |
| Run next to the allocations of another job | `colocate` |
| Prefer or avoid a kind of node | `affinity` with a positive or negative weight |
| Run only on a kind of node | `constraint` |

> [!IMPORTANT]
> **A hard rule can stop a job from scaling or updating**: when the instances
> can outnumber the nodes (or the datacenters) that fit, for example under the
> autoscaler, use a soft rule.

## Good to know

- **Every rule applies when an allocation is placed.** A running allocation is
  not moved because a rule is no longer met.
- **Soft rules are best effort.** The scheduler does not score every node: with
  an `affinity`, a `spread` or a preferred `colocate` or `separate` it scores
  up to 100 candidates (or as many as the group's count, if that is larger);
  without them, a handful. The chosen node is the best of those.
- **The reason is visible.** `norca job plan` and `norca job status` name the
  rule that filtered nodes; `norca alloc status -verbose` lists the scores of
  the chosen node (`job-anti-affinity`, `node-affinity`, `allocation-spread`).
