---
title: "Command: acl policy info"
linkTitle: "acl policy info"
description: "The policy info command is used to fetch information on an existing ACL policy."
upstream:
  path: "website/content/docs/commands/acl/policy/info.mdx"
---

The `acl policy info` command is used to fetch information on an existing ACL
policy.

## Usage

```plaintext
norca acl policy info <name>
```

The `acl policy info` command requires the policy name.

This command requires a management ACL token or a token that has the
associated policy.

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

## Examples

Fetch information on an existing ACL Policy:

```shell
$ norca acl policy info my-policy
Name        = my-policy
Description = <none>
CreateIndex = 749
ModifyIndex = 758

Rules

{
  "Name": "my-policy",
  "Description": "This is a great policy",
  "Rules": "list_jobs"
}
```

If the ACL Policy is associated with a [Workload Identity][], additional information will be shown:

```shell
$ norca acl policy info my-policy
Name        = my-policy
Description = <none>
CreateIndex = 749
ModifyIndex = 758

Associated Workload
Namespace = default
JobID     = example
Group     = cache
Task      = redis

Rules

{
  "Name": "my-policy",
  "Description": "This is a great policy",
  "Rules": "list_jobs"
}
```

[Workload Identity]: /docs/concepts/workload-identity/ 'Norca Workload Identity'
