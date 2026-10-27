---
title: "coalescelist Function"
linkTitle: "coalescelist"
description: "The coalescelist function takes any number of list arguments and returns the first one that isn't empty."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/collection/coalescelist.mdx"
---

`coalescelist` takes any number of list arguments and returns the first one
that isn't empty.

## Examples

```shell
> coalescelist(["a", "b"], ["c", "d"])
[
  "a",
  "b",
]
> coalescelist([], ["c", "d"])
[
  "c",
  "d",
]
```

To perform the `coalescelist` operation with a list of lists, use the `...`
symbol to expand the outer list as arguments:

```shell
> coalescelist([[], ["c", "d"]]...)
[
  "c",
  "d",
]
```

## Related Functions

- [`coalesce`](/docs/job-specification/hcl2/functions/collection/coalesce/) performs a similar operation with string
  arguments rather than list arguments.
