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
