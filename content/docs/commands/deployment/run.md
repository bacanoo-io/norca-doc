---
title: "Command: deployment run"
linkTitle: "deployment run"
description: "The deployment run command starts a pending multiregion deployment."
---

The `deployment run` command starts a pending
[multiregion deployment](/docs/features/multiregion) that waits for its turn in
the rollout, for example when the peer region that would start it is
unreachable. The deployment moves from `pending` to `running`, and the
scheduler places the allocations of the new job version in its region.

## Usage

```plaintext
norca deployment run [options] <deployment id>
```

The `deployment run` command requires a single argument, a deployment ID or
prefix. Use `-region` to address the region of the deployment.

When ACLs are enabled, this command requires a token with the `submit-job`
and `read-job` capabilities for the deployment's namespace.

## General Options

- `-address=<addr>`: The address of the Norca server. Overrides the
  `NORCA_ADDR` environment variable if set. Defaults to
  `http://127.0.0.1:4646`.

- `-region=<region>`: The region of the Norca servers to forward commands to.
  Overrides the `NORCA_REGION` environment variable if set. Defaults to the
  agent's local region.

- `-namespace=<namespace>`: The target namespace for queries and actions bound
  to a namespace. Overrides the `NORCA_NAMESPACE` environment variable if set.
  Defaults to the "default" namespace.

- `-no-color`: Disables colored command output. Alternatively,
  `NORCA_CLI_NO_COLOR` may be set. This option takes precedence over
  `-force-color`.

- `-force-color`: Forces colored command output. Alternatively,
  `NORCA_CLI_FORCE_COLOR` may be set. This option has no effect if `-no-color`
  is also used.

- `-ca-cert=<path>`: Path to a PEM encoded CA cert file to use to verify the
  Norca server SSL certificate. Overrides the `NORCA_CACERT` environment
  variable if set.

- `-ca-path=<path>`: Path to a directory of PEM encoded CA cert files to verify
  the Norca server SSL certificate. Overrides the `NORCA_CAPATH` environment
  variable if set.

- `-client-cert=<path>`: Path to a PEM encoded client certificate for TLS
  authentication to the Norca server. Must also specify `-client-key`.
  Overrides the `NORCA_CLIENT_CERT` environment variable if set.

- `-client-key=<path>`: Path to an unencrypted PEM encoded private key matching
  the client certificate from `-client-cert`. Overrides the `NORCA_CLIENT_KEY`
  environment variable if set.

- `-tls-server-name=<value>`: The server name to use as the SNI host when
  connecting via TLS. Overrides the `NORCA_TLS_SERVER_NAME` environment
  variable if set.

- `-tls-skip-verify`: Do not verify TLS certificate. This is highly not
  recommended. Verification will also be skipped if `NORCA_SKIP_VERIFY` is
  set.

- `-token`: The SecretID of an ACL token to use to authenticate API requests
  with. Overrides the `NORCA_TOKEN` environment variable if set.

Each `NORCA_*` environment variable is also accepted with its Nomad name, for
example `NORCA_ADDR` for `NORCA_ADDR`.

Each `NORCA_*` environment variable above is also accepted with its Nomad
name, for example `NOMAD_ADDR` for `NORCA_ADDR`. The `NORCA_*` variable takes
precedence when both are set.

## Run Options

- `-detach`: Return immediately instead of entering monitor mode. The
  evaluation ID is printed, which can be used to examine the evaluation using
  the [eval status] command.

- `-verbose`: Display full information.

## Examples

Start the pending deployment of the region `eu-2`, whose turn has not come
because `eu-1` could not reach it:

```shell
$ norca deployment list -region eu-2 -namespace apps
$ norca deployment run -region eu-2 -namespace apps 8990cfbc
Deployment "8990cfbc-28c0-cb28-ca31-856cf691b987" started

==> Monitoring evaluation "a2d97ad5"
```

[eval status]: /docs/commands/eval/status/
