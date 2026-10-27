---
title: "Command: admission-policy inspect"
linkTitle: "admission-policy inspect"
description: "The admission-policy inspect command shows the details of an admission policy."
---

The `admission-policy inspect` command is used to show the details of an
admission policy, including its rules.

## Usage

```plaintext
norca admission-policy inspect [options] <name>
```

If ACLs are enabled, this command requires a token with the `read` capability
of the `admission` policy.

## General Options

- `-address=<addr>`: The address of the Norca server. Overrides the `NORCA_ADDR`
  environment variable if set. Defaults to `http://127.0.0.1:4646`.

- `-region=<region>`: The region of the Norca server to forward commands to.
  Overrides the `NORCA_REGION` environment variable if set. Defaults to the
  Agent's local region.

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

## Inspect Options

- `-json`: Output the admission policy in JSON format.

- `-t`: Format and display the admission policy using a Go template.

## Examples

Show an admission policy:

```shell
$ norca admission-policy inspect apps-baseline
Name         = apps-baseline
Description  = Baseline rules for the jobs of the apps namespace
Action       = deny
Resources    = job
Namespaces   = apps
Create Index = 1042
Modify Index = 1042

Rule 0
Expression = !job.TaskGroups.exists(g, g.Tasks.exists(t, t.Driver == 'docker' && has(t.Config.privileged) && t.Config.privileged))
Message    = Privileged containers are not allowed in the apps namespace.

Rule 1
Expression = job.TaskGroups.all(g, g.Count <= 10)
Message    = A task group of the apps namespace may have at most 10 instances.
```

Policies with Variables or schema settings also show `Variable Paths` and
`Schema From`.
