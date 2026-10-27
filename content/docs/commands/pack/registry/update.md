---
title: "Command: pack registry update"
linkTitle: "pack registry update"
description: "The pack registry update command updates a registry that was added before."
---

The `pack registry update` command updates a registry that was added with
[`pack registry add`](/docs/commands/pack/registry/add). The source is taken from the cached registry
metadata, so only the registry name is needed. Without `--ref` it refreshes the cached `latest`
(default branch); with `--ref=<tag>` it downloads that tag next to the cached refs. Either way the
ref becomes the default ref of the registry (`latest` without `--ref`), which pack commands without
`--ref` use: after `norca pack registry update norca --ref=<new tag>`,
`norca pack upgrade nats --registry=norca` upgrades the release `nats` to the new tag (see
[refs and deployment names](/docs/commands/pack#refs-and-deployment-names)). For OCI registries it
downloads the newest version (or `--ref`) of the cached packs.

## Usage

```plaintext
norca pack registry update <name> [options]
```

## Registry options

- `--ref=<string>` `(default: latest)` - Git ref of the registry or pack to update, recorded as the default ref of the registry. Updating the same ref again is idempotent; without a ref (or with `latest`) the cached `latest` is overwritten.

- `--target=<string>` - A single pack of the registry to update.

## Examples

```shell
# Refresh the default branch of a registry (pack commands then use latest).
norca pack registry update norca

# Update a single pack.
norca pack registry update norca --target=nats

# Download a new release tag and make it the default ref.
norca pack registry update norca --ref=<new tag>
```
