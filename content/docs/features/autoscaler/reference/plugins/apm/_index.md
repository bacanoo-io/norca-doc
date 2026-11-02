---
title: "APM Plugins"
linkTitle: "APM"
description: "APM plugins provide metric data points describing the current state of a task group."
upstream:
  path: "website/content/tools/autoscaling/plugins/apm/index.mdx"
---

Application Performance Management (APM) tools are used to store metrics about
an application's performance and its current state. The APM plugins are
responsible for querying an APM and returning a time series which will be used
to determine if scaling should occur.

A check selects its APM with `source`. The built-in autoscaler provides the
[`nomad-apm`](/docs/features/autoscaler/reference/plugins/apm/nomad) source (the
default) and the [`prometheus`](/docs/features/autoscaler/reference/plugins/apm/prometheus)
driver; other APMs can be added as external plugins.
