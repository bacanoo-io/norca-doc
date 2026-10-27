---
title: "Command: volume status"
linkTitle: "volume status"
description: "Display information and status of volumes."
upstream:
  path: "website/content/docs/commands/volume/status.mdx"
---

The `volume status` command displays status information for [Container
Storage Interface (CSI)][csi] volumes.

## Usage

```plaintext
norca volume status [options] [volume]
```

This command accepts an optional volume ID or prefix as the sole argument. If there
is an exact match based on the provided volume ID or prefix, then information about
the specific volume is queried and displayed. Otherwise, a list of matching volumes
and information will be displayed.

If the ID is omitted, the command lists out all of the existing volumes and a few
of the most useful status fields for each.

When ACLs are enabled, this command requires a token with the
`csi-read-volume` and `csi-list-volumes` capability for the volume's
namespace.

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

## Status Options

- `-type`: Display only volumes of a particular type. Currently only
  the `csi` type is supported, so this option can be omitted when
  querying the status of CSI volumes.

- `-short`: Display short output. Used only when a single volume is
  being queried. Drops verbose volume allocation data from the
  output.

- `-verbose`: Show full information. Allocation create and modify times are
  shown in `yyyy/mm/dd hh:mm:ss` format. When listing volumes, this flag will
  cause Norca to query the storage provider for volumes that are known to the
  storage provider but not yet registered with Norca. This may include volumes
  that have been created by the [`volume create`] command that are not yet
  schedulable.

- `-json`: Output the volumes in JSON format.

- `-t`: Format and display volumes using a Go template.

## Examples

List of all volumes:

```shell
$ norca volume [-type csi] status
ID            Name      Namespace  Plugin ID  Schedulable  Access Mode
ebs_prod_db1  database  default    ebs-prod   true         single-node-writer
```

List of all volumes, with external provider info:

```shell
$ norca volume [-type csi] status -verbose
ID            Name      Namespace  Plugin ID  Schedulable  Access Mode
ebs_prod_db1  database  default    ebs-prod   true         single-node-writer

External ID   Condition                         Nodes
vol-abcedf    OK                                i-abc123f2,i-14a12df13
vol-cd46df    Abnormal (provider message here)  i-14a12df13
```

Short view of a specific volume:

```shell
$ norca volume status [-verbose] [-plugin=ebs-prod] ebs_prod_db1
ID                   = ebs_prod_db1
Name                 = database
Type                 = csi
External ID          = vol-23452345
Plugin ID            = ebs-prod
Provider             = aws.ebs
Version              = 1.0.1
Schedulable          = true
Controllers Healthy  = 1
Controllers Expected = 1
Nodes Healthy        = 1
Nodes Expected       = 1
Access Mode          = single-node-writer
Attachment Mode      = file-system
Mount Options        = fs_type: ext4 flags: ro
Namespace            = default
```

Full status information of a volume:

```shell
$ norca volume status [-verbose] [-plugin=ebs-prod] ebs_prod_db1
ID                   = ebs_prod_db1
Name                 = database
Type                 = csi
External ID          = vol-23452345
Plugin ID            = ebs-prod
Provider             = aws.ebs
Version              = 1.0.1
Schedulable          = true
Controllers Healthy  = 1
Controllers Expected = 1
Nodes Healthy        = 1
Nodes Expected       = 1
Access Mode          = single-node-writer
Attachment Mode      = file-system
Mount Options        = fs_type: ext4 flags: ro
Namespace            = default

Allocations
ID        Node ID   Access Mode   Task Group  Version  Desired  [...]
b00fa322  28be17d5  write         csi         0        run
```

[csi]: https://github.com/container-storage-interface/spec
[csi_plugin]: /docs/job-specification/csi_plugin/
[`volume create`]: /docs/commands/volume/create/
