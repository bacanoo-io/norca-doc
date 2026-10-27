---
title: "scaling Block"
linkTitle: "scaling"
description: "The \"scaling\" block specifies the scaling policy of a task group, evaluated by the built-in autoscaler of Norca or by an external autoscaler."
upstream:
  path: "website/content/docs/job-specification/scaling.mdx"
---

**Placement:**

- `job -> group -> scaling`
- `job -> group -> task -> scaling`

The `scaling` block configures the scaling options of a `group` or a `task`:
the bounds that Norca honors for `norca job scale` and job updates, and the
autoscaling policy. The policy of a group is evaluated either by the
[built-in autoscaler](/docs/features/autoscaler) of the servers (engine
`builtin`) or by an external autoscaler (engine `external`). This block is not
supported within jobs of type `system`.

When placed at the `group` level, the scaling policy is of type horizontal
application scaling and controls the value of [`count`][] for the group.

```hcl
job "example" {
  datacenters = ["dc1"]

  group "cache" {
    count = 1

    scaling {
      enabled = true
      engine  = "builtin"
      min     = 1
      max     = 10

      policy {
        evaluation_interval = "30s"
        cooldown            = "2m"

        check "cpu" {
          metric   = "nomad.cpu"
          strategy = "target-value"
          target   = 70
        }
      }
    }
    # ...
  }
}
```

When placed at the `task` level, the block must have a label indicating which
resource it relates to (`cpu` or `mem`); such policies describe vertical sizing
of the task's [`resources`][]. Norca keeps task level policies in the job (they
are visible in `norca job inspect` and the job API), but it does not list them in
the scaling policies API and does not evaluate them: the built-in
autoscaler only performs horizontal scaling, and a task level policy with
`engine = "builtin"` is rejected.

```hcl
task "redis" {
  # ...
  scaling "cpu" {
    enabled = true
    min     = 100
    max     = 500

    policy {
      # ...
    }
  }
}
```

## `scaling` Parameters

- `min` - <code>(int: nil)</code> - The minimum acceptable count for the task group.
  This is honored by the autoscaler, and by Norca during job updates and
  scaling operations. Defaults to the specified task group [`count`][].

- `max` - <code>(int: &lt;required&gt;)</code> - The maximum acceptable count for the
  task group. This is honored by the autoscaler, and by Norca during job updates
  and scaling operations.

- `enabled` - <code>(bool: true)</code> - Whether the scaling policy is enabled.
  This allows temporarily disabling an autoscaling policy without removing it.

- `engine` - <code>(string: "")</code> - (Norca) The autoscaler responsible for
  the policy: `builtin` (the built-in autoscaler of the servers) or `external`
  (an external autoscaler agent). When empty, the
  [`default_engine`](/docs/configuration/autoscaler#autoscaler-parameters) of the servers
  applies, which is `external` unless configured otherwise. A policy of the
  `builtin` engine is validated when the job is planned or submitted, and an
  enabled one is rejected while the built-in autoscaler is not enabled on the
  servers.

- `policy` - <code>(block: nil)</code> - The autoscaling policy. For the
  `builtin` engine it is a typed policy, described below and in
  [scaling policies][autoscaling_policy]. For the `external` engine it is opaque
  to Norca and passed unchanged to the external autoscaler.

## Norca typed policy

For the `builtin` engine the servers parse the `policy` block into typed fields,
apply the defaults of the [`autoscaler` server block](/docs/configuration/autoscaler)
and validate it. The parsed policy is returned by
[`GET /v1/scaling/policy/:id`](/docs/api/scaling-policies#read-scaling-policy)
next to the original document. The attributes of the `policy` block are:

- `evaluation_interval` `(string: <server default>)` - How often the policy is
  evaluated. Must not be lower than the server's `min_eval_interval` (default
  `10s`).

- `cooldown` `(string: <server default>)` - How long no further action is taken
  after a scaling action. Must not be lower than the server's `min_cooldown`
  (default `10s`).

- `cooldown_on_scale_up` `(string: <cooldown>)` - The cooldown after a scale up,
  if it should differ from `cooldown`.

- `on_check_error` `(string: "ignore")` - `fail` stops the evaluation when a
  check returns an error; `ignore` leaves the failed check out.

- `scale_during_deployment` `(string: "never")` - `never` skips the evaluation
  while a deployment of the job is active; `up_only` allows scaling up during a
  deployment, but not scaling down and not while canaries wait for promotion.

- `schedule` <code>(block: nil)</code> - Restricts the evaluation to a time
  window: `start` (a 5-field cron expression, UTC) and exactly one of `end` (a
  cron expression) or `duration`.

- `target` <code>(block: nil)</code> - Optional. `target "nomad-target"` (the
  task group, the default) accepts `dry-run = "true"`; `target "custom-object"`
  scales a custom object instead of the group. See
  [targets](/docs/features/autoscaler/reference/plugins/target).

- `check "<name>"` <code>(block: &lt;required&gt;)</code> - One or more checks.

A `check` block is written in one of two forms:

```hcl
# Typed form: the strategy is an attribute, its parameters are the
# other attributes of the check.
check "cpu" {
  metric   = "nomad.cpu"
  strategy = "target-value"
  target   = 70
}

# Autoscaler form: a labeled strategy block holds the parameters.
check "latency" {
  source = "prometheus"
  query  = "histogram_quantile(0.95, sum(rate(http_request_seconds_bucket{job=\"api\"}[1m])) by (le))"

  strategy "threshold" {
    upper_bound = 0.3
    delta       = 1
  }
}
```

- `metric` `(string: "")` - A built-in metric: `nomad.cpu`, `nomad.memory`
  (percent of the reservation), `nomad.cpu_mhz` or `nomad.memory_mb`. Cannot be
  combined with `query`.

- `source` `(string: "nomad-apm")` - The APM that runs `query`: `nomad-apm` or
  the name of an `apm` block of the server configuration.

- `query` `(string: "")` - The query sent to the APM. Required unless `metric`
  is set or the strategy is `fixed-value`.

- `query_window` `(string: "1m")` - The time range of the query, or `instant`
  for the latest value only.

- `query_window_offset` `(string: "0s")` - Shifts the query window into the past.

- `group` `(string: "")` - Groups checks with correlated metrics.

- `on_error` `(string: <on_check_error>)` - Overrides `on_check_error` for this
  check.

- `schedule` <code>(block: nil)</code> - A time window of the check, like the
  policy level `schedule`.

- `strategy` `(string or block: <required>)` - A built-in strategy
  (`target-value`, `threshold`, `fixed-value`, `pass-through`) or the name of a
  `strategy` block of the server configuration. In the typed form, the
  `threshold` strategy also accepts `upper` and `lower` as short names of
  `upper_bound` and `lower_bound`.

The validation at submission checks, among others: `min <= max`, a known
strategy and source, the required parameters of the built-in strategies (for
example `target` for `target-value`), at least one check, unique check names,
the lower bounds of the intervals, valid schedules, and that a `threshold` check
with `query_window = "instant"` sets `within_bounds_trigger = 1`.

[autoscaling_policy]: /docs/features/autoscaler/reference/policy/
[`count`]: /docs/job-specification/group#count 'Task Group specification'
[`resources`]: /docs/job-specification/task#resources 'Task specification'
