---
title: "Command: node pool list"
linkTitle: "node pool list"
description: "The node pool list command is used to list node pools."
upstream:
  path: "website/content/docs/commands/node-pool/list.mdx"
---

The `node pool list` command is used to list existing node pools.

## Usage

```plaintext
norca node pool list [options] <node-pool>
```

If ACLs are enabled, this command requires a management token to view all node
pools. A non-management token can be used to list node pools for which the
token has the 'read' capability.

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

- `-filter`: Specifies an expression used to [filter results][api_filtering].

- `-json`: Output the node pools in JSON format.

- `-page-token`: Where to start [pagination][api_pagination].

- `-per-page`: How many results to show per page. If not specified, or set to
  `0`, all results are returned.

- `-t`: Format and display node pools using a Go template.

## Examples

List all node pools:

```shell
$ norca node pool list
Name     Description
all      Node pool with all nodes in the cluster.
default  Default node pool.
dev      Node pool for dev workloads.
prod     Node pool for production workloads.
```

Retrieve information in JSON format:

```shell
$ norca node pool list -json
[
    {
        "CreateIndex": 1,
        "Description": "Node pool with all nodes in the cluster.",
        "Meta": null,
        "ModifyIndex": 1,
        "Name": "all",
        "SchedulerConfiguration": null
    },
    {
        "CreateIndex": 1,
        "Description": "Default node pool.",
        "Meta": null,
        "ModifyIndex": 1,
        "Name": "default",
        "SchedulerConfiguration": null
    },
    {
        "CreateIndex": 21,
        "Description": "Node pool for dev workloads.",
        "Meta": {
            "env": "development"
        },
        "ModifyIndex": 21,
        "Name": "dev",
        "SchedulerConfiguration": null
    },
    {
        "CreateIndex": 39,
        "Description": "Node pool for production workloads.",
        "Meta": {
            "env": "production"
        },
        "ModifyIndex": 39,
        "Name": "prod",
        "SchedulerConfiguration": {
            "SchedulerAlgorithm": "spread"
        }
    }
]
```

Customize output with a Go template:

```shell
$ norca node pool list -t '{{range .}}{{.Name}} [{{.Meta.env}}] - {{.Description}}{{println}}{{end}}'
all [<no value>] - Node pool with all nodes in the cluster.
default [<no value>] - Default node pool.
dev [development] - Node pool for dev workloads.
prod [production] - Node pool for production workloads.
```

```shell
$ norca node pool info -t "{{.Name}} [{{.Meta.env}}] - {{.Description}}" prod
prod [production] - Node pool for production workloads.
```

Paginate list:

```shell
$ norca node pool list -per-page 2
Name     Description
all      Node pool with all nodes in the cluster.
default  Default node pool.

Results have been paginated. To get the next page run:

norca node pool list -per-page 2 -page-token dev

$ norca node pool list -per-page 2 -page-token dev
Name  Description
dev   Node pool for dev workloads.
prod  Node pool for production workloads.
```

[api_filtering]: /docs/api#filtering
[api_pagination]: /docs/api#pagination
