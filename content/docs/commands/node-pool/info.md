---
title: "Command: node pool info"
linkTitle: "node pool info"
description: "The node pool info command is used to fetch information about a node pool."
upstream:
  path: "website/content/docs/commands/node-pool/info.mdx"
---

The `node pool info` command is used to fetch information about an existing
node pool.

## Usage

```plaintext
norca node pool info [options] <node-pool>
```

If ACLs are enabled, this command requires a token with the `read` capability
in a `node_pool` policy that matches the node pool being targeted.

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

## Info Options

- `-json`: Output the node pool in its JSON format.

- `-t`: Format and display node pool using a Go template.

## Examples

Retrieve information on a node pool:

```shell
$ norca node pool info prod
Name        = prod
Description = Node pool for production workloads.

Metadata
env = production

Scheduler Configuration
Scheduler Algorithm = spread
```

Retrieve information in JSON format:

```shell
$ norca node pool info -json prod
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
```

Customize output with a Go template:

```shell
$ norca node pool info -t "{{.Name}} [{{.Meta.env}}] - {{.Description}}" prod
prod [production] - Node pool for production workloads.
```
