---
title: "min Function"
linkTitle: "min"
description: "The min function takes one or more numbers and returns the smallest number."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/numeric/min.mdx"
---

`min` takes one or more numbers and returns the smallest number from the set.

## Examples

```shell
> min(12, 54, 3)
3
```

If the numbers are in a list or set value, use `...` to expand the collection
to individual arguments:

```shell
> min([12, 54, 3]...)
3
```

## Related Functions

- [`max`](/docs/job-specification/hcl2/functions/numeric/max/), which returns the _greatest_ number from a set.
