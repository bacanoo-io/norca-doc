---
title: "Command: acl token info"
linkTitle: "acl token info"
description: "The token info command is used to fetch information about an existing ACL token."
upstream:
  path: "website/content/docs/commands/acl/token/info.mdx"
---

The `acl token info` command is used to fetch information about an existing ACL token.

## Usage

```plaintext
norca acl token info <token_accessor_id>
```

The `acl token info` command requires an existing token's AccessorID.

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

Fetch information about an existing ACL token:

```shell
$ norca acl token info 1b60edc8-e4ed-08ef-208d-ecc18a90ccc3
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
