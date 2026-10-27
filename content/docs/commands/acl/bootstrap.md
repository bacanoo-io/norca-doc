---
title: "Command: acl bootstrap"
linkTitle: "acl bootstrap"
description: "The bootstrap command is used to create the initial ACL token."
upstream:
  path: "website/content/docs/commands/acl/bootstrap.mdx"
---

The `acl bootstrap` command is used to bootstrap the initial ACL token.

## Usage

```plaintext
norca acl bootstrap [options]
```

The `acl bootstrap` command can be used in two ways: 
- If you provide no arguments it will return a system generated bootstrap token.
- If you would like to provide an operator generated token it is possible to provide the token
using a file `acl bootstrap [path]`. The Token can be read from stdin by setting the path to "-". 
Please make sure you secure this token in an apropriate manner as it could be written to your terminal history.

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

## Bootstrap Options

- `-json` : Output the bootstrap response in JSON format.
- `-t` : Format and display the deployments using a Go template.

## Examples

Bootstrap the initial token without arguments:

```shell
$ norca acl bootstrap
Accessor ID  = 5b7fd453-d3f7-6814-81dc-fcfe6daedea5
Secret ID    = 9184ec35-65d4-9258-61e3-0c066d0a45c5
Name         = Bootstrap Token
Type         = management
Global       = true
Policies     = n/a
Create Time  = 2017-09-11 17:38:10.999089612 +0000 UTC
Create Index = 7
Modify Index = 7
```

Bootstrap the initial token with provided token:

root.token file
```shell
2b778dd9-f5f1-6f29-b4b4-9a5fa948757a
```

```shell
$ norca acl bootstrap root.token
Accessor ID  = 5b7fd453-d3f7-6814-81dc-fcfe6daedea5
Secret ID    = 2b778dd9-f5f1-6f29-b4b4-9a5fa948757a
Name         = Bootstrap Token
Type         = management
Global       = true
Policies     = n/a
Create Time  = 2017-09-11 17:38:10.999089612 +0000 UTC
Create Index = 7
Modify Index = 7
```

Bootstrap the initial token with provided token using stdin 

```shell
$ norca acl bootstrap -
2b778dd9-f5f1-6f29-b4b4-9a5fa948757a
EOF
Accessor ID  = 5b7fd453-d3f7-6814-81dc-fcfe6daedea5
Secret ID    = 2b778dd9-f5f1-6f29-b4b4-9a5fa948757a
Name         = Bootstrap Token
Type         = management
Global       = true
Policies     = n/a
Create Time  = 2017-09-11 17:38:10.999089612 +0000 UTC
Create Index = 7
Modify Index = 7
```
