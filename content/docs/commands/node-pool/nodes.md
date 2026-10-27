---
title: "Command: node pool nodes"
linkTitle: "node pool nodes"
description: "The node pool nodes command is used to list nodes in node pool."
upstream:
  path: "website/content/docs/commands/node-pool/nodes.mdx"
---

The `node pool nodes` command is used to list nodes in a node pool.

## Usage

```plaintext
norca node pool nodes [options] <node-pool>
```

If ACLs are enabled, this command requires a token with the `node:read`
capability and the `read` capability in a `node_pool` policy that matches the
node pool being targeted.

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

## Nodes Options

- `-filter`: Specifies an expression used to [filter results][api_filtering].

- `-json`: Output the nodes in JSON format.

- `-page-token`: Where to start [pagination][api_pagination].

- `-per-page`: How many results to show per page. If not specified, or set to
  `0`, all results are returned.

- `-t`: Format and display nodes using a Go template.

- `-verbose`: Display full information.

## Examples

List nodes in the `prod` node pool:

```shell
$ norca node pool nodes prod
ID        DC   Name      Class   Drain  Eligibility  Status
31c5347f  dc2  client-3  <none>  false  eligible     ready
3ed547cd  dc1  client-1  <none>  false  eligible     ready
6e98e378  dc2  client-2  <none>  false  eligible     ready
```

Filter nodes with an expression:

```shell
$ norca node pool nodes -filter='Datacenter == "dc2"' prod
ID        DC   Name      Class   Drain  Eligibility  Status
31c5347f  dc2  client-3  <none>  false  eligible     ready
6e98e378  dc2  client-2  <none>  false  eligible     ready
```

Paginate list:

```shell
$ norca node pool nodes -per-page=2 prod
ID        DC   Name         Class   Drain  Eligibility  Status
31c5347f  dc2  us-client-3  <none>  false  eligible     ready
3ed547cd  dc1  us-client-1  <none>  false  eligible     ready

Results have been paginated. To get the next page run:

norca node pool nodes -per-page=2 prod -page-token 6e98e378-b41a-86ac-8e5e-5ca8ab66236d
```

[api_filtering]: /docs/api#filtering
[api_pagination]: /docs/api#pagination
