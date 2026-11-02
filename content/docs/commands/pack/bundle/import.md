---
title: "Command: pack bundle import"
linkTitle: "pack bundle import"
description: "The pack bundle import command imports an offline bundle into the cache or an OCI registry."
---

The `pack bundle import` command imports a bundle created with
[`pack bundle create`](/docs/commands/pack/bundle/create). Every pack is verified with the trust policy
of the target (the registry pushed to, or the cache registry name) before anything is imported; packs
are pushed together with their signatures and keep their digests. A bundle whose index has a pack name
or tag that breaks the [naming rules](/docs/features/packages/supply-chain#oci-registries) is rejected
before anything is imported, and a `--cache-as` name that breaks them before anything is written into
the cache.

## Usage

```plaintext
norca pack bundle import <bundle> [options]
```

## General options

This command takes the [OCI registry options](/docs/commands/pack#oci-registry-options).

## Import options

- `--cache-as=<string>` - Import the packs into the local pack cache under this registry name, so they can be run without any registry.

- `--push-to=<string>` - Push the packs into repositories below this `oci://` location instead of a configured registry (`--registry`).

## Examples

```shell
# Push the packs of a bundle into the internal OCI registry.
norca pack bundle import packs.tar --registry=internal

# Import the packs into the local cache and run one of them.
norca pack bundle import packs.tar --cache-as=offline
norca pack run redis --registry=offline --ref=0.2.1
```
