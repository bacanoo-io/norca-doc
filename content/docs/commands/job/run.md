---
title: "Command: job run"
linkTitle: "job run"
description: "The job run command is used to run a new job."
upstream:
  path: "website/content/docs/commands/job/run.mdx"
---

**Alias: `norca run`**

The `job run` command is used to submit new jobs to Norca or to update existing
jobs. Job files must conform to the [job specification] format.

## Usage

```plaintext
norca job run [options] <job file>
```

The `job run` command requires a single argument, specifying the path to a file
containing a valid [job specification]. This file will be read and the job will
be submitted to Norca for scheduling. If the supplied path is "-", the job file
is read from STDIN. Otherwise it is read from the file at the supplied path or
downloaded and read from URL specified. Norca downloads the job file using
[`go-getter`] and supports `go-getter` syntax.

By default, on successful job submission the run command will enter an
interactive monitor and display log information detailing the scheduling
decisions, placement information, and [deployment status] for the provided job
if applicable ([`batch`] and [`system`] jobs don't create deployments). The monitor will
exit after scheduling and deployment have finished or failed.

On successful job submission and scheduling, exit code 0 will be returned. If
there are job placement issues encountered (unsatisfiable constraints, resource
exhaustion, etc), then the exit code will be 2. Any other errors, including
deployment failures, client connection issues, or internal errors, are indicated
by exit code 1.

If the job has specified the region, the `-region` flag and `$NOMAD_REGION`
environment variable are overridden and the job's region is used.

The run command will set the `consul_token` of the job based on the following
precedence, going from highest to lowest: the `-consul-token` flag, the
`$CONSUL_HTTP_TOKEN` environment variable and finally the value in the job file.

The run command will set the `vault_token` of the job based on the following
precedence, going from highest to lowest: the `-vault-token` flag, the
`$VAULT_TOKEN` environment variable and finally the value in the job file.

When ACLs are enabled, this command requires a token with the `submit-job`
capability for the job's namespace. Jobs that mount CSI volumes require a
token with the `csi-mount-volume` capability for the volume's namespace. Jobs
that mount host volumes require a token with the `host_volume` capability for
that volume.

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

- `-check-index`: If set, the job is only registered or
  updated if the passed job modify index matches the server side version.
  If a check-index value of zero is passed, the job is only registered if it does
  not yet exist. If a non-zero value is passed, it ensures that the job is being
  updated from a known state. The use of this flag is most common in conjunction
  with [`job plan` command].

- `-detach`: Return immediately instead of monitoring. A new evaluation ID
  will be output, which can be used to examine the evaluation using the
  [eval status] command.

- `-eval-priority`: Override the priority of the evaluations produced as a result
  of this job submission. By default, this is set to the priority of the job.

- `-json`: Parses the job file as JSON. If the outer object has a Job field,
  such as from "norca job inspect" or "norca run -output", the value of the
  field is used as the job. See [JSON Jobs] for details.

- `-hcl1`: If set, HCL1 parser is used for parsing the job spec. Takes
  precedence over `-hcl2-strict`.

- `-hcl2-strict`: Whether an error should be produced from the HCL2 parser where
  a variable has been supplied which is not defined within the root variables.
  Defaults to true, but ignored if `-hcl1` is defined.

- `-output`: Output the JSON that would be submitted to the HTTP API without
  submitting the job.

- `-policy-override`: Has no effect: overriding admission policies is not
  supported. The flag is still accepted for compatibility and prints a warning.

- `-preserve-counts`: If set, the existing task group counts will be preserved
  when updating a job.

- `-consul-token`: If set, the passed Consul token is stored in the job before
  sending to the Norca servers. This allows passing the Consul token without
  storing it in the job file. This overrides the token found in the
  `$CONSUL_HTTP_TOKEN` environment variable and that found in the job.

- `-consul-namespace`: Not supported in Norca: a job that sets a Consul
  namespace is rejected. Services, Connect and templates use the namespace of
  the [`consul` block](/docs/configuration/consul#namespace) in the agent
  configuration.

- `-vault-token`: Used to validate if the user submitting the job has
  permission to run the job according to its Vault policies. A Vault token must
  be supplied if the [`vault` block `allow_unauthenticated`] is disabled in
  the Norca server configuration. If the `-vault-token` flag is set, the passed
  Vault token is added to the jobspec before sending to the Norca servers. This
  allows passing the Vault token without storing it in the job file. This
  overrides the token found in the `$VAULT_TOKEN` environment variable and the
  [`vault_token`] field in the job file. This token is cleared from the job
  after validating and cannot be used within the job executing environment. Use
  the `vault` block when templating in a job with a Vault token.

- `-vault-namespace`: If set, the passed Vault namespace is stored in the job
  before sending to the Norca servers.

- `-var=<key=value>`: Variable for template, can be used multiple times.

- `-var-file=<path>`: Path to HCL2 file containing user variables.

- `-verbose`: Show full information.

## Examples

Schedule the job contained in the file `example.nomad.hcl`, monitoring placement and deployment:

```shell
$ norca job run example.nomad.hcl
==> 2021-06-09T15:22:58-07:00: Monitoring evaluation "52dee78a"
    2021-06-09T15:22:58-07:00: Evaluation triggered by job "example"
    2021-06-09T15:22:58-07:00: Allocation "5e0b39f0" created: node "3e84d3d2", group "group1"
==> 2021-06-09T15:22:59-07:00: Monitoring evaluation "52dee78a"
    2021-06-09T15:22:59-07:00: Evaluation within deployment: "62eb607c"
    2021-06-09T15:22:59-07:00: Allocation "5e0b39f0" status changed: "pending" -> "running"
    2021-06-09T15:22:59-07:00: Evaluation status changed: "pending" -> "complete"
==> 2021-06-09T15:22:59-07:00: Evaluation "52dee78a" finished with status "complete"
==> 2021-06-09T15:22:59-07:00: Monitoring deployment "62eb607c"
  ⠦ Deployment "62eb607c" in progress...

    2021-06-09T15:22:59-07:00
    ID          = 62eb607c
    Job ID      = example
    Job Version = 0
    Status      = running
    Description = Deployment is running

    Deployed
    Task Group  Desired  Placed  Healthy  Unhealthy  Progress Deadline
    cache       2        2       1        0          2021-06-09T15:32:58-07:00
    web         1        1       1        0          2021-06-09T15:32:58-07:00
```

<a id="check-index"></a> Update the job using `check-index`:

```shell
$ norca job run -check-index 5 example.nomad.hcl
Enforcing job modify index 5: job exists with conflicting job modify index: 6
Job not updated

$ norca job run -check-index 6 example.nomad.hcl
==> 2021-06-09T16:57:29-07:00: Monitoring evaluation "5ef16dff"
    2021-06-09T16:57:29-07:00: Evaluation triggered by job "example"
    2021-06-09T16:57:29-07:00: Allocation "6ec7d16f" modified: node "6e1f9bf6", group "cache"
==> 2021-06-09T16:57:30-07:00: Monitoring evaluation "5ef16dff"
    2021-06-09T16:57:30-07:00: Evaluation within deployment: "62eb607c"
    2021-06-09T16:57:30-07:00: Evaluation status changed: "pending" -> "complete"
==> 2021-06-09T16:57:30-07:00: Evaluation "5ef16dff" finished with status "complete"
==> 2021-06-09T16:57:30-07:00: Monitoring deployment "62eb607c"
  ✓ Deployment "62eb607c" successful

    2021-06-09T16:57:30-07:00
    ID          = 62eb607c
    Job ID      = example
    Job Version = 2
    Status      = successful
    Description = Deployment completed successfully

    Deployed
    Task Group  Desired  Placed  Healthy  Unhealthy  Progress Deadline
    cache       1        1       1        0          2021-06-09T17:07:00-07:00
```

Schedule the job contained in `example.nomad.hcl` and return immediately:

```shell
$ norca job run -detach example.nomad.hcl
Job registration successful
Evaluation ID: e18819c1-b83d-dc17-5e7b-b6f264990283
```

Schedule a job which cannot be successfully placed. This results in a scheduling
failure and the specifics of the placement are printed:

```shell
$ norca job run failing.nomad.hcl
==> 2021-06-09T16:49:00-07:00: Monitoring evaluation "2ae0e6a5"
    2021-06-09T16:49:00-07:00: Evaluation triggered by job "example"
==> 2021-06-09T16:49:01-07:00: Monitoring evaluation "2ae0e6a5"
    2021-06-09T16:49:01-07:00: Evaluation within deployment: "db0c5e57"
    2021-06-09T16:49:01-07:00: Evaluation status changed: "pending" -> "complete"
==> 2021-06-09T16:49:01-07:00: Evaluation "2ae0e6a5" finished with status "complete" but failed to place all allocations:
    2021-06-09T16:49:01-07:00: Task Group "cache" (failed to place 1 allocation):
      * Class "foo" filtered 1 nodes
      * Constraint "${attr.kernel.name} = linux" filtered 1 nodes
    2021-06-09T16:49:01-07:00: Evaluation "67493a64" waiting for additional capacity to place remainder
==> 2021-06-09T16:49:01-07:00: Monitoring deployment "db0c5e57"
  ⠧ Deployment "db0c5e57" in progress...

    2021-06-09T16:49:03-07:00
    ID          = db0c5e57
    Job ID      = example
    Job Version = 8
    Status      = running
    Description = Deployment is running

    Deployed
    Task Group  Desired  Placed  Healthy  Unhealthy  Progress Deadline
    cache       1        0       0        0          N/A
```

Sample output when scheduling a system job, which doesn't create a deployment:

```shell
$ norca job run example.nomad.hcl
==> 2021-06-14T09:25:08-07:00: Monitoring evaluation "88a91284"
    2021-06-14T09:25:08-07:00: Evaluation triggered by job "example"
    2021-06-14T09:25:08-07:00: Allocation "03501797" created: node "7849439f", group "cache"
==> 2021-06-14T09:25:09-07:00: Monitoring evaluation "88a91284"
    2021-06-14T09:25:09-07:00: Evaluation status changed: "pending" -> "complete"
==> 2021-06-14T09:25:09-07:00: Evaluation "88a91284" finished with status "complete"
```

[`batch`]: /docs/concepts/schedulers#batch
[`consul` block `allow_unauthenticated`]: /docs/configuration/consul#allow_unauthenticated
[deployment status]: /docs/commands/deployment#status
[eval status]: /docs/commands/eval/status/
[`go-getter`]: https://github.com/hashicorp/go-getter
[`job plan` command]: /docs/commands/job/plan/
[job specification]: /docs/job-specification/
[JSON jobs]: /docs/api/json-jobs/
[`system`]: /docs/concepts/schedulers#system
[`vault` block `allow_unauthenticated`]: /docs/configuration/vault#allow_unauthenticated
[`vault_token`]: /docs/job-specification/job#vault_token
