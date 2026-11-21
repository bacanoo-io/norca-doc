---
title: "Strategy Plugins"
linkTitle: "Strategy"
description: "Strategy plugins compare the current state of the system against the desired state."
upstream:
  path: "website/content/tools/autoscaling/plugins/strategy/index.mdx"
---

Strategy plugins compare the current state of the system against the desired state
defined by the operator in the scaling policy and generate an action that will
bring the system closer to the desired state. In practical terms, strategies
receive the current value and a metric value for a resource and output what the
new value should be.

**A metric that is not a finite number** (an infinite ratio over zero, `NaN`)
is a failed query: [`on_error`](/docs/features/autoscaler/reference/policy)
decides, and the group is not scaled by it. The counts a strategy computes
stop at the ends of the range of a count instead of wrapping around, and a
count below the minimum of the policy is raised to the minimum.

The settings of a strategy are checked when the job is submitted and again
each time the strategy runs, so a policy stored before a check was added fails
its check instead of scaling the wrong way.
