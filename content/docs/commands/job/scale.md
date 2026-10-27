---
title: "Command: job scale"
linkTitle: "job scale"
description: "The job scale command is used to change the count of a Norca job group."
upstream:
  path: "website/content/docs/commands/job/scale.mdx"
---

The `job scale` command is used to alter the number of running allocations within
a Norca task group.

## Usage

```plaintext
norca job scale [options] <job> <group> <count>
```

The `job scale` commands requires at least two arguments and potentially three
depending on the job specification. The first argument will be the job ID of the
job you wish to scale. If the job contains a single task group, you can omit
including the task group name as the second argument and the command will perform
the required lookup. The final argument is the count that you wish the job task
group to be changed to. The count is the absolute value that will be reflected in
the job specification.

Scale will issue a request to update the matched job and then invoke an interactive
monitor that exits automatically once the scheduler has processed the request.
It is safe to exit the monitor early using ctrl+c.

When ACLs are enabled, this command requires a token with the
`read-job-scaling` and either the `scale-job` or `submit-job` capabilities
for the job's namespace. The `list-jobs` capability is required to run the
command with a job prefix instead of the exact job ID. The `read-job`
capability is required to monitor the resulting evaluation when `-detach` is
not used.

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

## Scale Options

- `-detach`: Return immediately instead of entering monitor mode. After the
  scale command is submitted, a new evaluation ID is printed to the screen,
  which can be used to examine the evaluation using the [eval status] command.

- `-verbose`: Show full information.

## Examples

Scale the job with ID "job1" which contains a single task group to a count of 8:

```shell
$ norca job scale job1 8
==> Monitoring evaluation "529cc88e"
    Evaluation triggered by job "job1"
    Evaluation within deployment: "28a3378f"
    Allocation "2a4df8ca" created: node "2f0a2f93", group "group1"
    Allocation "b7eefe49" created: node "2f0a2f93", group "group1"
    Allocation "bd54a83d" created: node "2f0a2f93", group "group1"
    Allocation "fadeaea8" created: node "2f0a2f93", group "group1"
    Allocation "4bd1397b" modified: node "2f0a2f93", group "group1"
    Allocation "93684511" modified: node "2f0a2f93", group "group1"
    Allocation "b409f0a2" modified: node "2f0a2f93", group "group1"
    Allocation "18f50054" created: node "2f0a2f93", group "group1"
    Evaluation status changed: "pending" -> "complete"
==> Evaluation "529cc88e" finished with status "complete"
```

Scale the job with ID "job1" which contains a single task group to a count of 8
and return immediately:

```shell
$ norca job scale -detach job1 8
Evaluation ID: b754d6b3-8960-5652-60d8-d47df6eaed13
```

Scale the job with ID "job1" and the task group "group1" to a count of 8:

```shell
$ norca job scale job1 group1 8
==> Monitoring evaluation "529cc88e"
    Evaluation triggered by job "job1"
    Evaluation within deployment: "28a3378f"
    Allocation "2a4df8ca" created: node "2f0a2f93", group "group1"
    Allocation "b7eefe49" created: node "2f0a2f93", group "group1"
    Allocation "bd54a83d" created: node "2f0a2f93", group "group1"
    Allocation "fadeaea8" created: node "2f0a2f93", group "group1"
    Allocation "4bd1397b" modified: node "2f0a2f93", group "group1"
    Allocation "93684511" modified: node "2f0a2f93", group "group1"
    Allocation "b409f0a2" modified: node "2f0a2f93", group "group1"
    Allocation "18f50054" created: node "2f0a2f93", group "group1"
    Evaluation status changed: "pending" -> "complete"
==> Evaluation "529cc88e" finished with status "complete"
```

[eval status]: /docs/commands/eval/status/
