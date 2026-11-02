---
title: "substr Function"
linkTitle: "substr"
description: "The substr function extracts a substring from a given string by offset and length."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/string/substr.mdx"
---

`substr` extracts a substring from a given string by offset and length.

```hcl
substr(string, offset, length)
```

## Examples

```shell
> substr("hello world", 1, 4)
ello
```

The offset and length are both counted in _unicode characters_ rather than
bytes:

```shell
> substr("🤔🤷", 0, 1)
🤔
```
