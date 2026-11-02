---
title: "sort Function"
linkTitle: "sort"
description: "The sort function takes a list of strings and returns a new list with those strings sorted lexicographically."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/collection/sort.mdx"
---

`sort` takes a list of strings and returns a new list with those strings
sorted lexicographically.

The sort is in terms of Unicode codepoints, with higher codepoints appearing
after lower ones in the result.

## Examples

```shell
> sort(["e", "d", "a", "x"])
[
  "a",
  "d",
  "e",
  "x",
]
```
