---
title: "Command: job periodic force"
linkTitle: "job periodic force"
description: "The job periodic force command is used to force the evaluation of a periodic job."
upstream:
  path: "website/content/docs/commands/job/periodic-force.mdx"
---

The `job periodic force` command is used to [force the evaluation] of a
[periodic job].

## Usage

```plaintext
norca job periodic force [options] <job id>
```

The `job periodic force` command requires a single argument, specifying the ID
of the job. This job must be a periodic job. This is used to immediately run a
periodic job, even if it violates the job's `prohibit_overlap` setting.

By default, on successful job submission the command will enter an interactive
monitor and display log information detailing the scheduling decisions and
placement information for the forced evaluation. The monitor will exit after
scheduling has finished or failed.

When ACLs are enabled, this command requires a token with the `submit-job`
capability for the job's namespace. The `list-jobs` capability is required to
run the command with a job prefix instead of the exact job ID. The `read-job`
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

## Run Options

- `-detach`: Return immediately instead of monitoring. A new evaluation ID
  will be output, which can be used to examine the evaluation using the
  [eval status] command.

- `-verbose`: Show full information.

## Examples

Force the evaluation of the job `example`, monitoring placement:

```shell
$ norca job periodic force example
==> Monitoring evaluation "54b2d6d9"
    Evaluation triggered by job "example/periodic-1555094493"
    Allocation "637aee17" created: node "a35ab8fc", group "cache"
    Allocation "637aee17" status changed: "pending" -> "running" (Tasks are running)
    Evaluation status changed: "pending" -> "complete"
==> Evaluation "54b2d6d9" finished with status "complete"
```

Force the evaluation of the job `example` and return immediately:

```shell
$ norca job periodic force -detach example
Force periodic successful
Evaluation ID: 0865fbf3-30de-5f53-0811-821e73e63178
```

[eval status]: /docs/commands/eval/status/
[force the evaluation]: /docs/api/jobs#force-new-periodic-instance
[periodic job]: /docs/job-specification/periodic/
