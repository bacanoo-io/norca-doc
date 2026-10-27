---
title: "length Function"
linkTitle: "length"
description: "The length function determines the length of a collection."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/collection/length.mdx"
---

`length` determines the length of a given list, map, or tuple.

If given a list, map, or tuple, the result is the number of elements in that
collection.

## Examples

```shell
> length([])
0
> length(["a", "b"])
2
> length({"a" = "b"})
1
```
