---
title: "Command: admission-policy list"
linkTitle: "admission-policy list"
description: "The admission-policy list command lists the admission policies."
---

The `admission-policy list` command is used to list the admission policies of
the region.

## Usage

```plaintext
norca admission-policy list [options]
```

If ACLs are enabled, this command requires a token with the `read` capability
of the `admission` policy.

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

## List Options

- `-filter`: Specifies an expression used to filter results.

- `-json`: Output the admission policies in JSON format.

- `-page-token`: Where to start pagination.

- `-per-page`: How many results to show per page. If not specified, or set to
  `0`, all results are returned.

- `-prefix`: Only list admission policies whose name starts with the prefix.

- `-t`: Format and display the admission policies using a Go template.

## Examples

List the admission policies:

```shell
$ norca admission-policy list
Name           Action  Resources  Namespaces  Rules  Description
apps-baseline  deny    job        apps        3      Baseline rules for the jobs of the apps namespace
crd-objects    deny    variable   *           1
```

`*` in the `Namespaces` column means every namespace.
