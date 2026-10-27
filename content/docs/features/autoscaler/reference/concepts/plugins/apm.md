---
title: "APM Plugins"
description: "How to write an external APM plugin for the built-in autoscaler."
upstream:
  path: "website/content/tools/autoscaling/concepts/plugins/apm.mdx"
---

APM plugins are used by the autoscaler to interact with an external APM system,
returning metrics that are used by the autoscaler to inform scaling actions.

For a real-world example of an APM plugin implementation, see the
[`prometheus` plugin](https://github.com/bacanoo-io/norca/tree/main/nomad/nomad/autoscaler/plugins/apm/prometheus)
of Norca.

## Authoring APM Plugins

Authoring an APM plugin in Go can be accomplished by implementing the APM
interface of the plugin SDK, alongside a `main` package that serves the plugin
with the autoscaler's go-plugin handshake. Install the binary in the server's
`plugin_dir` and reference it with an `apm` block of the
[`autoscaler` server block](/docs/configuration/autoscaler).

## APM Plugin API

The base plugin interface must be implemented in addition to the
following functions.

#### `Query(query string, timeRange sdk.TimeRange) (sdk.TimestampedMetrics, error)`

The `Query` function is called by the leader during policy evaluation. The
`query` argument is the opaque string from the scaling policy, and the
`timeRange` indicates the period of time over which the query should be made.
The response is a series of timestamped metrics; as such, the query semantics
should be such that the backing APM will return a time series. An example is the
CPU utilization of a task group, averaged over all current allocations.

#### `QueryMultiple(query string, timeRange sdk.TimeRange) ([]sdk.TimestampedMetrics, error)`

The `QueryMultiple` method is similar to `Query`, except that the interface
allows multiple time series to be returned. The external autoscaler uses it for
Dynamic Application Sizing, which Norca does not implement; a plugin still has
to provide it.
