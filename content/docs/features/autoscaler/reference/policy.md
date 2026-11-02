---
title: "Scaling policies"
linkTitle: "Scaling policies"
weight: 10
description: "Scaling policies describe the desired state of a task group and how the built-in autoscaler computes the count that reaches it."
upstream:
  path: "website/content/tools/autoscaling/policy.mdx"
---

Scaling policies of the built-in autoscaler are written in the
[`scaling` block][jobspec_scaling_block] of a task group. There are no policy
files on disk: every policy belongs to a job and is stored by the servers. A
policy is evaluated by the built-in autoscaler when its engine is `builtin`;
policies of the `external` engine are opaque to Norca and are left to an
external autoscaler.

The servers parse the policy into typed fields when the job is planned or
submitted, apply the defaults of the [`autoscaler` server block][server_block]
and reject invalid policies, so errors show up in `norca job plan` and
`norca job run` instead of a log.

## Top Level Options

- `enabled` - A boolean flag that allows operators to administratively disable a
  policy from active evaluation. Defaults to `true`.

- `min` - The minimum count of the task group. This can be 0 or any positive
  integer. Defaults to the `count` of the group.

- `max` - The maximum count of the task group. This can be 0 or any positive
  integer, and must not be lower than `min`.

- `engine` - (Norca) `builtin` or `external`. Defaults to the `default_engine`
  of the servers.

## `policy` Options

- `cooldown` - A time interval after a scaling action during which no additional
  scaling will be performed on the task group. It should be provided as a
  duration (e.g.: `"5s"`, `"1m"`). If omitted the server's
  [`default_cooldown`][server_block] (default `5m`) is used. Must not be lower
  than the server's `min_cooldown`.

- `cooldown_on_scale_up` - The cooldown after a scale up action. Defaults to the
  value of `cooldown`.

- `evaluation_interval` - Defines how often the policy is evaluated. It should
  be provided as a duration (e.g.: `"5s"`, `"1m"`). If omitted the server's
  [`default_evaluation_interval`][server_block] (default `10s`) is used. Must not
  be lower than the server's `min_eval_interval`.

- `on_check_error` - Defines how to handle errors during check evaluation.
  Possible values are `"fail"` or `"ignore"`. If set to `"fail"` the policy
  evaluation will stop if any [`check`](#check-options) returns an error and no
  scaling action will take place. If set to `"ignore"` any errors returned by a
  `check` will be ignored when computing the scaling action. This value may be
  overridden individually by setting `on_error`. Defaults to `"ignore"`.

- `scale_during_deployment` - (Norca) `"never"` (default) skips the evaluation
  while a deployment of the job is active. `"up_only"` allows scaling up during
  an active deployment, but not scaling down and not while canaries wait for
  promotion.

- `schedule` - Restricts the evaluation of the policy to a recurring time window,
  see [`schedule` options](#schedule-options).

- `target` - Optional. Without it the policy scales its own task group. Detailed
  information can be found on the [Targets][target_plugin_docs] page.

- `check` - Specifies one or more checks to be executed when determining if a
  scaling action is required. At least one check is required and check names
  must be unique.

## `check` Options

A check is written either in the typed form, where `strategy` is an attribute
and the strategy parameters are the other attributes of the check, or in the
form of the external autoscaler, where a labeled `strategy` block holds the
parameters. Both forms can be mixed in one policy, but not in one check.

- `metric` - (Norca) A built-in metric computed by the leader from the usage the
  clients report: `nomad.cpu`, `nomad.memory`, `nomad.cpu_mhz` or
  `nomad.memory_mb`. It needs no query and cannot be combined with `query`.
  See the [`nomad-apm`][nomad_apm] page.

- `source` - The APM that should handle the metric query: `nomad-apm` (the
  default) or the name of an [`apm` block][server_block] of the server
  configuration.

- `query` - The query to run against the specified APM. The query should return
  a single value. Detailed information on the configuration options can be found
  on the [APM Plugins][apm_plugin_docs] page. Required unless `metric` is set or
  the strategy is `fixed-value`.

- `query_window` - Defines how far back to query the APM for metrics. It should
  be provided as a duration (e.g.: `"5s"`, `"1m"`), or as `"instant"` to query
  only the latest value. Defaults to `1m`.

- `query_window_offset` - Shifts the end of the query window into the past. It
  should be provided as a duration. Defaults to `0s`.

- `group` - Specifies which checks should treated as correlated when the policy
  is evaluated. Refer to [Check Grouping][concepts_grouping] for more
  information.

- `on_error` - Defines how to handle errors during the `check` evaluation.
  Possible values are `"fail"` or `"ignore"`. If set to `"fail"` the policy
  evaluation will stop in case an error occurs and no scaling action will take
  place. If set to `"ignore"` the result of this `check` will not be taken into
  consideration when computing the scaling action. If not set the value of
  `on_check_error` will be used.

- `schedule` - Restricts the check to a recurring time window. Outside the
  window the check is left out of the evaluation.

- `strategy` - The strategy used to calculate the desired count from the current
  count and the metric. In the typed form it is the name of the strategy; in
  the block form the label is the name and the body holds the parameters.
  Detailed information can be found on the [Strategy Plugins][strategy_plugin_docs]
  page.

### `schedule` Options

```hcl
schedule {
  start    = "0 8 * * 1-5"
  duration = "10h"
}
```

- `start` - A cron expression in the strict 5-field format (minute, hour, day of
  month, month, day of week), evaluated in UTC. Required.

- `end` - A cron expression that ends the window. Exactly one of `end` and
  `duration` must be set.

- `duration` - The length of the window after each `start`.

### Example in a Job

```hcl
job "example" {
  group "app" {
    scaling {
      enabled = true
      engine  = "builtin"
      min     = 2
      max     = 10

      policy {
        evaluation_interval = "30s"
        cooldown            = "1m"

        # Typed form with a built-in metric.
        check "cpu" {
          metric   = "nomad.cpu"
          strategy = "target-value"
          target   = 70
        }

        # Block form with a Prometheus APM named "prometheus" in the
        # server's autoscaler block.
        check "active_connections" {
          source = "prometheus"
          query  = "scalar(open_connections_example_cache)"

          strategy "target-value" {
            target = 10
          }
        }
      }
    }
  }
}
```

## Validation

For the `builtin` engine a policy is rejected at submission if, among others:

- `min` is negative or larger than `max`, or the policy type is not `horizontal`;
- there is no check, or two checks have the same name;
- a check has no strategy, uses an unknown strategy or source (the available
  ones are listed in the error), or misses a required strategy parameter;
- a check sets both `metric` and `query`, uses an unknown built-in metric, or
  has no query although its strategy needs metrics;
- `evaluation_interval`, `cooldown` or `cooldown_on_scale_up` is negative or
  below the server's lower bound;
- `on_check_error`, `on_error` or `scale_during_deployment` has an unknown value;
- a `schedule` is invalid;
- a `threshold` check uses `query_window = "instant"` without
  `within_bounds_trigger = 1`;
- the built-in autoscaler is not enabled on the servers and the policy is
  enabled.

## Not applicable to Norca

The external autoscaler also reads policy files from a `policy_dir` and scales
clusters through cloud target plugins, and its enterprise edition sizes task
resources (Dynamic Application Sizing). None of these exist in the built-in
autoscaler: policies come only from jobs, the only targets are the task group
and custom objects, and task level `scaling "cpu"` and `scaling "mem"` blocks
are stored but not evaluated.

[concepts_grouping]: /docs/features/autoscaler/reference/concepts/policy-eval/checks#check-grouping
[server_block]: /docs/configuration/autoscaler
[target_plugin_docs]: /docs/features/autoscaler/reference/plugins/target/
[strategy_plugin_docs]: /docs/features/autoscaler/reference/plugins/strategy/
[apm_plugin_docs]: /docs/features/autoscaler/reference/plugins/apm/
[nomad_apm]: /docs/features/autoscaler/reference/plugins/apm/nomad
[jobspec_scaling_block]: /docs/job-specification/scaling/
