---
title: "Command: namespace apply"
linkTitle: "namespace apply"
description: "The namespace apply command is used create or update a namespace."
upstream:
  path: "website/content/docs/commands/namespace/apply.mdx"
---

The `namespace apply` command is used create or update a namespace.

## Usage

```plaintext
norca namespace apply [options] <input>
```

Apply is used to create or update a namespace. The HCL specification file
will be read from stdin by specifying "-", otherwise a path to the file is
expected.

Instead of a file, you may instead pass the namespace name to create
or update as the only argument.

If ACLs are enabled, this command requires a management ACL token. In federated
clusters, the namespace will be created in the authoritative region and will be
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

- `-quota` : An optional quota to apply to the namespace.

- `-description` : An optional human readable description for the namespace.

- `-json` : Parse the input as a JSON namespace specification.

## Examples

Create a namespace with a quota:

```shell
$ norca namespace apply -description "Prod API servers" -quota prod api-prod
Successfully applied namespace "api-prod"!
```

Remove a quota from a namespace:

```shell
$ norca namespace apply -quota= api-prod
```

Create a namespace from a file:
```shell
$ cat namespace.hcl
name        = "dev"
description = "Namespace for developers"

capabilities {
  enabled_task_drivers  = ["docker", "exec"]
  disabled_task_drivers = ["raw_exec"]
}

meta {
  owner        = "John Doe"
  contact_mail = "john@mycompany.com"
}
$ norca namespace apply namespace.hcl
```
