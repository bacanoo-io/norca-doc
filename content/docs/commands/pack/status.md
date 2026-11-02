---
title: "Command: pack status"
linkTitle: "pack status"
description: "The pack status command shows information on deployed packs and releases."
---

The `pack status` command shows information on deployed packs. Without a pack name it lists all
deployed packs (this may include packs that are stopped but not yet removed). With a pack name it lists
the deployed jobs of that pack with their status and deployment names; for a
[release](/docs/features/packages/releases) it shows the release: phase, revision, conditions and
resources, with one row per region for a multi-region install. The release is the one of the
deployment name: `--name`, otherwise the pack name (`pack@ref`, release `pack-ref`, with an explicit
`--ref`).

## Usage

```plaintext
norca pack status [<pack-name>] [options]
```

## General options

This command takes the [operation options](/docs/commands/pack#operation-options) and the [Norca cluster options](/docs/commands/pack#norca-cluster-options).

## Status options

- `--ref=<string>` - Ref of the pack to inspect. Without it, a pack of a git registry is used at the [default ref](/docs/commands/pack#refs-and-deployment-names) of the registry (the ref it was last added or updated with), and a pack of an OCI registry at its newest version. An explicit `--ref`, including `--ref=latest`, is used as given and makes the default deployment name `pack@ref`. Not supported with a pack directory.

- `--regions=<string>` - Comma separated regions whose releases to show. By default the regions of a multi-region install are taken from the release.

- `--registry=<string>` `(default: default)` - Name of the registry that contains the pack.

## Examples

```shell
# List all deployed packs and their registries.
norca pack status

# List the deployed jobs of the pack "example", and its release "example".
norca pack status example

# The release of a deployment named pack@latest by an earlier version.
norca pack status nats --registry=norca --ref=latest

# Show the deployment "dev" of the pack "example".
norca pack status example --name=dev --registry=community
```
