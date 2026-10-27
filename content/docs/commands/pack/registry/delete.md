---
title: "Command: pack registry delete"
linkTitle: "pack registry delete"
description: "The pack registry delete command deletes registries or packs from the local environment."
---

The `pack registry delete` command deletes a registry, one of its refs or one of its packs from
the local cache. For an OCI registry it also removes the registry definition from the client
configuration. Without `--target` and `--ref` the entire registry is deleted.

## Usage

```plaintext
norca pack registry delete <name> [options]
```

## Registry options

- `--ref=<string>` - Git ref of the registry or pack to delete.

- `--target=<string>` - A single pack of the registry to delete. With `--ref`, only that ref of the pack is deleted.

## Examples

```shell
norca pack registry delete norca
norca pack registry delete norca --target=nats --ref=v0.1.0
```
