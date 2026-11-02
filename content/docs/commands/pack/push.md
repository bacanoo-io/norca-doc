---
title: "Command: pack push"
linkTitle: "pack push"
description: "The pack push command publishes a pack directory to an OCI registry."
---

The `pack push` command packages a pack directory as an OCI artifact and pushes it to an OCI
registry, optionally signing it. The repository must be named like the pack; the tag is the pack
version. The pack must be valid, its `pack.lock` (if any) must match, and its dependencies must be
vendored. Pushing is reproducible: unchanged content yields the same manifest digest. See
[supply chain](/docs/features/packages/supply-chain#oci-registries).

## Usage

```plaintext
norca pack push <pack directory> [oci://host/repository/name[:tag]] [options]
```

## General options

This command takes the [OCI registry options](/docs/commands/pack#oci-registry-options).

## Push options

- `--sign-key=<string>` - Sign the pushed pack with this cosign compatible private key. The key password is read from `NORCA_PACK_KEY_PASSWORD` (or `COSIGN_PASSWORD`).

- `--tag=<string>` `(default: pack.version)` - Tag (version) to publish the pack as; defaults to `pack { version }` of `metadata.hcl`.

## Examples

```shell
# Publish a pack to a configured OCI registry, as its pack version.
norca pack push ./redis --registry=internal

# Publish to an explicit repository and tag, and sign it.
norca pack push ./redis oci://registry.example.com/packs/redis:0.2.1 --sign-key=cosign.key
```
