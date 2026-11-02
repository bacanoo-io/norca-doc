---
title: "strrev Function"
linkTitle: "strrev"
description: "The strrev function reverses a string."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/string/strrev.mdx"
---

`strrev` reverses the characters in a string.
Note that the characters are treated as _Unicode characters_ (in technical terms, Unicode [grapheme cluster boundaries](https://unicode.org/reports/tr29/#Grapheme_Cluster_Boundaries) are respected).

```hcl
strrev(string)
```

## Examples

```shell
> strrev("hello")
olleh
> strrev("a ☃")
☃ a
```

## Related Functions

- [`reverse`](/docs/job-specification/hcl2/functions/collection/reverse/) reverses a sequence.
