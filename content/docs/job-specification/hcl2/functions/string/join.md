---
title: "join Function"
linkTitle: "join"
description: "The join function produces a string by concatenating the elements of a list with a given delimiter."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/string/join.mdx"
---

`join` produces a string by concatenating together all elements of a given
list of strings with the given delimiter.

```hcl
join(separator, list)
```

## Examples

```shell
> join(", ", ["foo", "bar", "baz"])
foo, bar, baz
> join(", ", ["foo"])
foo
```

## Related Functions

- [`split`](/docs/job-specification/hcl2/functions/string/split/) performs the opposite operation: producing a list
  by separating a single string using a given delimiter.
