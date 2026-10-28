---
title: "Command: service info"
linkTitle: "service info"
description: "The service info command is used to read the specified Norca registered service by name."
upstream:
  path: "website/content/docs/commands/service/info.mdx"
---

The `service info` command is used to read the specified Norca registered
service by name.

> [!WARNING]
> Service commands are new in Nomad 1.3.

## Usage

```plaintext
norca service info [options] <service_name>
```

The `service info` command requires a single argument, a service name.

When ACLs are enabled, this command requires a token with the `read-job`
capability for the service's namespace.

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

## Info Options

- `-per-page`: How many results to show per page.

- `-page-token`: Where to start pagination.

- `-filter`: Specifies an expression used to filter query results.

- `-json` : Output the service registrations in JSON format.

- `-t` : Format and display the service registrations using a Go template.

- `-verbose` : Display full information, including the datacenter and (Norca) the
  readiness and health of each instance and the table of its checks with their roles, states and
  output.

- `-healthy` : (Norca) Only show healthy instances, and those of services that
  publish instances that are not ready (`discovery { include_not_ready = true }`).
  See the [health-based catalog](/docs/features/service-discovery/catalog).

In Norca the table output also has a `Health` column (`passing`, `warning`,
`critical`; `passing (not ready)` or `warning (not ready)` for instances whose
startup or readiness checks have not passed yet), and external
services show `(external address)` or `(external alias)` in the `Job ID` column.

## Examples

View the information of a specific service:

```shell
$ norca service info example-cache-redis
Job ID   Address          Tags        Node ID   Alloc ID
example  127.0.0.1:22686  [db,cache]  7406e90b  5f0730ca
example  127.0.0.1:25854  [db,cache]  7406e90b  a831f7f2
```

View the verbose information of a specific service:

```shell
$ norca service info -verbose example-cache-redis
ID           = _nomad-task-5f0730ca-b055-52ac-f56e-358f3f7412f6-redis-example-cache-redis-db
Service Name = example-cache-redis
Namespace    = default
Job ID       = example
Alloc ID     = 5f0730ca-b055-52ac-f56e-358f3f7412f6
Node ID      = 7406e90b-de16-d118-80fe-60d0f2730cb3
Datacenter   = dc1
Address      = 127.0.0.1:22686
Tags         = [db,cache]

ID           = _nomad-task-a831f7f2-4c01-39dc-c742-f2b8ca178a49-redis-example-cache-redis-db
Service Name = example-cache-redis
Namespace    = default
Job ID       = example
Alloc ID     = a831f7f2-4c01-39dc-c742-f2b8ca178a49
Node ID      = 7406e90b-de16-d118-80fe-60d0f2730cb3
Datacenter   = dc1
Address      = 127.0.0.1:25854
Tags         = [db,cache]
```
