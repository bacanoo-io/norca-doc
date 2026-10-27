---
title: "Command: eval status"
linkTitle: "eval status"
description: "The eval status command is used to see the status and potential failed allocations of an evaluation."
upstream:
  path: "website/content/docs/commands/eval/status.mdx"
---

The `eval status` command is used to display information about an existing
evaluation. In the case an evaluation could not place all the requested
allocations, this command can be used to determine the failure reasons.

Optionally, it can also be invoked in a monitor mode to track an outstanding
evaluation. In this mode, logs will be output describing state changes to the
evaluation or its associated allocations. The monitor will exit when the
evaluation reaches a terminal state.

## Usage

```plaintext
norca eval status [options] <evaluation>
```

An evaluation ID or prefix must be provided. If there is an exact match, the
the status will be shown. Otherwise, a list of matching evaluations and
information will be displayed.

If the `-monitor` flag is passed, an interactive monitoring session will be
started in the terminal. It is safe to exit the monitor at any time using
ctrl+c. The command will exit when the given evaluation reaches a terminal
state (completed or failed). Exit code 0 is returned on successful
evaluation, and if there are no scheduling problems. If there are
job placement issues encountered (unsatisfiable constraints,
resource exhaustion, etc), then the exit code will be 2. Any other
errors, including client connection issues or internal errors, are
indicated by exit code 1.

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

## Eval Status Options

- `-monitor`: Monitor an outstanding evaluation
- `-verbose`: Show full information.
- `-json` : Output a list of all evaluations in JSON format. This
  behavior is deprecated and has been replaced by `norca eval list
  -json`. In Nomad 1.4.0 the behavior of this option will change to
  output only the selected evaluation in JSON.
- `-t` : Format and display evaluation using a Go template.

## Examples

Show the status of an evaluation that has placement failures

```shell
$ norca eval status 2ae0e6a5
ID                 = 2ae0e6a5
Status             = complete
Status Description = complete
Type               = service
TriggeredBy        = job-register
Job ID             = example
Namespace          = default
Priority           = 50
Placement Failures = true

==> Failed Placements
Task Group "cache" (failed to place 1 allocation):
  * Class "foo" filtered 1 nodes
  * Constraint "${attr.kernel.name} = windows" filtered 1 nodes

Evaluation "67493a64" waiting for additional capacity to place remainder
```

Monitor an existing evaluation

```shell
$ norca eval status -monitor 8262bc83
==> Monitoring evaluation "8262bc83"
    Allocation "bd6bd0de" created: node "6f299da5", group "group1"
    Evaluation status changed: "pending" -> "complete"
==> Evaluation "8262bc83" finished with status "complete"
```
