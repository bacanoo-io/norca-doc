---
title: "Command: job deployments"
linkTitle: "job deployments"
description: "The deployments command is used to list deployments for a job."
upstream:
  path: "website/content/docs/commands/job/deployments.mdx"
---

The `job deployments` command is used to display the deployments for a
particular job.

## Usage

```plaintext
norca job deployments [options] <job>
```

The `job deployments` command requires a single argument, the job ID or an ID
prefix of a job to display the list of deployments for.

When ACLs are enabled, this command requires a token with the `read-job`
capability for the job's namespace. The `list-jobs` capability is required to
run the command with a job prefix instead of the exact job ID.

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

## Deployment Options

- `-latest`: Display the latest deployment only.

- `-json` : Output the deployment in its JSON format.

- `-t` : Format and display the deployment using a Go template.

- `-verbose`: Show full information.

- `-all`: Display all deployments matching the job ID, even those from an
  older instance of the job.

## Examples

List the deployment for a particular job:

```shell
$ norca job deployments example
ID        Job ID   Job Version  Status      Description
0b23b149  example  1            running     Deployment is running but requires manual promotion
06ca68a2  example  0            successful  Deployment completed successfully
```
