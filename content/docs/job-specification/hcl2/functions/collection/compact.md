---
title: "compact Function"
linkTitle: "compact"
description: "The compact function removes empty string elements from a list."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/collection/compact.mdx"
---

`compact` takes a list of strings and returns a new list with any empty string
elements removed.

## Examples

```shell
> compact(["a", "", "b", "c"])
[
  "a",
  "b",
  "c",
]
```
