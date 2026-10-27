---
title: "Command: eval delete"
linkTitle: "eval delete"
description: "The eval delete command is used to delete evaluations."
upstream:
  path: "website/content/docs/commands/eval/delete.mdx"
---

The `eval delete` command is used to delete evaluations. It should be used
cautiously and only in outage situations where there is a large backlog of
evaluations not being processed. During most normal and outage scenarios,
Norca's reconciliation and state management will handle evaluations as needed.

The eval broker is expected to be paused prior to running this command and
un-paused after. These actions can be performed by the
[`operator scheduler get-config`][scheduler_get_config]
and [`operator scheduler set-config`][scheduler_set_config] commands respectively.

## Usage

```plaintext
norca eval delete [options] [args]
```

It takes an optional argument which is the ID of the evaluation to delete. If
the evaluation ID is omitted, this command will use the filter flag to identify
and delete a set of evaluations.

When ACLs are enabled, this command requires a `management` token.

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

## Delete Options

- `-filter`: Specifies an expression used to filter evaluations by for
  deletion. When using this flag, it is advisable to ensure the syntax is
  correct using the eval list command first. Note that deleting evals by filter
  is imprecise: for sets of evals larger than a single raft log batch, evals can
  be inserted behind the cursor and therefore be missed.

- `-yes`: Bypass the confirmation prompt if an evaluation ID was not provided.

## Examples

Delete an evaluation using its ID:

```shell
$ norca eval delete 9ecffbba-73be-d909-5d7e-ac2694c10e0c
Successfuly deleted 1 evaluation
```

Delete all evaluations with status `pending` for the `example` job:

```shell
$ norca eval delete -filter='Status == "pending" and JobID == "example"'
Are you sure you want to delete 3 evals? [y/N] y

Successfuly deleted 3 evaluations
```

Delete all evaluations for the `system` and `service` whilst skipping all
prompts:

```shell
$ norca eval delete -filter='Scheduler == "system" or Scheduler == "service"' -yes
Successfuly deleted 23 evaluations
```

[scheduler_get_config]: /docs/commands/operator/scheduler/get-config/
[scheduler_set_config]: /docs/commands/operator/scheduler/set-config/
