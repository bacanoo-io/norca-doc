---
title: "Command: operator snapshot save"
linkTitle: "operator snapshot save"
description: "Saves snapshot of Norca server state"
upstream:
  path: "website/content/docs/commands/operator/snapshot/save.mdx"
---

Retrieves an atomic, point-in-time snapshot of the state of the Norca servers
which includes jobs, nodes, allocations, periodic jobs, and ACLs for outage
recovery. For scheduled backups, see
[`norca operator backup`](/docs/commands/operator/backup).

If ACLs are enabled, a management token must be supplied in order to perform
snapshot operations.

> [!WARNING]
> This command only saves a Raft snapshot. If you use this snapshot to recover a
> cluster, you will also need to [restore the keyring][] onto at least one server.

To create a snapshot from the leader server and save it to "backup.snap":

```shell
$ norca operator snapshot save backup.snap
```

To create a potentially stale snapshot from any available server (useful if no
leader is available):

```shell
$ norca operator snapshot save -stale backup.snap
```

## Usage

```plaintext
norca operator snapshot save [options] <file>
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

Each `NORCA_*` environment variable above is also accepted with its Nomad
name, for example `NOMAD_ADDR` for `NORCA_ADDR`. The `NORCA_*` variable takes
precedence when both are set.

## Snapshot Save Options

- `-stale`: The stale argument defaults to "false" which means the leader
  provides the result. If the cluster is in an outage state without a leader, you
  may need to set `-stale` to "true" to get the configuration from a non-leader
  server.

[restore the keyring]: /docs/operations/key-management#restoring-the-keyring-from-backup
