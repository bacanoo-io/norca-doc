---
title: "Command: quota status"
linkTitle: "quota status"
description: "The quota status command is used to view the status of a particular quota specification."
upstream:
  path: "website/content/docs/commands/quota/status.mdx"
---

The `quota status` command is used to view the status of a particular quota
specification: its settings and, for every region it has a limit for, the usage
compared with the limit.

## Usage

```plaintext
norca quota status [options] <quota>
```

The quota name may be a prefix of the name if it is unique. The command queries
the usage in every region the quota has a limit for.

If ACLs are enabled, this command requires a token with the `quota:read`
capability; access to the namespaces the quota is attached to is not checked.

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

## Status Options

- `-json`: Output the quota specification in a JSON format. The usage is not
  included; [`norca quota inspect`](/docs/commands/quota/inspect) without
  options prints the specification with the usage of every region as JSON.

- `-t`: Format and display the quota specification (not the usage) using a Go
  template.

## Examples

View the status of a quota specification:

```shell
$ norca quota status default-quota
Name          = default-quota
Description   = Limit the shared default namespace
Limits        = 1
Enforce       = schedule
Task Defaults = cpu=100, memory=256
Task Max      = cpu=1000, memory=1000

Quota Limits
Region  CPU Usage   Memory Usage  Memory Max Usage  Variables Usage  Allocations Usage
global  500 / 2500  512 / 1000    512 / 1000        0 / 1000         2 / 100
```

A limit of `inf` is unlimited, and a limit of `0` disallows any usage.
