---
title: "Command: network-policy status"
linkTitle: "network-policy status"
description: "The network-policy status command shows a network policy, its rules and the allocations it selects."
---

The `network-policy status` command (Norca) shows a network policy of the
namespace given with `-namespace` (or with `-admin` an admin network policy),
its rules, and the non-terminal allocations it selects with whether their node
can enforce the rules.

## Usage

```plaintext
norca network-policy status [options] <name>
```

If ACLs are enabled, this command requires the `read-network-policy`
capability in the namespace, or `operator` read with `-admin`. Allocations are
listed from the namespaces in which the token can read jobs.

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

## Status Options

- `-admin`: Show an admin network policy.

- `-json`: Output the policy and its allocations in JSON format (an object with
  `Policy` and `Allocations`).

- `-t`: Format and display the output using a Go template.

- `-verbose`: Display full identifiers.

## Output

The `Allocations` table has the columns `ID`, `Namespace`, `Job`, `Group`,
`Node`, `Mode` (network mode of the group), `Enforceable` and `Reason` (why the
rules cannot be enforced, for example `network mode "host" cannot enforce
network policies` or `node does not support nftables network policy
enforcement`).

## Examples

```shell
$ norca network-policy status -namespace apps test-app
Name          = test-app
Namespace     = apps
Description   = test-app: egress only to the cluster network and DNS
Selector      = app=test-app
Default Deny  = <none>
Enforcement   = required

Rules
Direction  Name  Action  Peers        Ports
egress     #0    allow   10.0.0.0/24  <any>
egress     #1    allow   <any>        53/udp,53/tcp

Allocations
ID        Namespace  Job       Group  Node    Mode    Enforceable  Reason
6f1c2a9e  apps       test-app  web    node-1  bridge  true
b20d7e41  apps       test-app  web    node-2  bridge  true
```
