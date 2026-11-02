---
title: "fileexists Function"
linkTitle: "fileexists"
description: "The fileexists function determines whether a file exists at a given path."
upstream:
  path: "website/content/docs/job-specification/hcl2/functions/file/fileexists.mdx"
---

`fileexists` determines whether a file exists at a given path.

```hcl
fileexists(path)
```

Functions are evaluated by the CLI during configuration parsing rather than job run time,
so this function can only be used with files that are already present on disk on operator host.

This function works only with regular files. If used with a directory, FIFO,
or other special mode, it will return an error.

## Examples

```shell
> fileexists("./hello.txt")
true
```

```hcl
fileexists("custom-section.sh") ? file("custom-section.sh") : local.default_content
```

## Related Functions

- [`file`](/docs/job-specification/hcl2/functions/file/file/) reads the contents of a file at a given path
