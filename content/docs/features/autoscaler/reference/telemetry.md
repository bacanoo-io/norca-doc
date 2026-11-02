---
title: "Autoscaler telemetry"
linkTitle: "Telemetry"
weight: 40
description: "The runtime metrics of the built-in autoscaler and of dynamic admission control."
upstream:
  path: "website/content/tools/autoscaling/telemetry.mdx"
---

The built-in autoscaler runs inside the server, so its metrics are part of the
server's telemetry: they are configured with the agent's
[`telemetry` block](/docs/configuration/telemetry), are available from the
[`/v1/metrics`](/docs/api/metrics) endpoint, and are dumped to `stderr` when
the agent receives `USR1` (on Windows `BREAK`) like every other agent metric.
There is no separate autoscaler process and no separate telemetry
configuration.

The metrics are emitted by the leader, which runs the autoscaler. With the
default telemetry settings their names start with `nomad.nomad.autoscaler.`.

## Policy metrics

| Metric | Description | Unit | Type |
| --- | --- | --- | --- |
| `nomad.nomad.autoscaler.policies` | The number of `builtin` policies being evaluated | Number of policies | Gauge |
| `nomad.nomad.autoscaler.policy.invalid` | Policies that could not be loaded for evaluation | Number of policies | Counter |
| `nomad.nomad.autoscaler.queue` | Policies waiting for a free evaluation worker | Number of policies | Gauge |
| `nomad.nomad.autoscaler.evaluate` | Time taken to evaluate one policy | Milliseconds | Timer |
| `nomad.nomad.autoscaler.evaluate.skipped` | Evaluations skipped because of a cooldown or a suspension | Number of evaluations | Counter |
| `nomad.nomad.autoscaler.evaluate.deployment` | Evaluations skipped because of an active deployment | Number of evaluations | Counter |

## Plugin metrics

| Metric | Description | Unit | Type | Labels |
| --- | --- | --- | --- | --- |
| `nomad.nomad.autoscaler.apm.query` | Time taken by an APM query | Milliseconds | Timer | `plugin_name` (the check source) |
| `nomad.nomad.autoscaler.strategy.run` | Time taken by a strategy | Milliseconds | Timer | `plugin_name` (the strategy) |
| `nomad.nomad.autoscaler.plugin.exited` | External plugin processes that exited unexpectedly | Number of exits | Counter | `plugin_name` |

## Scaling action metrics

| Metric | Description | Unit | Type |
| --- | --- | --- | --- |
| `nomad.nomad.autoscaler.scale.invoke` | Time taken by a scaling action | Milliseconds | Timer |
| `nomad.nomad.autoscaler.scale.success` | Successful scaling actions | Number of actions | Counter |
| `nomad.nomad.autoscaler.scale.error` | Failed scaling actions | Number of actions | Counter |
| `nomad.nomad.autoscaler.scale.noop` | Actions skipped because the job had an active deployment | Number of actions | Counter |
| `nomad.nomad.autoscaler.scale.rate_limited` | Actions dropped by the cluster-wide rate limit | Number of actions | Counter |
| `nomad.nomad.autoscaler.scale.quota_capped` | Scale ups capped by the namespace quota | Number of actions | Counter |
| `nomad.nomad.autoscaler.oscillation.suspended` | Task groups suspended by the oscillation protection | Number of suspensions | Counter |

## Usage collector metrics

| Metric | Description | Unit | Type |
| --- | --- | --- | --- |
| `nomad.nomad.autoscaler.usage.groups` | Task groups with usage data on the leader | Number of task groups | Gauge |
| `nomad.nomad.autoscaler.usage.dropped` | Usage reports dropped because the collector holds its maximum of 100,000 task groups | Number of reports | Counter |

## Admission control metrics

[Dynamic admission control](/docs/features/admission-control) also runs on the
leader and emits:

| Metric | Description | Unit | Type | Labels |
| --- | --- | --- | --- | --- |
| `nomad.nomad.admission.denied` | Jobs and Variables writes rejected | Number of rejections | Counter | `controller` (`policy` or `webhook`), `name` |
| `nomad.nomad.admission.webhook.calls` | Calls of an admission webhook | Number of calls | Counter | `webhook` |
| `nomad.nomad.admission.webhook.errors` | Failed calls of an admission webhook | Number of calls | Counter | `webhook` |
| `nomad.nomad.admission.webhook.latency` | Time taken by an admission webhook call | Milliseconds | Timer | `webhook` |
