---
title: "Strategy Plugins"
description: "How to write an external strategy plugin for the built-in autoscaler."
upstream:
  path: "website/content/tools/autoscaling/concepts/plugins/strategy.mdx"
---

Strategy plugins are used by the autoscaler to implement the logic of a scaling
strategy. They consume the metrics returned by the APM of a check and the
current count of the scaling target, and compute a new desired count.

For a real-world example of a strategy plugin implementation, see the
[`target-value` plugin][target_value] of Norca.

## Authoring Strategy Plugins

Authoring a strategy plugin in Go can be accomplished by implementing the
strategy interface of the plugin SDK, alongside a `main` package that serves the
plugin with the autoscaler's go-plugin handshake. Install the binary in the
server's `plugin_dir` and reference it with a `strategy` block of the
[`autoscaler` server block](/docs/configuration/autoscaler). Checks then use the
name of that block as their `strategy`.

The servers can only validate the parameters of the built-in strategies at job
submission. The parameters of an external strategy are passed to the plugin
unchecked, as strings.

## Strategy Plugin API

The base plugin interface must be implemented in addition to the
following functions.

#### `Run(eval *sdk.ScalingCheckEvaluation, count int64) (*sdk.ScalingCheckEvaluation, error)`

The `Run` function is called by the leader during policy evaluation. The `eval`
argument contains information about the current policy evaluation, including the
check, its strategy parameters and the metrics from the APM. The `count`
argument is the current count of the scaling target. The returned struct should
include the result from applying the strategy.

[target_value]: https://github.com/bacanoo-io/norca/tree/main/nomad/nomad/autoscaler/plugins/strategy/targetvalue
