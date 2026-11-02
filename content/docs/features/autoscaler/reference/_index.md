---
title: "Autoscaler reference"
linkTitle: "Reference"
weight: 1
description: "Scaling policies, strategies, APMs, targets, plugins and telemetry of the built-in autoscaler."
---

These pages describe the parts of the [built-in autoscaler](/docs/features/autoscaler)
that a scaling policy uses. They are adapted from the documentation of the
external autoscaler agent of Nomad v1.6.5: the policy syntax, the strategies and
the APMs are the same, while the agent itself (its configuration file, command
line, HTTP API and cluster scaling targets) does not exist in Norca. The server
side configuration is the [`autoscaler` block](/docs/configuration/autoscaler).

{{< cards >}}
  {{< card link="/docs/features/autoscaler/reference/policy" title="Scaling policies" >}}
  {{< card link="/docs/features/autoscaler/reference/concepts" title="Concepts" >}}
  {{< card link="/docs/features/autoscaler/reference/plugins" title="Plugins" >}}
  {{< card link="/docs/features/autoscaler/reference/telemetry" title="Telemetry" >}}
{{< /cards >}}
