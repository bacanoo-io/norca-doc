---
title: "Command: var get"
linkTitle: "var get"
description: "The \"var get\" command retrieves the variable at the given path from Norca. If no variable exists at that path, an error is returned."
upstream:
  path: "website/content/docs/commands/var/get.mdx"
---

The `var get` command is used to get the contents of an existing [variable][].

## Usage

```plaintext
norca var get [options] <path>
```

If ACLs are enabled, this command requires a token with the `variables:read`
capability for the target variable's namespace and path. See the [ACL policy][]
documentation for details.

## General Options

- `-address=<addr>`: The address of the Norca server. Overrides the `NORCA_ADDR`
  environment variable if set. Defaults to `http://127.0.0.1:4646`.

- `-region=<region>`: The region of the Norca server to forward commands to.
  Overrides the `NORCA_REGION` environment variable if set. Defaults to the
  Agent's local region.

- `-namespace=<namespace>`: The target namespace for queries and actions bound
  to a namespace. Overrides the `NORCA_NAMESPACE` environment variable if set.
  If set to `'*'`, subcommands which support this functionality query all
  namespaces authorized to user. Defaults to the "default" namespace.

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

## Output Options

- `-item` `(string: "")`: Print only the value of the given item. Specifying
   this option will take precedence over other formatting directives. The result
   will not have a trailing newline making it ideal for piping to other
   processes.

- `-out` `(enum: go-template | hcl | json | none | table )`: Format to render the
  variable in. When using "go-template", you must provide the template content
  with the `-template` option. Defaults to "table" when stdout is a terminal and
  to "json" when stdout is redirected.

- `-template` `(string: "")` Template to render output with. Required when
  output is "go-template".

## Examples

Retrieve the variable stored at path "secret/creds":

```shell
$ norca var get secret/creds
Namespace   = default
Path        = secret/creds
Create Time = 2022-08-23T11:14:37-04:00
Check Index = 116

Items
passcode = my-long-passcode
```

Return only the "passcode" item from the variable stored at "secret/creds":

```shell
$ norca var get -item=passcode secret/creds
my-long-passcode
```

[variable]: /docs/concepts/variables/
[ACL Policy]: /docs/other-specifications/acl-policy#variables
