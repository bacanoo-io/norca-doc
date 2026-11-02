---
title: "trimsuffix Function"
linkTitle: "trimsuffix"
description: "The trimsuffix function removes the specified suffix from the end of a given string."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/string/trimsuffix.mdx"
---

`trimsuffix` removes the specified suffix from the end of the given string.

## Examples

```shell
> trimsuffix("helloworld", "world")
hello
```

## Related Functions

- [`trim`](/docs/job-specification/hcl2/functions/string/trim/) removes characters at the start and end of a string.
- [`trimprefix`](/docs/job-specification/hcl2/functions/string/trimprefix/) removes a word from the start of a string.
- [`trimspace`](/docs/job-specification/hcl2/functions/string/trimspace/) removes all types of whitespace from
  both the start and the end of a string.
