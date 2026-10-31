---
title: "Command: operator backup restore"
linkTitle: "restore"
description: "The operator backup restore command restores objects from a backup, or requests a full restore of the region."
weight: 9
---

The `operator backup restore` command restores selected objects from a backup
(selective restore). Every item is written with the normal API on behalf of
your token:

- a job is registered as a new version (the admission chain and quotas apply);
- a Variables entry is re-encrypted with the current keys with a
  check-and-set write;
- the value of a secret of the built-in secret store is written as a new
  version of the secret;
- namespaces and ACL policies and roles are upserted.

Jobs, Variables and secrets are restored in the namespace given with
`-namespace` (default: `default`).

With `-full`, the command requests a full restore of the region instead: the
whole state of the region returns to the time of the backup, and every change
since is lost. The request shows a preview of the changes (`-dry-run` shows
only the preview) and must be confirmed with `-confirm <region>`. A second
administrator then approves it with
[`operator backup approve`](/docs/commands/operator/backup/approve), which runs
it. The request expires after the
[`approval_ttl`](/docs/configuration/backup#approval_ttl) of the server's backup
configuration.

## Usage

```plaintext
norca operator backup restore [options] <id>
```

If ACLs are enabled, this command requires the `read` capability of the
[`backup` policy](/docs/other-specifications/acl-policy#backup-rules) and the
permissions of the normal writes (for example `submit-job`, Variables `write`,
`write-secret`, or a management token for namespaces and ACL objects). A full
restore requires a management token, and ACLs must be enabled.

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

## Restore Options

- `-age-identity=<path>`: Path of an age identity file holding the private
  key the backup is encrypted for. Use `-` to read it from standard input. The
  identity is sent to the server only for this request and is never stored.

- `-full`: Request a full restore of the region from the backup.

- `-confirm=<region>`: The name of the region, to confirm a full restore.

- `-job=<id>[@<version>]`: Restore a job, at the given version of the backup or
  at the version that was current at backup time. Can be given several times.

- `-variable=<path>[@<check-index>]`: Restore a Variables entry. Without a
  check index the entry is only restored if it does not exist; to overwrite an
  existing entry give its current modify index (shown by `-dry-run`). Can be
  given several times.

- `-consul-kv=[<path>:]<key>[@<check-index>]`: Restore a key of the Consul KV
  of the [system bus](/docs/features/system-bus), kept under the Variables
  path `<path>` (default `consul/kv`, the `path` of the
  [`kv` block](/docs/configuration/consul_compat#kv-parameters)) in the
  namespace of `-namespace`. Without a check index the key is only restored
  if it does not exist; to overwrite an existing key give its current
  revision (shown by `-dry-run`). The Variables rules of `<path>/<key>` in
  that namespace apply. Can be given several times.

- `-secret=<path>[@<check-index>]`: Restore a secret of the built-in secret
  store: the items of one version of the secret in the backup (the version
  that was current at backup time, or the one given with `-version`) are
  written as a new version on top of the secret's current versions, which
  stay. A soft deleted secret becomes live again; a secret that does not exist
  is created. The check index is an optional guard: without it the new version
  is always written, with `0` only if the secret does not exist, otherwise only
  if it is the secret's current modify index (shown by `-dry-run`). Can be
  given several times.

- `-version=<n>`: The version of the secret in the backup to restore. Only
  used with a single `-secret`.

- `-with-metadata`: Also restore the metadata of the secrets (labels, owner,
  description, `expires_at`, `rotate_every`, `max_versions`) from the backup.
  By default only the value is restored and the current metadata is kept; a
  secret that does not exist gets the backup's metadata either way.

- `-restore-namespace=<name>`: Restore a namespace. Can be given several
  times.

- `-acl-policy=<name>`: Restore an ACL policy. Can be given several times.

- `-acl-role=<name>`: Restore an ACL role. Can be given several times.

- `-dry-run`: Only show what would be restored.

- `-destination=<name>`: The destination to read the backup from.

- `-json`: Output the result in JSON format.

## Examples

Preview, then restore version 3 of a deleted job and a Variables entry:

```shell
$ norca operator backup restore -age-identity ~/backup-identity.txt \
    -job example@3 -variable nomad/jobs/example -dry-run <id>
$ norca operator backup restore -age-identity ~/backup-identity.txt \
    -job example@3 -variable nomad/jobs/example <id>
```

Restore a job and a secret in the `apps` namespace:

```shell
$ norca operator backup restore -age-identity ~/backup-identity.txt -namespace apps \
    -job test-app -secret test-app/db <id>
```

Request a full restore of the region `eu-1`:

```shell
$ norca operator backup restore -full -dry-run -age-identity ~/backup-identity.txt <id>
$ norca operator backup restore -full -age-identity ~/backup-identity.txt -confirm eu-1 <id>
```

The command prints the preview and the ID of the request, which a second
administrator approves with `norca operator backup approve`.
