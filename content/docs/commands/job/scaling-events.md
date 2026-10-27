---
title: "Command: job scaling-events"
linkTitle: "job scaling-events"
description: "The job scaling-events command details scaling events for a given job."
upstream:
  path: "website/content/docs/commands/job/scaling-events.mdx"
---

The `job scaling-events` command is used display the recent scaling events for
a given job.

## Usage

```plaintext
norca job scaling-events [options] <job>
```

The `job scaling-events` command requires a single argument, a submitted job's
ID, and will output the stored scaling events for the job if there are any.

When ACLs are enabled, this command requires a token with either the
`read-job` or `read-job-scaling` capability for the job's namespace. The
`list-jobs` capability is required to run the command with a job prefix
instead of the exact job ID.

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

## Scaling-Events Options

- `-verbose`: Show full information.

## Examples

Display the scaling events for the job with ID "job1":

```shell
$ norca job scaling-events job1
Task Group  Count   PrevCount  Date
group1      8       8          2020-10-23T09:06:47+02:00
group1      8       3          2020-10-23T09:02:42+02:00
```

Display the scaling events for the job with ID "job1" using the `verbose` flag:

```shell
$ norca job scaling-events -verbose job1
Task Group  Count   PrevCount  Error  Message                        Eval ID                               Date
group1      8       8          false  submitted using the Nomad CLI  b754d6b3-8960-5652-60d8-d47df6eaed13  2020-10-23T09:06:47+02:00
group1      8       3          false  submitted using the Nomad CLI  529cc88e-8887-725e-2a79-4997f50df153  2020-10-23T09:02:42+02:00
```
