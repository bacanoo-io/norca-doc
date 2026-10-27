---
title: "Command: network-policy apply"
linkTitle: "network-policy apply"
description: "The network-policy apply command creates or updates a network policy or an admin network policy."
---

The `network-policy apply` command (Norca) creates or updates a network policy,
or with `-admin` an admin network policy.

## Usage

```plaintext
norca network-policy apply [options] <input>
```

The specification file is read from stdin by specifying `-`, otherwise a path
to the file is expected. The file is HCL (see the
[network policy specification](/docs/other-specifications/network-policy)), or
with `-json` the JSON form of the [API](/docs/api/network-policies).

A namespace policy is created in the namespace set by its `namespace`
attribute, or in the namespace given with `-namespace` if the file sets none.
The namespace must exist. Applying a policy with an existing name replaces it.

If ACLs are enabled, this command requires the `write-network-policy`
capability in the namespace (`network_policy { policy = "write" }`), or
`operator` write with `-admin`.

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

## Apply Options

- `-admin`: Apply an admin network policy. The file may then use `priority`,
  `namespaces` and rule `action`, but not `namespace` or `default_deny`.

- `-json`: Parse the input as a JSON policy in the API form.

## Examples

Apply a namespace policy:

```shell
$ norca network-policy apply netpol-test-app.hcl
Successfully applied network policy "test-app"!
```

Apply an admin network policy:

```shell
$ norca network-policy apply -admin admin-netpol-no-metadata.hcl
Successfully applied admin network policy "no-metadata-service"!
```

Apply a policy from stdin:

```shell
$ cat netpol-test-app.hcl | norca network-policy apply -
Successfully applied network policy "test-app"!
```
