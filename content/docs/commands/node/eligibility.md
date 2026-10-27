---
title: "Command: node eligibility"
linkTitle: "node eligibility"
description: "The node eligibility command is used to configure a node's scheduling eligibility."
upstream:
  path: "website/content/docs/commands/node/eligibility.mdx"
---

The `node eligibility` command is used to toggle scheduling eligibility for a
given node. By default nodes are eligible for scheduling meaning they can
receive placements and run new allocations. Nodes that have their scheduling
eligibility disabled are ineligible for new placements.

The [`node drain`][drain] command automatically disables eligibility. Disabling
a drain restore eligibility by default.

Disable scheduling eligibility is useful when draining a set of nodes: first
disable eligibility on each node that will be drained. Then drain each node.
If you just drain each node allocations may get rescheduled multiple times as
they get placed on nodes about to be drained.

Disabling scheduling eligibility may also be useful when investigating poorly
behaved nodes. It allows operators to investigate the current state of a node
without the risk of additional work being assigned to it.

## Usage

```plaintext
norca node eligibility [options] <node>
```

A `-self` flag can be used to toggle eligibility of the local node. If this is
not supplied, a node ID or prefix must be provided. If there is an exact match,
the eligibility will be adjusted for that node. Otherwise, a list of matching
nodes and information will be displayed.

It is also required to pass one of `-enable` or `-disable`, depending on which
operation is desired.

If ACLs are enabled, this option requires a token with the 'node:write'
capability.

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

## Eligibility Options

- `-enable`: Enable scheduling eligibility.
- `-disable`: Disable scheduling eligibility.
- `-self`: Set eligibility for the local node.

## Examples

Enable scheduling eligibility on node with ID prefix "574545c5":

```shell
$ norca node eligibility -enable 574545c5
Node "574545c5-c2d7-e352-d505-5e2cb9fe169f" scheduling eligibility set: eligible for scheduling
```

Disable scheduling eligibility on the local node:

```shell
$ norca node eligibility -disable -self
Node "574545c5-c2d7-e352-d505-5e2cb9fe169f" scheduling eligibility set: ineligible for scheduling
```

[drain]: /docs/commands/node/drain/
