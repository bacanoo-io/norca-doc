---
title: "Command: pack registry add"
linkTitle: "pack registry add"
description: "The pack registry add command adds a git or OCI pack registry to the local environment."
---

The `pack registry add` command adds a pack registry under a name and downloads its packs into
the local cache. The source is a git repository (any source the `go-getter` library supports) or an
OCI registry location `oci://host[:port]/path`. OCI registries are also written to the client
configuration file with their TLS settings and trust policy; for them the command downloads the target
pack, or all packs if the registry offers the catalog API.

A registry named `default` is used when a pack command has no `--registry`.

Each ref is cached in its own directory. Adding the same ref again is idempotent; adding without
`--ref` (or with `latest`) overwrites the cached `latest`. The command records the ref (`latest`
without `--ref`) as the default ref of the registry in `<cache>/<registry>/default-ref`: pack
commands without `--ref` then use the packs at that ref, so after adding a pinned tag
`norca pack run nats --registry=norca` runs the pack of that tag, and the release is named `nats`.
See [refs and deployment names](/docs/commands/pack#refs-and-deployment-names).

## Usage

```plaintext
norca pack registry add <name> <source> [options]
```

## Registry options

- `--ref=<string>` `(default: latest)` - Git ref (tag, branch, SHA) of the registry or pack to add, recorded as the default ref of the registry. For OCI registries, the pack version (tag); the newest version is used if none is given, and pack commands without `--ref` resolve the newest version again.

- `--target=<string>` - A single pack of the registry to add.

## OCI registry options

- `--plain-http` `(default: false)` - OCI registries only: connect over plain HTTP instead of HTTPS.

- `--registry-ca-cert=<string>` - OCI registries only: PEM encoded CA certificate to verify the registry with.

- `--registry-tls-skip-verify` `(default: false)` - OCI registries only: do not verify the registry's TLS certificate.

- `--require-signature` `(default: false)` - OCI registries only: reject packs of this registry that are not signed by a trusted key.

- `--trust-key=<string>` - OCI registries only: public key file trusted to sign the packs of this registry. Can be repeated.

## Examples

```shell
# Add the Norca pack registry at a release tag, and run a pack of it at that tag.
norca pack registry add norca https://github.com/bacanoo-io/norca-registry --ref=v0.1.0
norca pack run nats --registry=norca -f nats.hcl

# Add a single pack of the registry.
norca pack registry add norca https://github.com/bacanoo-io/norca-registry --target=nats --ref=v0.1.0

# Use the registry without --registry.
norca pack registry add default https://github.com/bacanoo-io/norca-registry --ref=v0.1.0

# Add an internal OCI registry whose packs must be signed by a trusted key.
norca pack registry add internal oci://registry.example.internal/packs \
    --trust-key=/etc/norca/pack-signing.pub --require-signature
```
