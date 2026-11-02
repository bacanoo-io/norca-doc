---
title: "Command: pack generate registry"
linkTitle: "pack generate registry"
description: "The pack generate registry command generates a new pack registry."
---

The `pack generate registry` command creates the skeleton of a new pack registry: `README.md`,
`CHANGELOG.md` and a `packs` directory, optionally with the sample `hello_world` pack.

## Usage

```plaintext
norca pack generate registry <name> [options]
```

## General options

This command takes the [approval options](/docs/commands/pack#approval-options).

## Output options

- `-o, --to-dir=<string>` `(default: .)` - Directory to write the generated registry to.

- `--with-sample-pack` `(default: false)` - Generate a sample `hello_world` pack in the registry.

## Examples

```shell
# Create a new registry named "my-new-registry" in the current directory.
norca pack generate registry my-new-registry --with-sample-pack
```
