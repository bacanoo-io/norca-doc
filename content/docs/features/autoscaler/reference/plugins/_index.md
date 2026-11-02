---
title: "Autoscaler plugins"
linkTitle: "Plugins"
weight: 30
description: "The APMs, strategies and targets available to the scaling policies of the built-in autoscaler."
upstream:
  path: "website/content/tools/autoscaling/plugins/index.mdx"
---

Plugins are an essential part of the autoscaler architecture. Each plugin type
is responsible for a specific task: APM plugins retrieve metrics about the
workloads being monitored, and strategy plugins decide the scaling action that
satisfies the scaling policy. The scaling action itself is executed by the
servers on the policy's [target](/docs/features/autoscaler/reference/plugins/target/).

Norca ships with these built-in plugins:

| Type | Name | Notes |
| --- | --- | --- |
| APM | [`nomad-apm`](/docs/features/autoscaler/reference/plugins/apm/nomad) | Built-in metrics from the usage reported by clients; always available |
| APM | [`prometheus`](/docs/features/autoscaler/reference/plugins/apm/prometheus) | Needs an `apm` block with the address of the server |
| Strategy | [`target-value`](/docs/features/autoscaler/reference/plugins/strategy/target-value) | Keeps a metric near a target value |
| Strategy | [`threshold`](/docs/features/autoscaler/reference/plugins/strategy/threshold) | Acts when a metric is within bounds |
| Strategy | [`fixed-value`](/docs/features/autoscaler/reference/plugins/strategy/fixed-value) | Sets a fixed count |
| Strategy | [`pass-through`](/docs/features/autoscaler/reference/plugins/strategy/pass-through) | Uses the metric as the count |

The flexibility of plugins allows the autoscaler to be extended to meet specific
requirements: external APM and strategy plugins are loaded from the server's
`plugin_dir` (see [plugin concepts](/docs/features/autoscaler/reference/concepts/plugins/)).

## Not applicable to Norca

The external autoscaler agent connects its plugins to the cluster with a set of
`nomad_*` options (address, region, namespace, token, TLS files). The built-in
plugins run inside the server and use its state directly, so these options do
not exist. The Datadog APM and the cloud target plugins of the external
autoscaler are not built in; external target plugins are not loaded.

## Loading External Plugins

To use an external plugin, copy the plugin binary to a directory on every server
and set that directory as [`plugin_dir`](/docs/configuration/autoscaler), along
with an [`apm`](/docs/configuration/autoscaler#apm-block) or
[`strategy`](/docs/configuration/autoscaler#strategy-block) block whose `driver`
is the name of the binary.
