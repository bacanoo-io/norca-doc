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
  change, the built-in metrics report insufficient data until one full window
  has been collected. Must not be shorter than `client_metrics_interval`.

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
