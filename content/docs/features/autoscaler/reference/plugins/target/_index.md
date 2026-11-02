---
title: "Targets"
linkTitle: "Target"
description: "The target of a scaling policy is the task group of the policy or a custom object."
upstream:
  path: "website/content/tools/autoscaling/plugins/target/index.mdx"
---

The target determines where the resource to be autoscaled is located and how the
scaling actions determined by the autoscaler are executed. The built-in
autoscaler executes them itself, through internal calls of the servers; there
are no target plugins to configure.

A policy has one of two targets:

- the **task group** of the policy (horizontal application scaling), the
  default, described on the [task group target](/docs/features/autoscaler/reference/plugins/target/nomad)
  page;
- a **custom object** with a scale subresource, selected with
  `target "custom-object"` (see the same page).

Scaling the number of clients (horizontal cluster scaling) and the resources of
a task (vertical application scaling) are not available in the built-in
autoscaler.

## Common Policy Configuration Options

The task group target supports the following parameter in its `target` block:

- `dry-run` `(bool: false)` - If set to `true`, the target will not be scaled.
  The proposed action is still recorded as a scaling event without a count and
  published as a `ScalingDecision` event with `DryRun = true`.
