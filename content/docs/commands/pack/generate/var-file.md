---
title: "Command: pack generate var-file"
linkTitle: "pack generate var-file"
description: "The pack generate var-file command generates a variables file for a pack."
---

The `pack generate var-file` command generates a variable override file for the given pack, with
every variable as a commented-out entry with its description, type and default, and prints it.
Uncomment and change the entries you want to override, and pass the file with `-f`.

## Usage

```plaintext
norca pack generate var-file <pack-name> [options]
```

## General options

This command takes the [approval options](/docs/commands/pack#approval-options) (to overwrite an existing `--to-file`).

## Render options

- `--ref=<string>` - Ref of the pack. Without it, a pack of a git registry is used at the [default ref](/docs/commands/pack#refs-and-deployment-names) of the registry, and a pack of an OCI registry at its newest version. Not supported with a pack directory.

- `--registry=<string>` `(default: default)` - Name of the registry that contains the pack.

- `-o, --to-file=<string>` - File to write the variable override file to, in addition to standard output.

## Examples

```shell
# Print a variables file for a pack.
norca pack generate var-file example

# Write it to a file as well, overwriting it.
norca pack generate var-file example --to-file ./overrides.hcl --auto-approve

# For a pack under development.
norca pack generate var-file .
```
