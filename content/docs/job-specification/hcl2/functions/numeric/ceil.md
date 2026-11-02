---
title: "ceil Function"
linkTitle: "ceil"
description: "The ceil function returns the closest whole number greater than or equal to the given value."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/numeric/ceil.mdx"
---

`ceil` returns the closest whole number that is greater than or equal to the
given value, which may be a fraction.

## Examples

```shell
> ceil(5)
5
> ceil(5.1)
6
```

## Related Functions

- [`floor`](/docs/job-specification/hcl2/functions/numeric/floor/), which rounds to the nearest whole number _less than_
  or equal.
