---
title: "Command: network-policy list"
linkTitle: "network-policy list"
description: "The network-policy list command lists network policies or admin network policies."
---

The `network-policy list` command (Norca) lists the network policies of the
namespace given with `-namespace` (`*` for every namespace), or with `-admin`
the admin network policies in evaluation order (priority, then name).

## Usage

```plaintext
norca network-policy list [options]
```

If ACLs are enabled, this command requires the `read-network-policy`
capability in the namespace, or `operator` read with `-admin`.

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

## List Options

- `-admin`: List the admin network policies.

- `-filter`: Specifies an expression used to [filter query results](/docs/api#filtering).
  Applies to namespace policies.

- `-json`: Output the policies in JSON format.

- `-page-token`: Where to start pagination. Applies to namespace policies.

- `-per-page`: How many results to show per page. Applies to namespace
  policies.

- `-prefix`: Filter the policies by a name prefix.

- `-t`: Format and display the policies using a Go template.

## Examples

List the network policies of a namespace:

```shell
$ norca network-policy list -namespace apps
Name      Namespace  Selector      Ingress  Egress  Enforcement
test-app  apps       app=test-app  0        2       required
```

List the admin network policies:

```shell
$ norca network-policy list -admin
Name                 Priority  Namespaces  Selector  Ingress  Egress  Enforcement
no-metadata-service  10        *           <all>     0        1       best_effort
```
