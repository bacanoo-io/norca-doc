---
title: "Command: pack generate pack"
linkTitle: "pack generate pack"
description: "The pack generate pack command generates a new pack."
---

The `pack generate pack` command creates the skeleton of a new pack: `metadata.hcl`,
`variables.hcl`, `README.md`, `CHANGELOG.md`, `outputs.tpl` and a `templates` directory with a job
template and helper templates.

## Usage

```plaintext
norca pack generate pack <name> [options]
```

## General options

This command takes the [approval options](/docs/commands/pack#approval-options).

## Output options

- `-f, --overwrite` `(default: false)` - Overwrite the output directory if it is not empty.

- `-o, --to-dir=<string>` - Directory to write the generated pack to.

## Examples

```shell
# Create a new pack named "my-new-pack" in the current directory.
norca pack generate pack my-new-pack
```
