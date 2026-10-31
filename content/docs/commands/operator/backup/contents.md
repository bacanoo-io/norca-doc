---
title: "Command: operator backup contents"
linkTitle: "contents"
description: "The operator backup contents command browses the content of a backup."
weight: 4
---

The `operator backup contents` command browses the content of a backup. The
server downloads the backup, decrypts it with the given age identity and loads
it into a separate in-memory state; the running cluster is not touched.
Variables are listed with their key names only, never their values; secrets of
the built-in secret store with their paths, metadata and value hashes, never
their values.

Without `-namespace`, all namespaces are shown. Objects in namespaces the token
can't read are hidden.

## Usage

```plaintext
norca operator backup contents [options] <id>
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

## Contents Options

- `-age-identity=<path>`: Path of an age identity file holding the private
  key the backup is encrypted for. Use `-` to read it from standard input. The
  identity is sent to the server only for this request and is never stored.

- `-type=<type>`: The content to show: `namespaces`, `jobs`, `job-versions`,
  `variables`, `secrets`, `acl-policies`, `acl-roles`, `deployments`,
  `allocations` or `consul-kv` (the keys of the Consul KV of the system bus,
  with size, revision and value hash). Defaults to `jobs`. `job-versions`
  requires `-job`.

- `-job=<id>`: Only show the job versions, deployments and allocations of this
  job.

- `-prefix=<prefix>`: Only show the Variables under this path, or the objects
  whose ID starts with it.

- `-destination=<name>`: The destination to read from. Defaults to the first
  one the backup was verified on.

- `-json`: Output the content in JSON format.

- `-t`: Format and display the content using a Go template.

## Examples

List the jobs of a backup:

```shell
$ norca operator backup contents -age-identity ~/backup-identity.txt <id>
```

Show every version of a job that the backup holds:

```shell
$ norca operator backup contents -age-identity ~/backup-identity.txt \
    -type job-versions -job example <id>
```

List the secrets of the `apps` namespace:

```shell
$ norca operator backup contents -age-identity ~/backup-identity.txt \
    -type secrets -namespace apps <id>
```
