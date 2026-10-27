---
title: "Command: job allocs"
linkTitle: "job allocs"
description: "The allocs command is used to list allocations for a job."
upstream:
  path: "website/content/docs/commands/job/allocs.mdx"
---

The `job allocs` command is used to display the allocations for a
particular job.

## Usage

```plaintext
norca job allocs [options] <job>
```

The `job allocs` command requires a single argument, the job ID or an ID
prefix of a job to display the list of allocations for.

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

## Allocs Options

- `-all`: Display all allocations matching the job ID, even those from an
  older instance of the job.

- `-json`: Output the allocations in JSON format.

- `-t`: Format and display the allocations using a Go template.

- `-verbose`: Show full information.

## Examples

List the allocations for a particular job:

```shell
$ norca job allocs example
ID        Node ID   Task Group  Version  Desired  Status   Created   Modified
c2b4606d  35085106  cache       2        run      running  21s ago   10s ago
c413424b  35085106  cache       2        run      pending  1m8s ago  11s ago
```

Verbose listing of allocations for a particular job:

```shell
$ norca job allocs -verbose example
ID                                    Eval ID                               Node ID                               Node Name  Task Group  Version  Desired  Status   Created                    Modified
c2b4606d-1b02-0d8d-5fdd-031167cd4c91  5e2badb6-b7cf-5177-8281-8fe14f7193d2  35085106-9480-b465-a348-deb745024394  ubuntu     cache       2        run      running  2021-09-23T14:45:09-04:00  2021-09-23T14:45:19-04:00
c413424b-d80e-9bc6-ea92-a02b336eaaf5  5e2badb6-b7cf-5177-8281-8fe14f7193d2  35085106-9480-b465-a348-deb745024394  ubuntu     cache       2        run      pending  2021-09-23T14:44:22-04:00  2021-09-23T14:45:19-04:00
```

Format job allocations using a Go template:
```shell
$ norca job allocs -t '{{ range . }}{{ println .ID }}{{ end }}' example
c2b4606d-1b02-0d8d-5fdd-031167cd4c91
c413424b-d80e-9bc6-ea92-a02b336eaaf5
```

Use a Go template to filter only allocations which are running
```shell
$ norca job allocs -t '{{ range . }}{{ if eq .ClientStatus "running" }}{{ println .ID }}{{ end }}{{ end }}' example
c2b4606d-1b02-0d8d-5fdd-031167cd4c91
```
