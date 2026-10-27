---
title: "Command: operator snapshot restore"
linkTitle: "operator snapshot restore"
description: "Restore snapshot of Norca server state"
upstream:
  path: "website/content/docs/commands/operator/snapshot/restore.mdx"
---

Restores an atomic, point-in-time snapshot of the state of the Norca servers
which includes jobs, nodes, allocations, periodic jobs, and ACLs.

Restores involve a potentially dangerous low-level Raft operation that is not
designed to handle server failures during a restore. This command is primarily
intended to be used when recovering from a disaster, restoring into a fresh
cluster of Norca servers.

This command only restores the Raft snapshot. If you are recovering a cluster,
you will also need to [restore the keyring][] onto at least one server.

If ACLs are enabled, a management token must be supplied in order to perform
snapshot operations.

To restore a snapshot from the file "backup.snap":

```shell
$ norca operator snapshot restore backup.snap
```

## Usage

```plaintext
norca operator snapshot restore [options] <file>
```

## General Options

- `-address=<addr>`: The address of the Norca server. Overrides the `NORCA_ADDR`
  environment variable if set. Defaults to `http://127.0.0.1:4646`.

- `-region=<region>`: The region of the Norca server to forward commands to.
  Overrides the `NORCA_REGION` environment variable if set. Defaults to the
  Agent's local region.

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

[restore the keyring]: /docs/operations/key-management#restoring-the-keyring-from-backup

Each `NORCA_*` environment variable above is also accepted with its Nomad
name, for example `NOMAD_ADDR` for `NORCA_ADDR`. The `NORCA_*` variable takes
precedence when both are set.
