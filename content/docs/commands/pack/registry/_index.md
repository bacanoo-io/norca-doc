---
title: "Command: pack registry"
linkTitle: "pack registry"
description: "The pack registry command manages the pack registries of the local environment."
---

The `pack registry` command adds, deletes, lists and updates pack registries and packs in the local pack cache and the client configuration. See [adding registries and packs](/docs/features/packages/pack#adding-registries-and-packs) and [OCI registries](/docs/features/packages/supply-chain#oci-registries).

## Usage

Usage: `norca pack registry <subcommand> [options]`

Run `norca pack registry <subcommand> --help` for help on that subcommand. The following subcommands are available:

- [`pack registry add`](/docs/commands/pack/registry/add) - Add registries or packs to the local environment
- [`pack registry delete`](/docs/commands/pack/registry/delete) - Delete registries or packs from the local environment
- [`pack registry list`](/docs/commands/pack/registry/list) - List the registries of the local environment
- [`pack registry update`](/docs/commands/pack/registry/update) - Update registries or packs in the local environment
