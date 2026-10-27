---
title: "Command: volume snapshot create"
linkTitle: "volume snapshot create"
description: "Create external volume snapshots."
upstream:
  path: "website/content/docs/commands/volume/snapshot-create.mdx"
---

The `volume snapshot create` command creates a snapshot of an existing
[Container Storage Interface (CSI)][csi] volume. Only CSI plugins that
implement the [Controller][csi_plugins_internals] interface support this
command.

## Usage

```plaintext
norca volume snapshot create [volume] [snapshot_name]
```

The `volume snapshot create` command requires a volume ID or prefix. If there
is an exact match based on the provided volume ID or prefix, then the specific
volume is snapshotted. Otherwise, a list of matching volumes and information
will be displayed. The volume must still be [registered] with Norca in order
to be snapshotted.

If an optional snapshot name is provided, the argument will be passed to the
CSI plugin to be used as the ID of the resulting snapshot. Not all plugins
accept this name and it may be ignored.

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

## Snapshot Create Options

- `-parameter`: Parameters to pass to the plugin to create a
  snapshot. Accepts multiple flags in the form `-parameter key=value`

- `-secret`: Secrets to pass to the plugin to create a snapshot. Accepts
  multiple flags in the form `-secret key=value`

- `-verbose`: Display full information for the resulting snapshot.

## Examples

Snapshot a volume:

```shell
$ norca volume snapshot create ebs_prod_db1
Completed snapshot of volume ebs_prod_db1 with snapshot ID snap-12345.
```

Snapshot a volume with a suggested snapshot ID:

```shell
$ norca volume snapshot create ebs_prod_db1 snap-12345
Completed snapshot of volume ebs_prod_db1 with snapshot ID snap-12345.
```

[csi]: https://github.com/container-storage-interface/spec
[csi_plugin]: /docs/job-specification/csi_plugin/
[registered]: /docs/commands/volume/register/
[csi_plugins_internals]: /docs/concepts/plugins/csi#csi-plugins
