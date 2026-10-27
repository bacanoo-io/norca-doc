---
title: "Command: volume deregister"
linkTitle: "volume deregister"
description: "Deregister volumes with CSI plugins."
upstream:
  path: "website/content/docs/commands/volume/deregister.mdx"
---

The `volume deregister` command deregisters external storage volumes with
Norca's [Container Storage Interface (CSI)][csi] support. The volume will be
removed from Norca's state store but not deleted from the external storage
provider. Note that deregistering a volume prevents Norca from deleting it via
[`volume delete`] at a later time.

## Usage

```plaintext
norca volume deregister [options] [volume]
```

The `volume deregister` command requires a single argument, specifying
the ID of volume to be deregistered. Deregistration will fail if the
volume is still in use by an allocation or in the process of being
unpublished.

When ACLs are enabled, this command requires a token with the
`csi-write-volume` capability for the volume's namespace.

## General Options

- `-address=<addr>`: The address of the Norca server. Overrides the `NORCA_ADDR`
  environment variable if set. Defaults to `http://127.0.0.1:4646`.

- `-region=<region>`: The region of the Norca server to forward commands to.
  Overrides the `NORCA_REGION` environment variable if set. Defaults to the
  Agent's local region.

- `-namespace=<namespace>`: The target namespace for queries and actions bound
  to a namespace. Overrides the `NORCA_NAMESPACE` environment variable if set.
  If set to `'*'`, subcommands which support this functionality query all
  namespaces authorized to user. Defaults to the "default" namespace.

- `-no-color`: Disables colored command output. Alternatively,
  `NORCA_CLI_NO_COLOR` may be set. This option takes precedence over
  `-force-color`.

- `-force-color`: Forces colored command output. This can be used in cases where
  the usual terminal detection fails. Alternatively, `NORCA_CLI_FORCE_COLOR`
  may be set. This option has no effect if `-no-color` is also used.

- `-ca-cert=<path>`: Path to a PEM encoded CA cert file to use to verify the
  Norca server SSL certificate. Overrides the `NORCA_CACERT` environment
  variable if set.

- `-ca-path=<path>`: Path to a directory of PEM encoded CA cert files to verify
  the Norca server SSL certificate. If both `-ca-cert` and `-ca-path` are
  specified, `-ca-cert` is used. Overrides the `NORCA_CAPATH` environment
  variable if set.

- `-client-cert=<path>`: Path to a PEM encoded client certificate for TLS
  authentication to the Norca server. Must also specify `-client-key`. Overrides
  the `NORCA_CLIENT_CERT` environment variable if set.

- `-client-key=<path>`: Path to an unencrypted PEM encoded private key matching
  the client certificate from `-client-cert`. Overrides the `NORCA_CLIENT_KEY`
  environment variable if set.

- `-tls-server-name=<value>`: The server name to use as the SNI host when connecting
  via TLS. Overrides the `NORCA_TLS_SERVER_NAME` environment variable if set.

- `-tls-skip-verify`: Do not verify TLS certificate. This is highly not
  recommended. Verification will also be skipped if `NORCA_SKIP_VERIFY` is set.

- `-token`: The SecretID of an ACL token to use to authenticate API requests with.
  Overrides the `NORCA_TOKEN` environment variable if set.

Each `NORCA_*` environment variable above is also accepted with its Nomad
name, for example `NOMAD_ADDR` for `NORCA_ADDR`. The `NORCA_*` variable takes
precedence when both are set.

## Deregister Options

- `-force`: Force deregistration of the volume and immediately drop claims for
  terminal allocations. Returns an error if the volume has running
  allocations. This does not detach the volume from client nodes.

[csi]: https://github.com/container-storage-interface/spec
[`volume delete`]: /docs/commands/volume/delete/
