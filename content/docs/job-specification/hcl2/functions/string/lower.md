---
title: "lower Function"
linkTitle: "lower"
description: "The lower function converts all cased letters in the given string to lowercase."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/string/lower.mdx"
---

`lower` converts all cased letters in the given string to lowercase.

## Examples

```shell
> lower("HELLO")
hello
> lower("АЛЛО!")
алло!
```

This function uses Unicode's definition of letters and of upper- and lowercase.

## Related Functions

- [`upper`](/docs/job-specification/hcl2/functions/string/upper/) converts letters in a string to _uppercase_.
- [`title`](/docs/job-specification/hcl2/functions/string/title/) converts the first letter of each word in a string to uppercase.
