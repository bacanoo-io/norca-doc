---
title: "Command: operator backup restore-bootstrap"
linkTitle: "restore-bootstrap"
description: "The operator backup restore-bootstrap command builds a new cluster from a backup."
weight: 13
---

The `operator backup restore-bootstrap` command builds a new cluster from a
backup, for disaster recovery or a migration to another cloud. The backup is
read from the S3-compatible store, or from a folder on the machine running
this command, and decrypted there, with the age identity of the
administrators; neither the identity nor the S3 credentials are sent to the
cluster.

Start a single new server first, with the region of the backup in its
configuration and `bootstrap_expect = 1`, and bootstrap its ACLs if they are
enabled. Then run this command against it with that management token. The
command:

1. downloads and verifies the backup;
2. writes the keys of the backup into the server's keystore;
3. restores the Raft state of the backup;
4. re-wraps the key of the backup's secret store with the seal of the new
   server. For backups that have no copy of that key, enter the old unseal
   shares with `norca operator unseal -recover`.

Afterwards the ACL tokens of the backup are in effect, and the other new
servers can join; they replicate the state and the keys from the first one.

`-from` is the folder of a backup, for example
`s3://norca-backup-dr/norca/eu-aws/2026/10/24/20261024T140000Z-1834567/`, or the
prefix of a destination (`s3://norca-backup-dr/norca/eu-aws/`) to restore the
latest backup. The S3 credentials are read from the environment
(`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, or `MINIO_ACCESS_KEY` and
`MINIO_SECRET_KEY`), the shared credentials file or the instance profile.

A backup in a directory of this machine, for example copied from a
[directory destination](/docs/configuration/backup#destination-parameters), is a
`file://` URL of the same form: the backup folder
(`file:///srv/copy/norca/eu-1/2026/10/24/20261024T140000Z-1834567/`) or the
folder that holds `latest.json` (`file:///srv/copy/norca/eu-1/`). On Windows,
use `file:///C:/backups/norca/eu-1/`. The `Location` that
[`operator backup inspect`](/docs/commands/operator/backup/inspect) shows for a
directory destination has this form. The S3 options don't apply to it.

The region of the backup must match the region of the server; the region
references of the jobs are not rewritten. The cluster must be new: one server
and no jobs, unless `-force` is given. A backup taken by a newer Norca version
than the one of the server is refused.

## Usage

```plaintext
norca operator backup restore-bootstrap [options] -from <url>
```

If ACLs are enabled, this command requires a management token of the new cluster (the snapshot restore needs one).

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

## Restore Bootstrap Options

- `-age-identity=<path>`: Path of an age identity file holding the private
  key the backup is encrypted for. Use `-` to read it from standard input. The
  identity is sent to the server only for this request and is never stored.

- `-from=<url>`: The `s3://` or `file://` URL of the backup folder, or of a
  destination prefix for the latest backup.

- `-endpoint=<url>`: The S3-compatible endpoint, for example
  `https://s3.example.com`. Empty means AWS S3.

- `-s3-region=<region>`: The region of the bucket.

- `-force-path-style`: Use path-style bucket addressing, as most
  S3-compatible stores need.

- `-credentials-file=<path>`: An AWS shared credentials file, with `-profile`.

- `-profile=<name>`: The profile of the shared credentials file.

- `-ca-file=<path>`: A PEM bundle of CAs to trust for the endpoint.

- `-allow-region-change`: Restore a backup of another region. The region
  references of the jobs are not rewritten.

- `-force`: Restore into a cluster that is not new: every change of its state
  is lost.

## Examples

Restore the latest backup of the region `eu-aws` from a RustFS store into a new
first server:

```shell
$ export AWS_ACCESS_KEY_ID=norca-backup AWS_SECRET_ACCESS_KEY=<secret key>
$ norca operator backup restore-bootstrap -age-identity ~/backup-identity.txt \
    -endpoint http://10.0.0.10:9000 -s3-region us-east-1 -force-path-style \
    -from s3://norca-backup/norca/eu-aws/
```

Restore a backup from a copy of a directory destination's folder:

```shell
$ norca operator backup restore-bootstrap -age-identity ~/backup-identity.txt \
    -from file:///srv/copy/norca/eu-1/2026/10/24/20261024T140000Z-1834567/
```

See the [disaster recovery runbook](/docs/operations/backup-restore#disaster-recovery-build-a-new-cluster)
for the whole procedure.
