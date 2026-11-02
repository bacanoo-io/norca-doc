---
title: "Command: pack sign"
linkTitle: "pack sign"
description: "The pack sign command signs a pack in an OCI registry."
---

The `pack sign` command signs a pack in an OCI registry with a cosign compatible key pair (see
[`pack key generate`](/docs/commands/pack/key/generate)). The signature is stored in the registry next
to the pack in the format cosign uses, so it can also be checked with
`cosign verify --key cosign.pub --insecure-ignore-tlog <reference>`. Signing again with the same key
replaces that key's previous signature.

The pack reference is `oci://host/repository/name[:tag|@digest]`, or `name[:version]` with
`--registry`.

## Usage

```plaintext
norca pack sign --key=<private key> <pack reference> [options]
```

## General options

This command takes the [OCI registry options](/docs/commands/pack#oci-registry-options).

## Sign options

- `--key=<string>` - Path of the cosign compatible private key to sign with. The key password is read from `NORCA_PACK_KEY_PASSWORD` (or `COSIGN_PASSWORD`), or asked for interactively.

## Examples

```shell
# Sign version 0.2.1 of the redis pack in a configured registry.
norca pack sign --key=cosign.key --registry=internal redis:0.2.1

# Sign by explicit reference.
norca pack sign --key=cosign.key oci://registry.example.com/packs/redis:0.2.1
```
