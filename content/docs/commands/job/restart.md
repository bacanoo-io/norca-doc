---
title: "Command: job restart"
linkTitle: "job restart"
description: "The job restart command is used to restart allocations for a job."
upstream:
  path: "website/content/docs/commands/job/restart.mdx"
---

The `job restart` command is used to restart or reschedule allocations for a
particular job.

Restarting the job calls the [Restart Allocation][api_alloc_restart] API
endpoint to restart the tasks inside allocations, so the allocations themselves
are not modified but rather restarted in-place.

Rescheduling the job uses the [Stop Allocation][api_alloc_stop] API endpoint to
stop the allocations and trigger the Norca scheduler to compute new placements.
This may cause the new allocations to be scheduled in different clients from
the originals.

## Usage

```plaintext
norca job restart [options] <job>
```

The `job restart` command requires a single argument, specifying the job ID to
restart.

The command can operate in batches and wait until all restarted or
rescheduled allocations are running again before proceeding to the next batch.
It is also possible to specify additional time to wait between batches.

Allocations can be restarted in-place or rescheduled. When restarting
in-place the command may target specific tasks in the allocations, restart
only tasks that are currently running, or restart all tasks, even the ones
that have already run. Allocations can also be targeted by groups and tasks.
When both groups and tasks are defined only the tasks for the allocations of
those groups are restarted.

When rescheduling, the current allocations are stopped triggering the Norca
scheduler to create replacement allocations that may be placed in different
clients. The command waits until the new allocations have client status `ready`
before proceeding with the remaining batches. Services health checks are not
taken into account.

By default the command restarts all running tasks in-place with one allocation
per batch.

When ACLs are enabled, this command requires a token with the
`alloc-lifecycle` and `read-job` capabilities for the job's namespace. The
`list-jobs` capability is required to run the command with a job prefix instead
of the exact job ID.

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

- `-all-tasks`: If set, all tasks in the allocations are restarted, even the
  ones that have already run, such as non-sidecar tasks. Tasks will restart
  following their [`lifecycle`][] order. This option cannot be used with
  `-task`.

- `-batch-size=<n|n%>`: Number of allocations to restart at once. It may be
  defined as a percentage value of the current number of running allocations.
  Percentage values are rounded up to increase parallelism. Defaults to `1`.

- `-batch-wait=<duration|ask>`: Time to wait between restart batches. If set
  to `ask` the command halts between batches and waits for user input on how to
  proceed. If the answer is a time duration all remaining batches will use this
  new value. Defaults to `0`.

- `-group=<group-name>`: Only restart allocations for the given group. Can be
  specified multiple times. If no group is set all allocations for the job are
  restarted.

- `-no-shutdown-delay`: Ignore the group and task [`shutdown_delay`][]
  configuration so there is no delay between service deregistration and task
  shutdown or restart. Note that using this flag will result in failed network
  connections to the allocation being restarted.

- `-reschedule`: If set, allocations are stopped and rescheduled instead of
  restarted in-place. Since the group is not modified the restart does not
  create a new deployment, and so values defined in [`update`][] blocks, such
  as [`max_parallel`][], are not taken into account. This option cannot be used
  with `-task`. Only jobs of type `batch`, `service`, and `system` can be
  rescheduled.

- `-on-error=<ask|fail>`: Determines what action to take when an error happens
  during a restart batch. If `ask` the command stops and waits for user
  confirmation on how to proceed. If `fail` the command exits immediately.
  Defaults to `ask`.

- `-task=<task-name>`: Specify the task to restart. Can be specified multiple
  times. If groups are also specified the task must exist in at least one of
  them. If no task is set only tasks that are currently running are restarted.
  For example, non-sidecar tasks that already ran are not restarted unless
  `-all-tasks` is used instead. This option cannot be used with `-all-tasks` or
  `-reschedule`.

- `-yes`: Automatic yes to prompts. If set, the command automatically restarts
  multi-region jobs only in the region targeted by the command, ignores batch
  errors, and automatically proceeds with the remaining batches without
  waiting. Use `-on-error` and `-batch-wait` to adjust these behaviors.

- `-verbose`: Display full information.

## Examples

Restart running tasks of all allocations.

```shell
$ norca job restart example
==> 2023-02-28T17:36:31-05:00: Restarting 5 allocations
    2023-02-28T17:36:31-05:00: Restarting running tasks in allocation "32e143f8" for group "proxy"
    2023-02-28T17:36:31-05:00: Restarting running tasks in allocation "388129e0" for group "web"
    2023-02-28T17:36:31-05:00: Restarting running tasks in allocation "4fd581ee" for group "proxy"
    2023-02-28T17:36:32-05:00: Restarting running tasks in allocation "77d5c4f6" for group "proxy"
    2023-02-28T17:36:32-05:00: Restarting running tasks in allocation "d4303a30" for group "web"
==> 2023-02-28T17:36:32-05:00: Finished job restart

All allocations restarted successfully!
```

Target allocations of a specific group to restart.

```shell
$ norca job restart -group=web example
==> 2023-02-28T17:37:36-05:00: Restarting 2 allocations
    2023-02-28T17:37:36-05:00: Restarting running tasks in allocation "388129e0" for group "web"
    2023-02-28T17:37:37-05:00: Restarting running tasks in allocation "d4303a30" for group "web"
==> 2023-02-28T17:37:37-05:00: Finished job restart

All allocations restarted successfully!
```

Reschedule allocations instead of restarting them in-place.

```shell
❯ norca job restart -group=web -reschedule example
==> 2023-02-28T17:39:14-05:00: Restarting 2 allocations
    2023-02-28T17:39:14-05:00: Rescheduling allocation "388129e0" for group "web"
    2023-02-28T17:39:45-05:00: Rescheduling allocation "d4303a30" for group "web"
==> 2023-02-28T17:40:16-05:00: Finished job restart

All allocations restarted successfully!
```

Batch allocations to restart them 2 at a time.

```shell
$ norca job restart -batch-size=2 example
==> 2023-02-28T17:40:58-05:00: Restarting 5 allocations
==> 2023-02-28T17:40:58-05:00: Restarting 1st batch of 2 allocations
    2023-02-28T17:40:58-05:00: Restarting running tasks in allocation "653f983e" for group "web"
    2023-02-28T17:40:58-05:00: Restarting running tasks in allocation "4d18e545" for group "web"
==> 2023-02-28T17:40:58-05:00: Restarting 2nd batch of 2 allocations
    2023-02-28T17:40:58-05:00: Restarting running tasks in allocation "32e143f8" for group "proxy"
    2023-02-28T17:40:58-05:00: Restarting running tasks in allocation "4fd581ee" for group "proxy"
==> 2023-02-28T17:40:59-05:00: Restarting 3rd batch of 1 allocations
    2023-02-28T17:40:59-05:00: Restarting running tasks in allocation "77d5c4f6" for group "proxy"
==> 2023-02-28T17:40:59-05:00: Finished job restart

All allocations restarted successfully!
```

Batch allocations as a percentage of total running allocations.

```shell
$ norca job restart -batch-size=50% example
==> 2023-02-28T18:52:47-05:00: Restarting 5 allocations
==> 2023-02-28T18:52:47-05:00: Restarting 1st batch of 3 allocations
    2023-02-28T18:52:47-05:00: Restarting running tasks in allocation "d28f6f60" for group "proxy"
    2023-02-28T18:52:47-05:00: Restarting running tasks in allocation "b931b496" for group "proxy"
    2023-02-28T18:52:47-05:00: Restarting running tasks in allocation "18673b40" for group "proxy"
==> 2023-02-28T18:52:48-05:00: Restarting 2nd batch of 2 allocations
    2023-02-28T18:52:48-05:00: Restarting running tasks in allocation "439b1632" for group "web"
    2023-02-28T18:52:48-05:00: Restarting running tasks in allocation "8fae60f6" for group "web"
==> 2023-02-28T18:52:48-05:00: Finished job restart

All allocations restarted successfully!
```

Pause between batches of restart and wait for user input on how to proceed.

```shell
$ norca job restart -batch-size=2 -batch-wait=ask example
==> 2023-02-28T18:04:19-05:00: Restarting 5 allocations
==> 2023-02-28T18:04:19-05:00: Restarting 1st batch of 2 allocations
    2023-02-28T18:04:19-05:00: Restarting running tasks in allocation "4d18e545" for group "web"
    2023-02-28T18:04:19-05:00: Restarting running tasks in allocation "653f983e" for group "web"
==> 2023-02-28T18:04:19-05:00: Proceed with next batch? [Y/n/<duration>] y
==> 2023-02-28T18:04:20-05:00: Restarting 2nd batch of 2 allocations
    2023-02-28T18:04:20-05:00: Restarting running tasks in allocation "4fd581ee" for group "proxy"
    2023-02-28T18:04:20-05:00: Restarting running tasks in allocation "32e143f8" for group "proxy"
==> 2023-02-28T18:04:20-05:00: Proceed with next batch? [Y/n/<duration>] 10s
==> 2023-02-28T18:04:22-05:00: Proceeding restarts with new wait time of 10s
==> 2023-02-28T18:04:22-05:00: Waiting 10s before restarting the next batch
==> 2023-02-28T18:04:32-05:00: Restarting 3rd batch of 1 allocations
    2023-02-28T18:04:32-05:00: Restarting running tasks in allocation "77d5c4f6" for group "proxy"
==> 2023-02-28T18:04:32-05:00: Finished job restart

All allocations restarted successfully!
```

Wait 10 seconds before each restart batch.

```shell
$ norca job restart -batch-size=2 -batch-wait=10s example
==> 2023-02-28T18:03:43-05:00: Restarting 5 allocations
==> 2023-02-28T18:03:43-05:00: Restarting 1st batch of 2 allocations
    2023-02-28T18:03:43-05:00: Restarting running tasks in allocation "653f983e" for group "web"
    2023-02-28T18:03:43-05:00: Restarting running tasks in allocation "4d18e545" for group "web"
==> 2023-02-28T18:03:43-05:00: Waiting 10s before restarting the next batch
==> 2023-02-28T18:03:53-05:00: Restarting 2nd batch of 2 allocations
    2023-02-28T18:03:53-05:00: Restarting running tasks in allocation "4fd581ee" for group "proxy"
    2023-02-28T18:03:53-05:00: Restarting running tasks in allocation "32e143f8" for group "proxy"
==> 2023-02-28T18:03:53-05:00: Waiting 10s before restarting the next batch
==> 2023-02-28T18:04:03-05:00: Restarting 3rd batch of 1 allocations
    2023-02-28T18:04:03-05:00: Restarting running tasks in allocation "77d5c4f6" for group "proxy"
==> 2023-02-28T18:04:03-05:00: Finished job restart

All allocations restarted successfully!
```

[`lifecycle`]: /docs/job-specification/lifecycle/
[`max_parallel`]: /docs/job-specification/update#max_parallel
[`shutdown_delay`]: /docs/job-specification/task#shutdown_delay
[`update`]: /docs/job-specification/update/
[api_alloc_restart]: /docs/api/allocations#restart-allocation
[api_alloc_stop]: /docs/api/allocations#stop-allocation
