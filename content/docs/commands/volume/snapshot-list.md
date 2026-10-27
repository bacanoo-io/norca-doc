---
title: "Command: volume snapshot list"
linkTitle: "volume snapshot list"
description: "List external volume snapshots."
upstream:
  path: "website/content/docs/commands/volume/snapshot-list.mdx"
---

The `volume snapshot list` command lists volume snapshots known to a
[Container Storage Interface (CSI)][csi] storage provider. Only CSI plugins
that implement the [Controller][csi_plugins_internals] interface support this
command.

## Usage

```plaintext
norca volume snapshot list [-plugin plugin_id -secrets key=value]
```

The `volume snapshot list` command returns a list of snapshots along with their
source volume ID as known to the external storage provider. This is not the
same as the Norca volume ID, as the source volume may not be [registered] with
Norca.

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

## Snapshot List Options

- `-page-token`: Where to start pagination.
- `-per-page`: How many results to show per page.
- `-plugin`: Display only snapshots managed by a particular [CSI
  plugin][csi_plugin]. This flag is required and accepts a plugin ID
  or prefix. If there is an exact match based on the provided plugin,
  then that specific plugin will be queried. Otherwise, a list of
  matching plugins will be displayed.
- `-secret`: Secrets to pass to the plugin to list snapshots. Accepts
  multiple flags in the form `-secret key=value`
- `-verbose`: Display full information for the resulting snapshot.

When ACLs are enabled, this command requires a token with the
`csi-list-volumes` capability for the plugin's namespace.

## Examples

List volume snapshots for a plugin:

```shell
$ norca volume snapshot list -plugin aws-ebs0
Snapshot ID  External ID  Size   Creation Time         Ready?
snap-12345   vol-abcdef   50GiB  2021-01-03T12:15:02Z  true
snap-67890   vol-fedcba   50GiB  2021-01-04T15:45:00Z  true
```

List volume snapshots with two secret key/value pairs:
```shell
$ norca volume snapshot list -plugin aws-ebs0 -secret key1=value1 -secret key2=val2
Snapshot ID  External ID  Size   Creation Time         Ready?
snap-12345   vol-abcdef   50GiB  2021-01-03T12:15:02Z  true
```

[csi]: https://github.com/container-storage-interface/spec
[csi_plugin]: /docs/job-specification/csi_plugin/
[registered]: /docs/commands/volume/register/
[csi_plugins_internals]: /docs/concepts/plugins/csi#csi-plugins
