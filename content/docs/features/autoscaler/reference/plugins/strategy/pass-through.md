---
title: "Pass-Through Strategy Plugin"
linkTitle: "Pass-Through"
description: "The \"pass-through\" strategy plugin passes the query result directly to the target."
upstream:
  path: "website/content/tools/autoscaling/plugins/strategy/pass-through.mdx"
---

The `pass-through` strategy is a very simple, yet useful strategy. It does not
add any extra computation on top of the metric query result, and instead uses
the APM query result as the scaling count. Its only options limit the size
of a single scaling action.

This allows the autoscaler to be integrated into systems where the
scaling computation is done externally like an edge router, or easily derived
from a query such as running one allocation per item in a queue.

## Server Configuration Options

The `pass-through` strategy is built into Norca and always available under its own
name; it needs no `strategy` block in the server's
[`autoscaler` block](/docs/configuration/autoscaler).

## Policy Configuration Options

```hcl
# Typed form
check "pass-through-check" {
  source   = "prometheus"
  query    = "..."
  strategy = "pass-through"
}

# Block form
check "pass-through-check" {
  source = "prometheus"
  query  = "..."
  strategy "pass-through" {
    max_scale_up = 5
  }
}
```

- `max_scale_up` `(int: <none>)` - The maximum number of instances added by one
  scaling action.

- `max_scale_down` `(int: <none>)` - The maximum number of instances removed by
  one scaling action.
