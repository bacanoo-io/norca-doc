---
title: "coalesce Function"
linkTitle: "coalesce"
description: "The coalesce function takes any number of arguments and returns the first one that isn't null nor empty."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/collection/coalesce.mdx"
---

`coalesce` takes any number of arguments and returns the first one
that isn't null or an empty string.

## Examples

```shell
> coalesce("a", "b")
a
> coalesce("", "b")
b
> coalesce(1,2)
1
```

To perform the `coalesce` operation with a list of strings, use the `...`
symbol to expand the list as arguments:

```shell
> coalesce(["", "b"]...)
b
```

## Related Functions

- [`coalescelist`](/docs/job-specification/hcl2/functions/collection/coalescelist/) performs a similar operation with
  list arguments rather than individual arguments.
