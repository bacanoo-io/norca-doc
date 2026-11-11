---
title: "Command: operator raft list-peers"
linkTitle: "operator raft list-peers"
description: "Display the current Raft peer configuration."
upstream:
  path: "website/content/docs/commands/operator/raft/list-peers.mdx"
---

The `raft list-peers` command is used to display the current Raft peer
configuration.

For an API to perform these operations programmatically, please see the
documentation for the [Operator] endpoint.

## Usage

```plaintext
norca operator raft list-peers [options]
```

If ACLs are enabled, this command requires a management token.

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


## List Peers Options

- `-stale`: The stale argument defaults to "false" which means the leader
  provides the result. If the cluster is in an outage state without a leader, you
  may need to set `-stale` to "true" to get the configuration from a non-leader
  server.

## Examples

An example output with three servers is as follows:

```shell
$ norca operator raft list-peers
Node                   ID                                    Address          State     Voter  Role      RaftProtocol
norca-server01.global  2ad8d8d4-5f2b-4c2e-a3e8-9a4f7a6c1d01  10.10.11.5:4647  follower  true   voter     3
norca-server02.global  7b1e0c55-2d6f-4f7e-b3a1-0c9d2e4f5a02  10.10.11.6:4647  leader    true   voter     3
norca-server03.global  c4f3a9e2-8b7d-4a61-9e2c-5d1b3f6a7e03  10.10.11.7:4647  follower  true   voter     3
norca-server04.global  e9d2b7c1-6a5f-4e38-8d4c-2f7a1b9c0e04  10.10.11.8:4647  follower  false  observer  3
```

- `Node` is the node name of the server, as known to Norca, or "(unknown)" if
  the node is stale and not known.

- `ID` is the Raft ID of the server, its node ID.

- `Address` is the IP:port for the server.

- `State` is either "follower" or "leader" depending on the server's role in the
  Raft configuration.

- `Voter` is "true" or "false", indicating if the server has a vote in the Raft
  configuration.

- `Role` is the configured [role](/docs/configuration/server#role) of the
  server: `voter`, `standby` or `observer`, or "unknown" if the server is not
  in the gossip pool. A `voter` that is not a voter yet is still being
  stabilized by autopilot.

- `RaftProtocol` is the Raft protocol version of the server (always `3`).

[operator]: /docs/api/operator/
