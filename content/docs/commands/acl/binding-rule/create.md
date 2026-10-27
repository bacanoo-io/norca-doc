---
title: "Command: acl binding-rule create"
linkTitle: "acl binding-rule create"
description: "The binding-rule create command is used to create new ACL Binding Rules."
upstream:
  path: "website/content/docs/commands/acl/binding-rule/create.mdx"
---

The `acl binding-rule create` command is used to create new ACL Binding Rules.

## Usage

```plaintext
norca acl binding-rule create [options]
```

The `acl binding-rule create` command requires the correct setting of the create options
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

- `-description`: A free form text description of the binding-rule that must not exceed
  256 characters.

- `-auth-method`: Specifies the name of the ACL authentication method that this
  binding rule is associated with.

- `-selector`: Selector is an expression that matches against verified identity
  attributes returned from the auth method during login.

  > [!WARNING]
  > Selectors that operate on `ClaimMappings` (as opposed to
  > `ListClaimMappings`), the key that we match against has to be prefixed with
  > `value.`

- `-bind-type`: Specifies adjusts how this binding rule is applied at login time
  to internal Norca objects. Valid options are `role`, `policy`, and `management`.

- `-bind-name`: Specifies is the target of the binding used on selector match.
  This can be lightly templated using HIL `${foo}` syntax. If the bind type is
  set to `management`, this should not be set.

- `-json`: Output the ACL binding-rule in a JSON format.

- `-t`: Format and display the ACL binding-rule using a Go template.

## Examples

Create a new ACL Binding Rule:

```shell
$ norca acl binding-rule create \
    -description "example binding rule" \
    -auth-method "auth0" \
    -bind-type "role" \
    -bind-name "eng-ro" \
    -selector "engineering in list.roles"
ID           = 698fdad6-dcb3-79dd-dc72-b43374057dea
Description  = example binding rule
Auth Method  = auth0
Selector     = "engineering in list.roles"
Bind Type    = role
Bind Name    = eng-ro
Create Time  = 2022-12-20 11:15:22.582568 +0000 UTC
Modify Time  = 2022-12-20 11:15:22.582568 +0000 UTC
Create Index = 14
Modify Index = 14
```

Create a new ACL Binding Rule where the selector needs to be escaped on UNIX
machines:

```shell
$ norca acl binding-rule create \
    -description "example binding rule" \
    -auth-method "auth0" \
    -bind-type "role" \
    -bind-name "eng-ro" \
    -selector "\"product-developer\" in list.roles"
ID           = 698fdad6-dcb3-79dd-dc72-b43374057dea
Description  = example binding rule
Auth Method  = auth0
Selector     = "\"project-developer\" in list.roles"
Bind Type    = role
Bind Name    = eng-ro
Create Time  = 2022-12-20 11:15:22.582568 +0000 UTC
Modify Time  = 2022-12-20 11:15:22.582568 +0000 UTC
Create Index = 14
Modify Index = 14
```

Create a new ACL Binding Rule where the selector needs to be escaped on Windows
machines via PowerShell:

```shell
$ norca.exe acl binding-rule create \
    -description "example binding rule" \
    -auth-method "auth0" \
    -bind-type "role" \
    -bind-name "eng-ro" \
    -selector="`"project-developer`"
ID           = 698fdad6-dcb3-79dd-dc72-b43374057dea
Description  = example binding rule
Auth Method  = auth0
Selector     = "\"project-developer\" in list.roles"
Bind Type    = role
Bind Name    = eng-ro
Create Time  = 2022-12-20 11:15:22.582568 +0000 UTC
Modify Time  = 2022-12-20 11:15:22.582568 +0000 UTC
Create Index = 14
Modify Index = 14
```

Create a new ACL Binding Rule where the selector uses a mathing against a
single `ClaimMapping` which uses `owner` as its value:

```shell
$ norca acl binding-rule create \
    -description "example binding rule" \
    -auth-method "github" \
    -bind-type "role" \
    -bind-name "eng-ro" \
    -selector="value.owner == user"
ID           = 698fdad6-dcb3-79dd-dc72-b43374057dea
Description  = example binding rule
Auth Method  = github
Selector     = "value.owner == user"
Bind Type    = role
Bind Name    = eng-ro
Create Time  = 2022-12-20 11:15:22.582568 +0000 UTC
Modify Time  = 2022-12-20 11:15:22.582568 +0000 UTC
Create Index = 14
Modify Index = 14
```
