---
title: "Command: pack bundle"
linkTitle: "pack bundle"
description: "The pack bundle command creates and imports offline pack bundles."
---

The `pack bundle` command creates, imports and inspects offline bundles of packs, their dependencies and their signatures, for air-gapped installations. See [offline bundles](/docs/features/packages/supply-chain#air-gapped-installation-with-offline-bundles).

## Usage

Usage: `norca pack bundle <subcommand> [options]`

Run `norca pack bundle <subcommand> --help` for help on that subcommand. The following subcommands are available:

- [`pack bundle create`](/docs/commands/pack/bundle/create) - Create an offline bundle of packs, dependencies and signatures
- [`pack bundle import`](/docs/commands/pack/bundle/import) - Import an offline bundle into the cache or an OCI registry
- [`pack bundle inspect`](/docs/commands/pack/bundle/inspect) - List the packs of an offline bundle
