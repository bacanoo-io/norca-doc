---
title: "Command: operator backup approve"
linkTitle: "approve"
description: "The operator backup approve command approves and runs a pending full restore."
weight: 11
---

The `operator backup approve` command approves a pending full restore of the
region as the second administrator, and runs it. Review the preview first with
[`operator backup restores <restore_id>`](/docs/commands/operator/backup/restores).
The requester can't approve their own request.

The restore takes an automatic, pinned backup of the current state first
(shown as the pre-restore backup, to undo the restore), adds the keys of the
backup to the keystore of every server, and restores the Raft state of the
backup. Every change since the backup is lost; clients stop the allocations
that are not in the backup. The command waits until the restore has
finished.

## Usage

```plaintext
norca operator backup approve [options] <restore_id>
```

If ACLs are enabled, this command requires a management token, different from the token of the request.

## General Options

- `-address=<addr>`: The address of the Norca server. Overrides the
  `NORCA_ADDR` environment variable if set. Defaults to
  `http://127.0.0.1:4646`.

- `-region=<region>`: The region of the Norca servers to forward commands to.
  Overrides the `NORCA_REGION` environment variable if set. Defaults to the
  agent's local region.

- `-namespace=<namespace>`: The target namespace for queries and actions bound
  to a namespace. Overrides the `NORCA_NAMESPACE` environment variable if set.
  If set to `'*'`, subcommands which support this functionality query all
  namespaces authorized to user. Defaults to the "default" namespace.

- `-no-color`: Disables colored command output. Alternatively,
  `NORCA_CLI_NO_COLOR` may be set. This option takes precedence over
  `-force-color`.

- `-force-color`: Forces colored command output. This can be used in cases
  where the usual terminal detection fails. Alternatively,
  `NORCA_CLI_FORCE_COLOR` may be set. This option has no effect if `-no-color`
  is also used.

- `-ca-cert=<path>`: Path to a PEM encoded CA cert file to use to verify the
  Norca server SSL certificate. Overrides the `NORCA_CACERT` environment
  variable if set.

- `-ca-path=<path>`: Path to a directory of PEM encoded CA cert files to verify
  the Norca server SSL certificate. If both `-ca-cert` and `-ca-path` are
  specified, `-ca-cert` is used. Overrides the `NORCA_CAPATH` environment
  variable if set.

- `-client-cert=<path>`: Path to a PEM encoded client certificate for TLS
  authentication to the Norca server. Must also specify `-client-key`.
  Overrides the `NORCA_CLIENT_CERT` environment variable if set.

- `-client-key=<path>`: Path to an unencrypted PEM encoded private key matching
  the client certificate from `-client-cert`. Overrides the `NORCA_CLIENT_KEY`
  environment variable if set.

- `-tls-server-name=<value>`: The server name to use as the SNI host when
  connecting via TLS. Overrides the `NORCA_TLS_SERVER_NAME` environment
  variable if set.

- `-tls-skip-verify`: Do not verify TLS certificate. This is highly not
  recommended. Verification will also be skipped if `NORCA_SKIP_VERIFY` is
  set.

- `-token`: The SecretID of an ACL token to use to authenticate API requests
  with. Overrides the `NORCA_TOKEN` environment variable if set.

Each `NORCA_*` environment variable is also accepted with its Nomad name, for
example `NORCA_ADDR` for `NORCA_ADDR`; the `NORCA_*` variable takes precedence
when both are set.

Each `NORCA_*` environment variable above is also accepted with its Nomad
name, for example `NOMAD_ADDR` for `NORCA_ADDR`. The `NORCA_*` variable takes
precedence when both are set.

## Approve Options

- `-age-identity=<path>`: Path of an age identity file holding the private
  key the backup is encrypted for. Use `-` to read it from standard input. The
  identity is sent to the server only for this request and is never stored.

## Examples

```shell
$ norca operator backup restores 5e1b3c0a
$ norca operator backup approve -age-identity ~/backup-identity.txt 5e1b3c0a
```
