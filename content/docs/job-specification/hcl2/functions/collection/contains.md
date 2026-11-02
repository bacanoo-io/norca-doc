---
title: "contains Function"
linkTitle: "contains"
description: "The contains function determines whether a list or set contains a given value."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/collection/contains.mdx"
---

`contains` determines whether a given list or set contains a given single value
as one of its elements.

```hcl
contains(list, value)
```

## Examples

```shell
> contains(["a", "b", "c"], "a")
true
> contains(["a", "b", "c"], "d")
false
```
