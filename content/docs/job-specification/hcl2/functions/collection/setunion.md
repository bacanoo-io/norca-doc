---
title: "setunion Function"
linkTitle: "setunion"
description: "The setunion function takes multiple sets and produces a single set containing the elements from all of the given sets."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/collection/setunion.mdx"
---

The `setunion` function takes multiple sets and produces a single set
containing the elements from all of the given sets. In other words, it
computes the [union](https://en.wikipedia.org/wiki/Union_(set_theory)>) of
the sets.

```hcl
setunion(sets...)
```

## Examples

```shell
> setunion(["a", "b"], ["b", "c"], ["d"])
[
  "d",
  "b",
  "c",
  "a",
]
```

The given arguments are converted to sets, so the result is also a set and
the ordering of the given elements is not preserved.

## Related Functions

- [`contains`](/docs/job-specification/hcl2/functions/collection/contains/) tests whether a given list or set contains
  a given element value.
- [`setintersection`](/docs/job-specification/hcl2/functions/collection/setintersection/) computes the _intersection_ of
  multiple sets.
- [`setproduct`](/docs/job-specification/hcl2/functions/collection/setproduct/) computes the _Cartesian product_ of multiple
  sets.
