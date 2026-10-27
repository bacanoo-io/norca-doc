---
title: "abs Function"
linkTitle: "abs"
description: "The abs function returns the absolute value of the given number."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/numeric/abs.mdx"
---

`abs` returns the absolute value of the given number. In other words, if the
number is zero or positive then it is returned as-is, but if it is negative
then it is multiplied by -1 to make it positive before returning it.

## Examples

```shell
> abs(23)
23
> abs(0)
0
> abs(-12.4)
12.4
```
