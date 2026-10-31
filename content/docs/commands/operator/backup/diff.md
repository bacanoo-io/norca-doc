---
title: "Command: operator backup diff"
linkTitle: "diff"
description: "The operator backup diff command compares a backup with the current state or another backup."
weight: 5
---

The `operator backup diff` command compares a backup with the current state of
the region, or with another (newer) backup. Objects are reported as added
(only on the right side), deleted (only in the backup) or modified. The
comparison covers namespaces, jobs, job versions, Variables, ACL policies and
roles, deployments and allocations; `-type` restricts it. With `-job`, the job
diff of that job is shown too.

Without `-namespace`, all namespaces are compared.

## Usage

```plaintext
norca operator backup diff [options] <id> [<other-id>]
```

If ACLs are enabled, this command requires the `read` capability of the [`backup` policy](/docs/other-specifications/acl-policy#backup-rules).

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

## Diff Options

- `-age-identity=<path>`: Path of an age identity file holding the private
  key the backup is encrypted for. Use `-` to read it from standard input. The
  identity is sent to the server only for this request and is never stored.

- `-type=<type>`: Only compare one content type: `namespaces`, `jobs`,
  `job-versions`, `variables`, `secrets`, `acl-policies`, `acl-roles`,
  `deployments`, `allocations` or `consul-kv` (keys compared by the hash of
  their value; a key kept under another Variables path than `consul/kv`
  shows as `<path>:<key>`).

- `-job=<id>`: Only compare the objects of a job, and show the job diff.

- `-destination=<name>`: The destination to read the backups from.

- `-json`: Output the comparison in JSON format.

## Examples

What changed since a backup:

```shell
$ norca operator backup diff -age-identity ~/backup-identity.txt <id>
```

How a job changed between two backups:

```shell
$ norca operator backup diff -age-identity ~/backup-identity.txt -job example <id> <newer-id>
```
