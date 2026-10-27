---
title: "Command: acl token create"
linkTitle: "acl token create"
description: "The token create command is used to create new ACL tokens."
upstream:
  path: "website/content/docs/commands/acl/token/create.mdx"
---

The `acl token create` command is used to create new ACL tokens.

## Usage

```plaintext
norca acl token create [options]
```

The `acl token create` command requires no arguments.

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

- `-name`: Sets the human readable name for the ACL token.

- `-type`: Sets the type of token. Must be one of "client" (default), or
  "management".

- `-global`: Toggles the global mode of the token. Global tokens are replicated
  to all regions. Defaults false.

- `-policy`: Specifies a policy to associate with the token. Can be specified
  multiple times, but only with client type tokens.

- `-role-id`: ID of a role to use for this token. May be specified multiple
  times.

- `-role-name`: Name of a role to use for this token. May be specified multiple
  times.

- `-ttl`: Specifies the time-to-live of the created ACL token. This takes the
  form of a time duration such as "5m" and "1h". By default, tokens will be
  created without a TTL and therefore never expire.

- `-json`:Output the ACL token information in JSON format.

- `-t`: Format and display the ACL token information using a Go template.

## Examples

Create a new ACL token linked to an ACL Policy and Role:

```shell
$ norca acl token create -name="example-acl-token" -policy=example-acl-policy -role-name=example-acl-role
Accessor ID  = ef851ca0-b331-da5d-bbeb-7ede8f7c9151
Secret ID    = 11d5348a-8768-5baa-6185-c154980e1488
Name         = example-acl-token
Type         = client
Global       = false
Create Time  = 2022-08-23 12:16:09.680699039 +0000 UTC
Expiry Time  = <none>
Create Index = 140
Modify Index = 140
Policies     = [example-acl-policy]

Roles
ID                                    Name
2fe0c403-4502-e99d-4c79-a2821355e66d  example-acl-policy
```

Create a new ACL token with an expiry:

```shell
$ norca acl token create -name="example-acl-token" -policy=example-acl-policy -ttl=8h
Accessor ID  = 1b60edc8-e4ed-08ef-208d-ecc18a90ccc3
Secret ID    = e4c7c80e-870b-c6a6-43d2-dbfa90130c06
Name         = example-acl-token
Type         = client
Global       = false
Create Time  = 2022-08-23 12:17:35.45067293 +0000 UTC
Expiry Time  = 2022-08-23 20:17:35.45067293 +0000 UTC
Create Index = 142
Modify Index = 142
Policies     = [example-acl-policy]

Roles
<none>
```
