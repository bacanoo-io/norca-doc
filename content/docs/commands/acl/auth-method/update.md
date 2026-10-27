---
title: "Command: acl auth-method update"
linkTitle: "acl auth-method update"
description: "The auth-method update command is used to update existing ACL Auth Methods."
upstream:
  path: "website/content/docs/commands/acl/auth-method/update.mdx"
---

The `acl auth-method update` command is used to update existing ACL Auth Methods.

## Usage

```plaintext
norca acl auth-method update [options] <auth-method_name>
```

The `acl auth-method update` command requires an existing method's name.

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

## Update Options

- `-type`: Updates the type of the auth method. Supported types are `OIDC` and `JWT`.

- `-max-token-ttl`: Updates the duration of time all tokens created by this auth
  method should be valid for.

- `-token-locality`: Updates the kind of token that this auth method should
  produce. This can be either `local` or `global`.

- `-default`: Specifies whether this auth method should be treated as a default
  one in case no auth method is explicitly specified for a login command.

- `-config`: Auth method [configuration](/docs/api/acl/auth-methods#config) in JSON format. May be prefixed with '@'
  to indicate that the value is a file path to load the config from. '-' may also
  be given to indicate that the config is available on stdin.

- `-json`: Output the ACL auth method in a JSON format.

- `-t`: Format and display the ACL auth method using a Go template.

## Examples

Update an existing ACL auth method:

```shell
$ norca acl auth-method update -token-locality "global" -config @config.json example-acl-auth-method
Name           = example-acl-auth-method
Type           = OIDC
Locality       = global
Max Token TTL  = 1h0m0s
Default        = false
Create Index   = 14
Modify Index   = 33

Auth Method Config

OIDC Discovery URL     = https://my-corp-app-name.auth0.com/
OIDC Client ID         = V1RPi2MYptMV1RPi2MYptMV1RPi2MYpt
OIDC Client Secret     = example-client-secret
Bound audiences        = V1RPi2MYptMV1RPi2MYptMV1RPi2MYpt
Allowed redirects URIs = http://localhost:4646/oidc/callback
Discovery CA pem       = <none>
Signing algorithms     = <none>
Claim mappings         = {http://example.com/first_name: first_name}; {http://example.com/last_name: last_name}
List claim mappings    = {http://nomad.com/groups: groups}
```
