---
title: "Fixed Value Strategy Plugin"
linkTitle: "Fixed Value"
description: "The \"fixed-value\" strategy plugin sets a pre-defined value when scaling."
upstream:
  path: "website/content/tools/autoscaling/plugins/strategy/fixed-value.mdx"
---

The `fixed-value` strategy receives a count value as an input configuration
option and returns a scaling action whose count is set to the same value. This
strategy is useful in situations where there’s a known baseline for the
infrastructure that does not change often.

## Server Configuration Options

The `fixed-value` strategy is built into Norca and always available under its own
name; it needs no `strategy` block in the server's
[`autoscaler` block](/docs/configuration/autoscaler).

## Policy Configuration Options

```hcl
# Typed form
check "fixed-value-check" {
  strategy = "fixed-value"
  value    = 3
}

# Block form
check "fixed-value-check" {
  strategy "fixed-value" {
    value = 3
  }
}
```

- `value` `(int: <required>)` - The value used by the autoscaler to set the
  target count. Validated at job submission.

The `fixed-value` strategy needs no metric, so the check needs neither `query`
nor `metric`. It is often combined with a [`schedule`](/docs/features/autoscaler/reference/policy#schedule-options)
to set a known count during a time window.
