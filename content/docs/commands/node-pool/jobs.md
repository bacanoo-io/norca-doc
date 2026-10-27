---
title: "Command: node pool jobs"
linkTitle: "node pool jobs"
description: "The node pool jobs command is used to list jobs in node pool."
upstream:
  path: "website/content/docs/commands/node-pool/jobs.mdx"
---

The `node pool jobs` command is used to list jobs in a node pool.

## Usage

```plaintext
norca node pool jobs [options] <node-pool>
```

If ACLs are enabled, this command requires a token with the `read` capability in
a `node_pool` policy that matches the node pool being targeted. The results will
be filtered by the namespaces where the token has `read-job` capability.

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

## Jobs Options

- `-filter`: Specifies an expression used to [filter results][api_filtering].

- `-json`: Output the jobs in JSON format.

- `-page-token`: Where to start [pagination][api_pagination].

- `-per-page`: How many results to show per page. If not specified, or set to
  `0`, all results are returned.

- `-t`: Format and display jobs using a Go template.

## Examples

List jobs in a specific namespace in the `prod` node pool:

```shell
$ norca node pool jobs -namespace default prod
ID       Type     Priority  Status          Submit Date
job1     service  80        running         07/25/17 15:47:11 UTC
job2     batch    40        complete        07/24/17 19:22:11 UTC
job3     service  50        dead (stopped)  07/22/17 16:34:48 UTC
```

List jobs in all namespaces in the `prod` node pool:

```shell
$ norca node pool jobs -namespace '*' prod
ID       Namespace  Type     Priority  Status          Submit Date
job1     default    service  80        running         07/25/17 15:47:11 UTC
job2     default    batch    40        complete        07/24/17 19:22:11 UTC
job3     system     service  50        dead (stopped)  07/22/17 16:34:48 UTC
```

Paginate list:

```shell
$ norca node pool jobs -per-page 2 prod
ID       Type     Priority  Status          Submit Date
job1     service  80        running         07/25/17 15:47:11 UTC
job2     batch    40        complete        07/24/17 19:22:11 UTC

Results have been paginated. To get the next page run:

norca node pool jobs -per-page 2 -page-token job3 prod

$ norca node pool jobs -per-page 2 -page-token job3 prod
ID       Type     Priority  Status          Submit Date
job3     service  50        dead (stopped)  07/22/17 16:34:48 UTC
```

[api_filtering]: /docs/api#filtering
[api_pagination]: /docs/api#pagination
