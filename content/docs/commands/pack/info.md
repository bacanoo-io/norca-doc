---
title: "Command: pack info"
linkTitle: "pack info"
description: "The pack info command shows information on a pack and its variables."
---

The `pack info` command shows information on the given pack: its name, description, application
URL and the variables with their types, descriptions and defaults.

## Usage

```plaintext
norca pack info <pack-name> [options]
```

## General options

This command takes the [operation options](/docs/commands/pack#operation-options).

## Render options

- `--ref=<string>` - Ref of the pack. Without it, a pack of a git registry is used at the [default ref](/docs/commands/pack#refs-and-deployment-names) of the registry, and a pack of an OCI registry at its newest version. Not supported with a pack directory.

- `--registry=<string>` `(default: default)` - Name of the registry that contains the pack.

## Examples

```shell
norca pack info hello_world
norca pack info nats --registry=norca                 # at the default ref of the registry
norca pack info nats --registry=norca --ref=v0.1.0    # at a given cached ref
```
