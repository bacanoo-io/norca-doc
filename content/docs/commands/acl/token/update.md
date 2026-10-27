---
title: "Command: acl token update"
linkTitle: "acl token update"
description: "The token update command is used to update existing ACL tokens."
upstream:
  path: "website/content/docs/commands/acl/token/update.mdx"
---

The `acl token update` command is used to update existing ACL tokens.

## Usage

```plaintext
norca acl token update [options] <token_accessor_id>
```

The `acl token update` command requires an existing token's accessor ID.

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

- `-type`: Sets the type of token. Must be one of "client" or "management".

- `-global`: Toggles the global mode of the token. Global tokens are replicated
  to all regions. Defaults false.

- `-policy`: Specifies a policy to associate with the token. Can be specified
  multiple times, but only with client type tokens.

## Examples

Update an existing ACL token:

```shell
$ norca acl token update -name="example-acl-token-updated" ef851ca0-b331-da5d-bbeb-7ede8f7c9151
Accessor ID  = ef851ca0-b331-da5d-bbeb-7ede8f7c9151
Secret ID    = 11d5348a-8768-5baa-6185-c154980e1488
Name         = example-acl-token-updated
Type         = client
Global       = false
Create Time  = 2022-08-23 12:16:09.680699039 +0000 UTC
Expiry Time  = <never>
Create Index = 140
Modify Index = 151
Policies     = [example-acl-policy]

Roles
ID                                    Name
2fe0c403-4502-e99d-4c79-a2821355e66d  example-acl-role-updated
```
