---
title: "Command: login"
linkTitle: "login"
description: "Login to Norca using an authentication method"
upstream:
  path: "website/content/docs/commands/login.mdx"
---

The `login` command is used to log in to an SSO provider and exchange the third
party credentials for a newly minted Norca ACL token.

## Usage

```plaintext
norca login [options]
```

The login command will exchange the provided third party credentials with the
requested auth method for a newly minted Norca ACL token.

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

## Login Options

- `-method`: The name of the ACL auth method to log in via. If the cluster
  administrator has configured a default, this flag is optional.

- `-login-token`: Login token used for authentication that will be exchanged
  for a Norca ACL token. It is only required if using an auth method type other
  than OIDC.

- `-oidc-callback-addr`: The address to use for the local OIDC callback server.
  This should be given in the form of `<IP>:<PORT>` and defaults to
  `localhost:4649`.

- `-json`: Output the ACL token in JSON format.

- `-t`: Format and display the ACL token using a Go template.

## Examples

Login using an OIDC provider:

```shell
$ norca login -method=auth0
Successfully logged in via OIDC and auth0

Accessor ID  = 68123fee-1e8b-7ecc-5b34-505ecd2dcb80
Secret ID    = a47ed236-5a51-cadf-2ad0-4cd0fd5bc393
Name         = OIDC-auth0
Type         = client
Global       = false
Create Time  = 2023-01-12 14:13:04.863238 +0000 UTC
Expiry Time  = 2023-01-12 14:23:04.863238 +0000 UTC
Create Index = 30
Modify Index = 30
Policies     = [node-read]

Roles
ID                                    Name
ac9d4281-2079-aadb-6740-625f4ed156d8  engineering
```
