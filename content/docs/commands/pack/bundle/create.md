---
title: "Command: pack bundle create"
linkTitle: "pack bundle create"
description: "The pack bundle create command creates an offline bundle of packs."
---

The `pack bundle create` command creates a bundle for moving packs into an environment without
access to their registries (air-gapped installation). Every pack is either a reference to a pack in an
OCI registry (`oci://...`, or `name[:version]` with `--registry`) or a local pack directory.
Dependencies with `oci://` sources are added as well; other dependencies must be vendored into the
pack. The signatures of the packs are included, and the bundle is verified with the trust policy of
the target when it is imported. Every tag must follow the
[naming rules](/docs/features/packages/supply-chain#oci-registries) (the OCI tag grammar, no Windows
device names).

## Usage

```plaintext
norca pack bundle create --output=<file> <pack>... [options]
```

## General options

This command takes the [OCI registry options](/docs/commands/pack#oci-registry-options).

## Bundle options

- `-o, --output=<string>` - File name of the bundle to write.

- `--sign-key=<string>` - Sign the packs added from local directories with this cosign compatible private key.

## Examples

```shell
# Bundle two packs of a configured registry, with their dependencies and signatures.
norca pack bundle create --output=packs.tar --registry=internal redis:0.2.1 postgres

# Bundle a pack from a local directory and sign it.
norca pack bundle create --output=packs.tar --sign-key=cosign.key ./redis
```
