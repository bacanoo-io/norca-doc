---
title: "Command: pack list"
linkTitle: "pack list"
description: "The pack list command lists the packs available in the local pack cache."
---

The `pack list` command lists the packs available in the local pack cache, with their version and
registry (name, ref and commit).

## Usage

```plaintext
norca pack list [options]
```

## List options

- `--ref=<string>` - Registry ref to filter the packs by.

- `--registry=<string>` - Registry name to filter the packs by.

## Examples

```shell
norca pack list
norca pack list --registry=norca
```
