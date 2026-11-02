---
title: "title Function"
linkTitle: "title"
description: "The title function converts the first letter of each word in a given string to uppercase."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/string/title.mdx"
---

`title` converts the first letter of each word in the given string to uppercase.

## Examples

```shell
> title("hello world")
Hello World
```

This function uses Unicode's definition of letters and of upper- and lowercase.

## Related Functions

- [`upper`](/docs/job-specification/hcl2/functions/string/upper/) converts _all_ letters in a string to uppercase.
- [`lower`](/docs/job-specification/hcl2/functions/string/lower/) converts all letters in a string to lowercase.
