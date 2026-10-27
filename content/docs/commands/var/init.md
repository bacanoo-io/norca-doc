---
title: "Command: var init"
linkTitle: "var init"
description: "Generate an example variable specification."
upstream:
  path: "website/content/docs/commands/var/init.mdx"
---

The `var init` creates an example variable specification file that can be used
as a starting point to customize further.

## Usage

```plaintext
norca var init <filename>
```

When no filename is supplied, a default filename of "spec.nv.hcl" or
"spec.nv.json" will be used depending on the output format.

## Init Options

- `-out` `(enum: hcl | json)`: Format of generated variable
  specification. Defaults to `hcl`.

- `-quiet`: Do not print success message.

## Examples

Create an example variable specification:

```shell
$ norca var init
Example variable specification written to spec.nv.hcl
```
