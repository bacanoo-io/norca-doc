---
title: "Command: deployment unblock"
linkTitle: "deployment unblock"
description: "The deployment unblock command is used to manually unblock a deployment."
upstream:
  path: "website/content/docs/commands/deployment/unblock.mdx"
---

The `deployment unblock` command is used to manually mark a blocked
multiregion deployment as successful. A blocked deployment is a multiregion
deployment within a region that has completed within a region but is waiting
on the other federated regions. The `deployment unblock` command can be used
in cases where a failed peer region is unable to communicate its failed
deployment status to other regions to force a deployment to complete.

## Usage

```plaintext
norca deployment unblock [options] <deployment id>
```

The `deployment unblock` command requires a single argument, a deployment ID or
prefix.

When ACLs are enabled, this command requires a token with the `submit-job`
and `read-job` capabilities for the deployment's namespace.

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

## Unblock Options

- `-detach`: Return immediately instead of monitoring. A new evaluation ID
  will be output, which can be used to examine the evaluation using the
  [eval status] command.

- `-verbose`: Show full information.

## Examples

Manually mark an ongoing deployment as unblocked. The deployment status shows
an error on the unreachable "east" region.

```shell
$ norca deployment unblock 8990cfbc
Deployment "8990cfbc-28c0-cb28-ca31-856cf691b987" unblocked

==> Monitoring evaluation "a2d97ad5"
    Evaluation triggered by job "example"
    Evaluation within deployment: "8990cfbc"
    Evaluation status changed: "pending" -> "complete"
==> Evaluation "a2d97ad5" finished with status "complete"

$ norca deployment status 8990cfbc
ID          = 8990cfbc
Job ID      = example
Job Version = 2
Status      = successful
Description = Deployment successful

Multi-region Deployment
Region        ID        Status
west          8990cfbc  successful
south         085787e3  blocked
east (error)  <none>    <none>

Deployed
Task Group  Desired  Placed  Healthy  Unhealthy
cache       3        2       1        0
```

[eval status]: /docs/commands/eval/status/
