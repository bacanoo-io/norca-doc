---
title: "Command: acl policy apply"
linkTitle: "acl policy apply"
description: "The policy apply command is used to create or update ACL policies."
upstream:
  path: "website/content/docs/commands/acl/policy/apply.mdx"
---

The `acl policy apply` command is used to create or update ACL policies.

## Usage

```plaintext
norca acl policy apply [options] <name> <path>
```

The `acl policy apply` command requires two arguments, the policy name and path
to file. The policy can be read from stdin by setting the path to "-".

This command requires a management ACL token.

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

## Apply Options

- `-description`: Sets the human readable description for the ACL policy.

- `-job`: Attaches the policy to the specified job. Requires that `-namespace` is
    also set.

- `-namespace`: Attaches the policy to the specified namespace. Requires that
    `-job` is also set.

- `-group`: Attaches the policy to the specified task group. Requires that
    `-namespace` and `-job` are also set.

- `-task`: Attaches the policy to the specified task. Requires that `-namespace`,
    `-job` and `-group` are also set.

## Examples

Create a new ACL Policy:

```shell
$ norca acl policy apply my-policy my-policy.json
Successfully wrote 'my-policy' ACL policy!
```

Associate an ACL Policy with a specific task:

```shell
$ norca acl policy apply \
    -namespace default -job example -group cache -task redis \
    my-policy my-policy.json
Successfully wrote 'my-policy' ACL policy!
```
