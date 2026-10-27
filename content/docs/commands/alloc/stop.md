---
title: "Command: alloc stop"
linkTitle: "alloc stop"
description: "Stop and reschedule a running allocation"
upstream:
  path: "website/content/docs/commands/alloc/stop.mdx"
---

The `alloc stop` command allows a user to perform an in-place restart of an
entire allocation or individual task.

## Usage

```plaintext
norca alloc stop [options] <allocation>
```

The `alloc stop` command requires a single argument, specifying the alloc ID or
prefix to stop. If there is an exact match based on the provided alloc ID or
prefix, then the alloc will be stopped and rescheduled. Otherwise, a list of
matching allocs and information will be displayed.

Stop will issue a request to stop and reschedule the allocation. An interactive
monitoring session will display log lines as the allocation completes shutting
down. It is safe to exit the monitor early with ctrl-c.

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

## Stop Options

- `-detach`: Return immediately instead of entering monitor mode. After the
  stop command is submitted, a new evaluation ID is printed to the
  screen, which can be used to examine the rescheduling evaluation using the
  [eval status] command.

- `-verbose`: Display verbose output.

- `-no-shutdown-delay`
  Ignore the group and task [`shutdown_delay`] configuration so that
  there is no delay between service deregistration and task
  shutdown. Note that using this flag will result in failed network
  connections to the allocation being stopped.

- `-respect-disruption` (Norca): Stop the allocation through the
  [eviction API](/docs/api/allocations#evict-allocation), which stops and
  reschedules it like a migration only if the
  [disruption budget](/docs/features/disruption-budget) of its task group allows
  it. If the budget does not allow it, the command fails with exit code 1 and
  the allocation keeps running. If the allocation is already stopping or
  migrating, the command reports it and exits with 0. Without this flag, the
  stop ignores disruption budgets, as before.

## Examples

```shell
$ norca alloc stop c1488bb5
==> Monitoring evaluation "26172081"
    Evaluation triggered by job "example"
    Allocation "4dcb1c98" created: node "b4dc52b9", group "cache"
    Evaluation within deployment: "c0c594d0"
    Evaluation status changed: "pending" -> "complete"
==> Evaluation "26172081" finished with status "complete"

$ norca alloc stop -detach eb17e557
8a91f0f3-9d6b-ac83-479a-5aa186ab7795
```

Stop an allocation only if the disruption budget of its group allows it
(Norca):

```shell
$ norca alloc stop -respect-disruption -detach 9a98c5aa
3d1f2a47-5c0e-8a1b-2f6d-0b7e4c9d1a22

$ norca alloc stop -respect-disruption 1877230b
Allocation "1877230b" was not stopped: disruption budget exceeded: task group "web" has 2 healthy allocations and requires 2
```

[eval status]: /docs/commands/eval/status/
[`shutdown_delay`]: /docs/job-specification/group#shutdown_delay
