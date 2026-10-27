---
title: "Command: job history"
linkTitle: "job history"
description: "The history command is used to display all tracked versions of a job."
upstream:
  path: "website/content/docs/commands/job/history.mdx"
---

The `job history` command is used to display the known versions of a particular
job. The command can display the diff between job versions and can be useful for
understanding the changes that occurred to the job as well as deciding job
versions to revert to.

## Usage

```plaintext
norca job history [options] <job>
```

The `job history` command requires a single argument, the job ID or an ID prefix
of a job to display the history for.

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

## History Options

- `-p`: Display the differences between each job and its predecessor.
- `-full`: Display the full job definition for each version.
- `-version`: Display only the history for the given version.
- `-json` : Output the job versions in its JSON format.
- `-t` : Format and display the job versions using a Go template.

## Examples

Display the history showing differences between versions:

```shell
$ norca job history -p e
Version     = 2
Stable      = false
Submit Date = 07/25/17 20:35:43 UTC
Diff        =
+/- Job: "example"
+/- Task Group: "cache"
  +/- Task: "redis"
    +/- Resources {
          CPU:      "500"
          DiskMB:   "0"
      +/- MemoryMB: "256" => "512"
        }

Version     = 1
Stable      = false
Submit Date = 07/25/17 20:35:31 UTC
Diff        =
+/- Job: "example"
+/- Task Group: "cache"
  +/- Count: "1" => "3"
      Task: "redis"

Version     = 0
Stable      = false
Submit Date = 07/25/17 20:35:28 UTC
```

Display the memory ask across submitted job versions:

```shell
$ norca job history -t "{{range .}}\
v{{.Version}}: {{with index .TaskGroups 0}}{{with index .Tasks 0}}{{.Resources.MemoryMB}}{{end}}{{end}}\

{{end}}" example
v2: 512
v1: 256
v0: 256
```
