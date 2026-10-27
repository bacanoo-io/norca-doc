---
title: "split Function"
linkTitle: "split"
description: "The split function produces a list by dividing a given string at all occurrences of a given separator."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/string/split.mdx"
---

`split` produces a list by dividing a given string at all occurrences of a
given separator.

```hcl
split(separator, string)
```

## Examples

```shell
> split(",", "foo,bar,baz")
[
  "foo",
  "bar",
  "baz",
]
> split(",", "foo")
[
  "foo",
]
> split(",", "")
[
  "",
]
```

## Related Functions

- [`join`](/docs/job-specification/hcl2/functions/string/join/) performs the opposite operation: producing a string
  joining together a list of strings with a given separator.
