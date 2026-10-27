---
title: "trimprefix Function"
linkTitle: "trimprefix"
description: "The trimprefix function removes the specified prefix from the start of a given string."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/string/trimprefix.mdx"
---

`trimprefix` removes the specified prefix from the start of the given string.

## Examples

```shell
> trimprefix("helloworld", "hello")
world
```

## Related Functions

- [`trim`](/docs/job-specification/hcl2/functions/string/trim/) removes characters at the start and end of a string.
- [`trimsuffix`](/docs/job-specification/hcl2/functions/string/trimsuffix/) removes a word from the end of a string.
- [`trimspace`](/docs/job-specification/hcl2/functions/string/trimspace/) removes all types of whitespace from
  both the start and the end of a string.
