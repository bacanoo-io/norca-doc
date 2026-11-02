---
title: "replace Function"
linkTitle: "replace"
description: "The replace function searches a given string for another given substring, and replaces all occurrences with a given replacement string."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/string/replace.mdx"
---

`replace` searches a given string for another given substring, and replaces
each occurrence with a given replacement string.

```hcl
replace(string, substring, replacement)
```

## Examples

```shell
> replace("1 + 2 + 3", "+", "-")
1 - 2 - 3

> replace("hello world", "world", "everybody")
hello everybody
```

## Related Functions

- [`regex_replace`](/docs/job-specification/hcl2/functions/string/regex_replace/) searches a given string for another given substring,
  and replaces each occurrence with a given replacement string.
