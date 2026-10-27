---
title: "Command: alloc restart"
linkTitle: "alloc restart"
description: "Restart a running allocation or task"
upstream:
  path: "website/content/docs/commands/alloc/restart.mdx"
---

The `alloc restart` command allows a user to perform an in place restart of an
an entire allocation or individual task.

## Usage

```plaintext
norca alloc restart [options] <allocation> <task>
```

This command accepts a single allocation ID and a task name. The task name must
be part of the allocation and the task must be currently running. The task name
is optional and if omitted all tasks that are currently running will be
restarted.

Task name may also be specified using the `-task` option rather than a command
argument. If task name is given with both an argument and the `-task` option,
preference is given to the `-task` option.

Use the option `-all-tasks` to restart tasks that have already run, such as
non-sidecar prestart and poststart tasks.

When ACLs are enabled, this command requires a token with the
`alloc-lifecycle`, `read-job`, and `list-jobs` capabilities for the
allocation's namespace.

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

## Restart Options

- `-all-tasks`: If set, all tasks in the allocation will be restarted, even the
  ones that already ran. This option cannot be used with `-task` or the
  `<task>` argument.

- `-task`: Specify the individual task to restart. This option cannot be used
  with `-all-tasks`.

- `-verbose`: Display verbose output.

## Examples

```shell
$ norca alloc restart eb17e557

$ norca alloc restart eb17e557 foo
Could not find task named: foo, found:
* test
<blocking>
```

Specifying task name with the `-task` option:

```shell
$ norca alloc restart -task redis eb17e557
```

If task name is specified using both options, the command argument is ignored.
The following will restart the "redis" task only, not the "api" task:

```shell
$ norca alloc restart -task redis eb17e557 api
```
