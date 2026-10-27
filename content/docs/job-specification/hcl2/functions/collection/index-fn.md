---
title: "index Function"
linkTitle: "index"
description: "The index function returns an element from the given list or map using the given index or key."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/collection/index-fn.mdx"
---

`index` finds the element at the index when handling lists, or the element at
the key when handling maps.

```hcl
index(list, value)
```

## Examples

```shell
> index(["a", "b", "c"], 1)
"b"
```

```shell
> index({"a"=1, "c"=2, "d"=3}, "c")
2
```

## Related Functions

- [`element`](/docs/job-specification/hcl2/functions/collection/element/) retrieves a particular element from a list given
  its index.
