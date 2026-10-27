---
title: "Command: operator raft remove-peer"
linkTitle: "operator raft remove-peer"
description: "Remove a Norca server from the Raft configuration."
upstream:
  path: "website/content/docs/commands/operator/raft/remove-peer.mdx"
---

Remove the Norca server with given address from the Raft configuration.

There are rare cases where a peer may be left behind in the Raft quorum even
though the server is no longer present and known to the cluster. This command
can be used to remove the failed server so that it is no longer affects the Raft
quorum. If the server still shows in the output of the [`norca server members`]
command, it is preferable to clean up by running [`norca server force-leave`]
instead of this command.

For an API to perform these operations programmatically, please see the
documentation for the [Operator] endpoint.

## Usage

```plaintext
norca operator raft remove-peer [options]
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

## Remove Peer Options

- `-peer-address`: Remove a Norca server with given address from the Raft
  configuration. The format is "IP:port"

- `-peer-id`: Remove a Norca server with the given ID from the Raft
  configuration. The format is "id"

[`norca server force-leave`]: /docs/commands/server/force-leave/ 'Norca server force-leave command'
[`norca server members`]: /docs/commands/server/members/ 'Norca server members command'
[operator]: /docs/api/operator/ 'Norca Operator API'
