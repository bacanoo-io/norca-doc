---
title: "Command: pack verify"
linkTitle: "pack verify"
description: "The pack verify command verifies the signature of a pack in an OCI registry."
---

The `pack verify` command verifies that a pack in an OCI registry is signed by a trusted key, and
prints its digest and the signer's key ID (`sha256:` and the hex SHA-256 of the public key's PKIX DER
encoding). It exits with `1` if no valid signature is found.

## Usage

```plaintext
norca pack verify [--key=<public key>]... <pack reference> [options]
```

## General options

This command takes the [OCI registry options](/docs/commands/pack#oci-registry-options).

## Verify options

- `--key=<string>` `(default: the registry's trusted keys)` - Path of a trusted public key. Can be repeated. Defaults to the keys of the registry's trust policy.

## Examples

```shell
norca pack verify --key=cosign.pub --registry=internal redis:0.2.1
norca pack verify --key=cosign.pub oci://registry.example.com/packs/redis@sha256:...
```
