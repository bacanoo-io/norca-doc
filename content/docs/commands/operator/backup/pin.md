---
title: "Command: operator backup pin"
linkTitle: "pin"
description: "The operator backup pin command pins, unpins or labels a backup."
weight: 7
---

The `operator backup pin` command pins a backup so the retention never deletes
it, unpins it, or changes its labels. The change is written to the manifest of
the backup on its destinations too.

## Usage

```plaintext
norca operator backup pin [options] <id>
```

If ACLs are enabled, this command requires the `write` capability of the [`backup` policy](/docs/other-specifications/acl-policy#backup-rules).

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

## Pin Options

- `-unpin`: Unpin the backup instead.

- `-label=<key>=<value>`: Add or replace a label. Can be given several times.
  With `-label` only, the pinning is not changed.

- `-remove-label=<key>`: Remove a label. Can be given several times.

## Examples

```shell
$ norca operator backup pin <id>
$ norca operator backup pin -label note="state before 0.2 upgrade" <id>
$ norca operator backup pin -unpin -remove-label note <id>
```
