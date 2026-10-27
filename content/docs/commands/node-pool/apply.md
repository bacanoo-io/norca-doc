---
title: "Command: node pool apply"
linkTitle: "node pool apply"
description: "The node pool apply command is used to create or update a node pool."
upstream:
  path: "website/content/docs/commands/node-pool/apply.mdx"
---

The `node pool apply` command is used to create or update a node pool.

## Usage

```plaintext
norca node pool apply [options] <input>
```

Apply is used to create or update a node pool. The specification file is read
from stdin by specifying `-`, otherwise a path to the file is expected.

If ACLs are enabled, this command requires a token with the `write` capability
in a `node_pool` policy that matches the node pool being targeted. In federated
clusters, the node pool will be created in the authoritative region and will be
replicated to all federated regions.

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

## Apply Options

- `-json`: Parse the input as a JSON node pool specification.

## Examples

Create a node pool from a file:

```hcl
# prod_pool.nomad.hcl
node_pool "prod" {
  description = "Node pool for production workloads."

  meta {
    env = "prod"
  }
}
```

```shell
$ norca node pool apply prod_pool.nomad.hcl
Successfully applied node pool "prod"!
```

Create a node pool from stdin:

```shell
$ cat prod_pool.nomad.hcl | norca node pool apply -
Successfully applied node pool "prod"!
```

```shell
$ cat <<EOF | norca node pool apply -
node_pool "dev" {
  description = "Node pool for dev workloads."
}
EOF
Successfully applied node pool "dev"!
```
