---
title: "Command: acl role create"
linkTitle: "acl role create"
description: "The role create command is used to create new ACL Roles."
upstream:
  path: "website/content/docs/commands/acl/role/create.mdx"
---

The `acl role create` command is used to create new ACL Roles.

## Usage

```plaintext
norca acl role create [options]
```

The `acl role create` command requires the correct setting of the create options
via flags detailed below.

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

## Create Options

- `-name`: Sets the human-readable name for the ACL Role. It is required and
  can contain alphanumeric characters, dashes, and underscores. This name must
  be unique and must not exceed 128 characters.

- `-description`: A free form text description of the role that must not exceed
  256 characters.

- `-policy`: Specifies a policy to associate with the role identified by their
  name. This flag can be specified multiple times and must be specified at
  least once.

- `-json`: Output the ACL role in a JSON format.

- `-t`: Format and display the ACL role using a Go template.

## Examples

Create a new ACL Role:

```shell
$ norca acl role create -name="example-acl-role" -policy=example-acl-policy
ID           = a53b0095-c28a-6181-0586-807b82e665e4
Name         = example-acl-role
Description  = <none>
Policies     = example-acl-policy
Create Index = 71
Modify Index = 71
```
