---
title: "Command: job stop"
linkTitle: "job stop"
description: "The job stop command is used to stop a running job."
upstream:
  path: "website/content/docs/commands/job/stop.mdx"
---

**Alias: `norca stop`**

The `job stop` command is used to stop a running job and signals the scheduler
to cancel all the running allocations.

## Usage

```plaintext
norca job stop [options] <job 1> <job 2> ... <job N>
```

The `job stop` command requires at least one job ID or prefix to stop. If there
is an exact match based on the provided job ID or prefix, then the job will be
cancelled. Otherwise, a list of matching jobs and information will be
displayed.

Stop will issue a request to deregister the matched jobs and then invoke an
interactive monitor that exits automatically once the scheduler has processed
the requests. It is safe to exit the monitor early using ctrl+c.

When ACLs are enabled, this command requires a token with the `submit-job`
and `read-job` capabilities for the job's namespace. The `list-jobs`
capability is required to run the command with job prefixes instead of exact
job IDs.

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
  deregister command is submitted, a new evaluation ID is printed to the screen,
  which can be used to examine the evaluation using the [eval status] command.

- `-eval-priority`: Override the priority of the evaluations produced as a result
  of this job deregistration. By default, this is set to the priority of the job.

- `-verbose`: Show full information.

- `-yes`: Automatic yes to prompts.

- `-purge`: Purge is used to stop the job and purge it from the system. If not
  set, the job will still be queryable and will be purged by the garbage
  collector.

- `-global`
  Stop a [multi-region] job in all its regions. By default, `job stop` will
  stop only a single region at a time. Ignored for single-region jobs.

- `-no-shutdown-delay`
  Ignore the group and task [`shutdown_delay`] configuration so that
  there is no delay between service deregistration and task
  shutdown. Note that using this flag will result in failed network
  connections to the allocations being stopped.

## Examples

Stop the job with ID "job1":

```shell
$ norca job stop job1
==> Monitoring evaluation "43bfe672"
    Evaluation status changed: "pending" -> "complete"
==> Evaluation "43bfe672" finished with status "complete"
```

Stop multiple jobs:

```shell
$ norca job stop job1 job2
==> 2022-12-16T15:19:28-08:00: Monitoring evaluation "166c39c5"
==> 2022-12-16T15:19:28-08:00: Monitoring evaluation "049404c2"
    2022-12-16T15:19:28-08:00: Evaluation triggered by job "job1"
    2022-12-16T15:19:28-08:00: Evaluation triggered by job "job2"
    2022-12-16T15:19:28-08:00: Evaluation within deployment: "90885ce7"
    2022-12-16T15:19:28-08:00: Evaluation status changed: "pending" -> "complete"
==> 2022-12-16T15:19:28-08:00: Evaluation "166c39c5" finished with status "complete"
==> 2022-12-16T15:19:28-08:00: Monitoring deployment "90885ce7"
  ✓ Deployment "90885ce7" successful

    2022-12-16T15:19:28-08:00
    ID          = 90885ce7
    Job ID      = job1
    Job Version = 0
    Status      = successful
    Description = Deployment completed successfully

    Deployed
    Task Group  Desired  Placed  Healthy  Unhealthy  Progress Deadline
    example     1        1       1        0          2022-12-16T15:29:03-08:00
==> 2022-12-16T15:19:29-08:00: Monitoring evaluation "049404c2"
    2022-12-16T15:19:29-08:00: Evaluation within deployment: "a13df8f8"
    2022-12-16T15:19:29-08:00: Evaluation status changed: "pending" -> "complete"
==> 2022-12-16T15:19:29-08:00: Evaluation "049404c2" finished with status "complete"
==> 2022-12-16T15:19:29-08:00: Monitoring deployment "a13df8f8"
  ✓ Deployment "a13df8f8" successful

    2022-12-16T15:19:29-08:00
    ID          = a13df8f8
    Job ID      = job2
    Job Version = 0
    Status      = successful
    Description = Deployment completed successfully

    Deployed
    Task Group  Desired  Placed  Healthy  Unhealthy  Progress Deadline
    example2    1        1       1        0          2022-12-16T15:29:16-08:00
```

Stop the job with ID "job1" and return immediately:

```shell
$ norca job stop -detach job1
507d26cb
```

[eval status]: /docs/commands/eval/status/
[multi-region]: /docs/job-specification/multiregion/
[`shutdown_delay`]: /docs/job-specification/group#shutdown_delay
