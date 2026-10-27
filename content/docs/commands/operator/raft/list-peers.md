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

Each `NORCA_*` environment variable above is also accepted with its Nomad
name, for example `NOMAD_ADDR` for `NORCA_ADDR`. The `NORCA_*` variable takes
precedence when both are set.

## List Peers Options

- `-stale`: The stale argument defaults to "false" which means the leader
  provides the result. If the cluster is in an outage state without a leader, you
  may need to set `-stale` to "true" to get the configuration from a non-leader
  server.

## Examples

An example output with three servers is as follows:

```shell
$ norca operator raft list-peers
Node                   ID               Address          State     Voter
nomad-server01.global  10.10.11.5:4647  10.10.11.5:4647  follower  true
nomad-server02.global  10.10.11.6:4647  10.10.11.6:4647  leader    true
nomad-server03.global  10.10.11.7:4647  10.10.11.7:4647  follower  true
```

- `Node` is the node name of the server, as known to Norca, or "(unknown)" if
  the node is stale and not known.

- `ID` is the ID of the server. This is the same as the `Address` but may be
  upgraded to a GUID in a future version of Norca.

- `Address` is the IP:port for the server.

- `State` is either "follower" or "leader" depending on the server's role in the
  Raft configuration.

- `Voter` is "true" or "false", indicating if the server has a vote in the Raft
  configuration. Future versions of Norca may add support for non-voting servers.

[operator]: /docs/api/operator/
