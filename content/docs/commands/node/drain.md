---
title: "Command: node drain"
linkTitle: "node drain"
description: "The node drain command is used to configure a node's drain strategy."
upstream:
  path: "website/content/docs/commands/node/drain.mdx"
---

The `node drain` command is used to toggle drain mode on a given node. Drain
mode prevents any new tasks from being allocated to the node, and begins
migrating all existing allocations away. Allocations will be migrated according
to their [`migrate`][migrate] block until the drain's deadline is reached.

> [!NOTE]
> **Norca:** task groups with a [`disruption`](/docs/job-specification/disruption)
> block are also drained according to their
> [disruption budget](/docs/features/disruption-budget): the drainer applies the
> stricter of `migrate.max_parallel` and the budget, jointly for all nodes
> draining at the same time, and waits while the budget allows no disruption.
> The drain deadline and `-force` still stop the remaining allocations
> regardless of the budget. The command has no new flags for this; use
> `norca job status` to see the state of the budget of a job.

By default the `node drain` command blocks until a node is done draining and
all allocations have terminated. Canceling the `node drain` command _will not_
cancel the drain. Drains may be canceled by using the `-disable` parameter
below.

When draining more than one node at a time, it is recommended you first
disable [scheduling eligibility][eligibility] on all nodes that will be
drained. For example if you are decommissioning an entire class of nodes,
first run `node eligibility -disable` on all of their node IDs, and then run
`node drain -enable`. This will ensure allocations drained from the first node
are not placed on another node about to be drained.

The [node status] command compliments this nicely by providing the current drain
status of a given node.

See the [`migrate` block](/docs/job-specification/migrate) for how allocations
are migrated off draining nodes.

## Usage

```plaintext
norca node drain [options] <node>
```

A `-self` flag can be used to drain the local node. If this is not supplied, a
node ID or prefix must be provided. If there is an exact match, the drain mode
will be adjusted for that node. Otherwise, a list of matching nodes and
information will be displayed.

It is also required to pass one of `-enable` or `-disable`, depending on which
operation is desired.

If ACLs are enabled, this option requires a token with the 'node:write'
capability.

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

## Drain Options

- `-enable`: Enable node drain mode.

- `-disable`: Disable node drain mode.

- `-deadline`: Set the deadline by which all allocations must be moved off the
  node. Remaining allocations after the deadline are removed from the node,
  regardless of their [`migrate`][] block. Defaults to 1 hour.

- `-detach`: Return immediately instead of entering monitor mode.

- `-monitor`: Enter monitor mode directly without modifying the drain status.

- `-force`: Remove allocations off the node immediately, regardless of the
  allocation's [`migrate`][] block. This will include system jobs and CSI
  plugins if `-ignore-system` is not also set, and is not safe for use with CSI
  node plugins if the volumes are not being detached externally (for example, a
  cloud VM is being terminated).

- `-no-deadline`: No deadline allows the allocations to drain off the node,
  ignoring the default 1 hour deadline before allocations are removed regardless
  of their [`migrate`][] block.

- `-ignore-system`: Ignore system allows the drain to complete without
  stopping system job allocations. By default system jobs (and CSI
  plugins) are stopped last.

- `-keep-ineligible`: Keep ineligible will maintain the node's scheduling
  ineligibility even if the drain is being disabled. This is useful when an
  existing drain is being cancelled but additional scheduling on the node is not
  desired.

- `-m`: Message for the drain update operation. Registered in drain metadata as
  `"message"` during drain enable and `"cancel_message"` during drain disable.

- `-meta <key>=<value>`: Custom metadata to store on the drain operation, can be
  used multiple times.

- `-self`: Drain the local node.

- `-yes`: Automatic yes to prompts.

## Examples

Enable drain mode on node with ID prefix "4d2ba53b":

```shell
$ norca node drain -enable f4e8a9e5 -m "node maintenance"
Are you sure you want to enable drain mode for node "f4e8a9e5-30d8-3536-1e6f-cda5c869c35e"? [y/N] y
2018-03-30T23:13:16Z: Ctrl-C to stop monitoring: will not cancel the node drain
2018-03-30T23:13:16Z: Node "f4e8a9e5-30d8-3536-1e6f-cda5c869c35e" drain strategy set
2018-03-30T23:13:17Z: Alloc "1877230b-64d3-a7dd-9c31-dc5ad3c93e9a" marked for migration
2018-03-30T23:13:17Z: Alloc "1877230b-64d3-a7dd-9c31-dc5ad3c93e9a" draining
2018-03-30T23:13:17Z: Alloc "1877230b-64d3-a7dd-9c31-dc5ad3c93e9a" status running -> complete
2018-03-30T23:13:29Z: Alloc "3fce5308-818c-369e-0bb7-f61f0a1be9ed" marked for migration
2018-03-30T23:13:29Z: Alloc "3fce5308-818c-369e-0bb7-f61f0a1be9ed" draining
2018-03-30T23:13:30Z: Alloc "3fce5308-818c-369e-0bb7-f61f0a1be9ed" status running -> complete
2018-03-30T23:13:41Z: Alloc "9a98c5aa-a719-2f34-ecfc-0e6268b5d537" marked for migration
2018-03-30T23:13:41Z: Alloc "9a98c5aa-a719-2f34-ecfc-0e6268b5d537" draining
2018-03-30T23:13:41Z: Node "f4e8a9e5-30d8-3536-1e6f-cda5c869c35e" has marked all allocations for migration
2018-03-30T23:13:42Z: Alloc "9a98c5aa-a719-2f34-ecfc-0e6268b5d537" status running -> complete
2018-03-30T23:13:42Z: All allocations on node "f4e8a9e5-30d8-3536-1e6f-cda5c869c35e" have stopped.
```

Enable drain mode on the local node:

```shell
$ norca node drain -enable -self
...
```

Enable drain mode but do not stop system jobs:

```shell
$ norca node drain -enable -ignore-system 4d2ba53b
...
```

Disable drain mode but keep the node ineligible for scheduling. Useful for
inspecting the current state of a misbehaving node without Norca trying to
start or migrate allocations:

```shell
$ norca node drain -disable -keep-ineligible 4d2ba53b
...
```

Enable drain mode and detach from monitoring, then reattach later:

```shell
$ norca node drain -enable -detach -self
...
$ norca node drain -self -monitor
...
```

[eligibility]: /docs/commands/node/eligibility/
[migrate]: /docs/job-specification/migrate/
[`migrate`]: /docs/job-specification/migrate/
[node status]: /docs/commands/node/status/
[internals-csi]: /docs/concepts/plugins/csi/
