---
title: "Command: quota init"
linkTitle: "quota init"
description: "Generate an example quota specification."
upstream:
  path: "website/content/docs/commands/quota/init.mdx"
---

The `quota init` command is used to create an example quota specification file
that can be used as a starting point to customize further.

## Usage

```plaintext
norca quota init [options] [<filename>]
```

If no filename is given, the default of `spec.hcl` (or `spec.json` with
`-json`) is used. The command fails if the file already exists.

## Init Options

- `-json`: Create an example JSON quota specification.

## Examples

Create an example quota specification:

```shell
$ norca quota init
Example quota specification written to spec.hcl
```

The example contains every parameter of the
[quota specification](/docs/other-specifications/quota), including the Norca
`allocations`, `task_defaults`, `task_max` and `enforce` settings.
