---
title: "disruption Block"
linkTitle: "disruption"
description: "The \"disruption\" block sets the disruption budget of a task group: how many allocations voluntary disruptions may take down at the same time. Norca addition."
aliases:
  - /docs/job-specification/disruption_budget/
---

**Placement:** `job -> group -> disruption`

The `disruption` block (Norca) sets the disruption budget of a task group. It
limits **voluntary disruptions**, node drains and evictions through the
eviction API, so that at least a given number of allocations stays healthy. See
[Disruption budget](/docs/features/disruption-budget) for the full behavior.

```hcl
job "api" {
  group "api" {
    count = 6

    disruption {
      min_healthy = 4        # or: max_unavailable = "25%"
    }
  }
}
```

The block is only valid in `service` jobs. Exactly one of `min_healthy` and
`max_unavailable` must be set.

## `disruption` Parameters

- `min_healthy` `(string: "")` - The number of allocations of the group that
  must remain healthy during voluntary disruptions. Either a count (`4` or
  `"4"`) or a percentage of the group `count` (`"75%"`). Percentages are rounded
  up. Cannot be combined with `max_unavailable`.

- `max_unavailable` `(string: "")` - The number of allocations of the group that
  may be unavailable at the same time because of voluntary disruptions. Either a
  count (`1`) or a percentage of the group `count` (`"25%"`, rounded up). The
  required number of healthy allocations is `count` minus this value. Cannot be
  combined with `min_healthy`.

Counts must not be negative, and percentages must be between `0%` and `100%`.

An allocation counts as healthy when it is running, is healthy according to the
deployment or migration health check, and is not already marked for migration.

## What the budget applies to

- **Node drains.** The drainer migrates only as many allocations as both the
  [`migrate`](/docs/job-specification/migrate) block (`max_parallel`) and the
  budget allow. At the drain deadline, or with `norca node drain -force`, the
  remaining allocations are stopped regardless of the budget.

- **Evictions.** [`norca alloc stop -respect-disruption`](/docs/commands/alloc/stop)
  and [`POST /v1/allocation/:alloc_id/evict`](/docs/api/allocations#evict-allocation)
  stop and reschedule the allocation only if the budget allows it, and fail with
  HTTP 429 otherwise.

The budget does not apply to reducing `count` (manually or by an autoscaler),
to deployments (governed by the [`update`](/docs/job-specification/update)
block), to involuntary events such as node failures, or to a plain
`norca alloc stop`.

While a deployment of the job is running, the budget holds back room for the
deployment's next step, so that a drain and the deployment together do not go
below the budget.

## `disruption` Examples

### Absolute minimum

```hcl
group "api" {
  count = 6

  disruption {
    min_healthy = 4
  }
}
```

### At most one instance down

```hcl
group "web" {
  count = 3

  disruption {
    max_unavailable = 1
  }
}
```

### Percentage

```hcl
group "workers" {
  count = 10

  disruption {
    max_unavailable = "25%"   # 3 of 10 (rounded up)
  }
}
```

Registration warns when a budget blocks every voluntary disruption (for example
`min_healthy = 3` with `count = 3`): node drains would then always wait for
their deadline.
