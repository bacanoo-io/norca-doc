---
title: "Command: node meta read"
linkTitle: "node meta read"
description: "The node meta read command reads node metadata."
upstream:
  path: "website/content/docs/commands/node/meta/read.mdx"
---

Read a node's metadata. This command only works on client agents. The node
status command can be used to retrieve node metadata from any agent.

Changes via the "node meta apply" subcommand are batched and may take up to
10 seconds to propagate to the servers and affect scheduling. This command
will always return the most recent node metadata while the "node status"
command can be used to view the metadata that is currently being used for
scheduling.

This command uses the [`/v1/client/metadata` HTTP API][api].

## Usage

```plaintext
norca node meta read [-json] [-node-id ...]
```

## General Options

- `-address=<addr>`: The address of the Norca server. Overrides the `NORCA_ADDR`
  environment variable if set. Defaults to `http://127.0.0.1:4646`.

- `-region=<region>`: The region of the Norca server to forward commands to.
  Overrides the `NORCA_REGION` environment variable if set. Defaults to the
  Agent's local region.

- `-namespace=<namespace>`: The target namespace for queries and actions bound
  to a namespace. Overrides the `NORCA_NAMESPACE` environment variable if set.
  If set to `'*'`, subcommands which support this functionality query all
  namespaces authorized to user. Defaults to the "default" namespace.

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

## Node Meta Read Options

- `-node-id` - Reads metadata on the specified node. If not specified the
  node receiving the request will be used by default.

- `-json` - Output the node metadata in its JSON format.

- `-t` : Format and display node using a Go template.

## Example

```shell
$ norca node meta read -node-id 3b58b0a6

All Meta
connect.gateway_image     = docker.io/envoyproxy/envoy:v${NOMAD_envoy_version}
connect.log_level         = info
connect.proxy_concurrency = 1
connect.sidecar_image     = docker.io/envoyproxy/envoy:v${NOMAD_envoy_version}
example                   = a

Dynamic Meta
example = a

Static Meta
connect.gateway_image     = docker.io/envoyproxy/envoy:v${NOMAD_envoy_version}
connect.log_level         = info
connect.proxy_concurrency = 1
connect.sidecar_image     = docker.io/envoyproxy/envoy:v${NOMAD_envoy_version}
```

[api]: /docs/api/client#read-node-metadata
