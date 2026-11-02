---
title: "strlen Function"
linkTitle: "strlen"
description: "The strlen function determines the length of a string."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/string/strlen.mdx"
---

`strlen` determines the length of a given string.

```hcl
strlen(string)
```

## Examples

```shell
> length("hello")
5
```

When given a string, the result is the number of characters, rather than the
number of bytes or Unicode sequences that form them:

```shell
> length("👾🕹️")
2
```

A "character" is a _grapheme cluster_, as defined by
[Unicode Standard Annex #29](http://unicode.org/reports/tr29/). Note that
remote APIs may have a different definition of "character" for the purpose of
length limits on string arguments; a Norca provider is responsible for
translating Norca's string representation into that used by its respective
remote system and applying any additional validation rules to it.
