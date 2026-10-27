---
title: "Command: system gc"
linkTitle: "system gc"
description: "Run the system garbage collection process."
upstream:
  path: "website/content/docs/commands/system/gc.mdx"
---

Initializes a garbage collection of jobs, evaluations, allocations, and nodes.
This is an asynchronous operation.

Norca periodically garbage collects jobs, evaluations, allocations, and nodes.
The exact garbage collection logic varies by object, but in general Norca only
permanently deletes objects once they are terminal and no longer needed for
future scheduling decisions. See [`gc` related server agent configuration
parameters][gc_params] for details on tuning periodic garbage collection.

[gc_params]: /docs/configuration/server#node_gc_threshold

The `system gc` command bypasses these settings and immediately attempts to
garbage collect dead objects regardless of any "threshold" or "interval" server
settings. This is useful to quickly free memory on servers running low, but
users should prefer tuning periodic garbage collection parameters to meet their
needs instead of relying on manually running `system gc`.

## Usage

```plaintext
norca system gc [options]
```

If ACLs are enabled, this option requires a management token.

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

## Examples

Running the system gc command does not output unless an error occurs:

```shell
$ norca system gc

```
