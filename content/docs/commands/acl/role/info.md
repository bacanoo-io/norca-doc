---
title: "Command: acl role info"
linkTitle: "acl role info"
description: "The role info command is used to fetch information about an existing ACL Role."
upstream:
  path: "website/content/docs/commands/acl/role/info.mdx"
---

The `acl role info` command is used to fetch information about an existing ACL Role.

## Usage

```plaintext
norca acl role info [options] <role_id> or <role_name>
```

The `acl role info` command requires an existing role's ID or name.

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

## Info Options

- `-by-name`: Look up the ACL role using its name as the identifier. The
  command defaults to expecting the ACL ID as the argument.

- `-json`: Output the ACL role in a JSON format.

- `-t`: Format and display the ACL role using a Go template.

## Examples

Fetch information about an existing ACL Role using its ID:

```shell
$ norca acl role info a53b0095-c28a-6181-0586-807b82e665e4
ID           = a53b0095-c28a-6181-0586-807b82e665e4
Name         = example-acl-role
Description  = <none>
Policies     = general-write
Create Index = 71
Modify Index = 71
```

Fetch information about an existing ACL Role using its name:

```shell
$ norca acl role info -by-name example-acl-role
ID           = a53b0095-c28a-6181-0586-807b82e665e4
Name         = example-acl-role
Description  = <none>
Policies     = general-write
Create Index = 71
Modify Index = 71
```
