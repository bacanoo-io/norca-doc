---
title: "Command: rigger fmt"
linkTitle: "rigger fmt"
description: "The rigger fmt command formats the .hcl files of modules and stacks."
---

The `rigger fmt` command formats the `.hcl` files under the paths given, or under the current
directory.

## Usage

```plaintext
norca rigger fmt [--check] [path ...]
```

## Fmt Options

- `--check`: Write nothing; list the files that are not formatted, and fail if there are any.

## Examples

```shell
$ norca rigger fmt modules/redis
$ norca rigger fmt --check .
```
