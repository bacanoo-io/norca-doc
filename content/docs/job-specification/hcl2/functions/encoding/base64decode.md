---
title: "base64decode Function"
linkTitle: "base64decode"
description: "The base64decode function decodes a string containing a base64 sequence."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/encoding/base64decode.mdx"
---

`base64decode` takes a string containing a Base64 character sequence and
returns the original string.

Norca uses the "standard" Base64 alphabet as defined in
[RFC 4648 section 4](https://tools.ietf.org/html/rfc4648#section-4).

Strings in the Norca language are sequences of unicode characters rather
than bytes, so this function will also interpret the resulting bytes as
UTF-8. If the bytes after Base64 decoding are _not_ valid UTF-8, this function
produces an error.

## Examples

```shell
> base64decode("SGVsbG8gV29ybGQ=")
Hello World
```

## Related Functions

- [`base64encode`](/docs/job-specification/hcl2/functions/encoding/base64encode/) performs the opposite operation,
  encoding the UTF-8 bytes for a string as Base64.
