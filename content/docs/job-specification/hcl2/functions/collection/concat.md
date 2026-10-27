---
title: "concat Function"
linkTitle: "concat"
description: "The concat function combines two or more lists into a single list."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/collection/concat.mdx"
---

`concat` takes two or more lists and combines them into a single list.

## Examples

```shell
> concat(["a", ""], ["b", "c"])
[
  "a",
  "",
  "b",
  "c",
]
```
