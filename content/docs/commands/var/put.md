---
title: "Command: var put"
linkTitle: "var put"
description: "The \"var put\" command writes a variable to the given path in Norca."
upstream:
  path: "website/content/docs/commands/var/put.mdx"
---

The `var put` command creates or updates an existing [variable][].

## Usage

```plaintext
norca var put [options] <variable spec file reference> [<key>=<value>]...
norca var put [options] <path to store variable> [<variable spec file reference>] [<key>=<value>]...
```

Variable metadata and items can be supplied using a [variable
specification][varspec], by using command arguments, or by a combination of the
two techniques. An entire variable specification can be provided to the command
via standard input (stdin) by setting the first argument to "-" or from a file
by using an @-prefixed path to a variable specification file. When providing
variable data via stdin, you must provide the `-in` flag with the format of the
specification, which must be either "hcl" or "json".

Items to be stored in the variable can be supplied using the specification, as a
series of key-value pairs, or both. The value for a key-value pair can be a
string, an @-prefixed file reference, or a '-' to get the value from stdin. Item
values provided from file references or stdin are consumed as-is with no
additional processing and do not require the input format to be specified.

Values supplied as command line arguments supersede values provided in any
variable specification piped into the command or loaded from file. If ACLs are
enabled, this command requires the `variables:write` capability for the
destination namespace and path. See the [ACL policy][] documentation for
details.

## Restrictions

Variable paths are restricted to [RFC3986][] URL-safe characters that don't
conflict with the use of the characters `@` and `.` in template blocks. This
includes alphanumeric characters and the special characters `-`, `_`, `~`, and
`/`. Paths may be up to 128 bytes long. The following regex matches the allowed
paths: `^[a-zA-Z0-9-_~/]{1,128}$`

The keys for the items in a variable may contain any character, but keys
containing characters outside the set of Unicode letters, Unicode digits, and
the underscore (`_`) can not be read directly using dotted references in Norca's
template engine. Instead, they require the use of the `index` template function
to directly access their values. This does not impact cases where the keys and
values are read using the `range` function.

Variable items are restricted to 64KiB in size. This limit is calculated by
taking the sum of the length in bytes of all of the unencrypted keys and values.

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

## Put Options

- `-check-index` `(int: <unset>)`: If set, the variable is only acted upon if
  the server-side version's index matches the provided value. When a variable
  specification contains a modify index, that modify index is used as the
  check-index for the check-and-set operation and can be overridden using this
  flag.

- `-force`: Perform this operation regardless of the state or index of the
  variable on the server-side.

- `-in` `(enum: hcl | json)`: Parser to use for data supplied via standard input
  or when the variable specification's type can not be known using the file
  extension. Defaults to "json".

- `-out` `(enum: go-template | hcl | json | none | table)`: Format to render
  created or updated variable. Defaults to "none" when stdout is a terminal and
  "json" when the output is redirected.

- `-template` `(string: "")`: Template to render output with. Required when
  format is "go-template", invalid for other formats.

- `-verbose`: Provides additional information via standard error to preserve
  standard output (stdout) for redirected output.

## Examples

Writes the data to the path "secret/creds":

```shell
$ norca var put secret/creds passcode=my-long-passcode
```

The data can also be consumed from a file on disk by prefixing with the "@"
symbol. For example, you can store a variable using a specification created with
the `norca var init` command.

```shell
$ norca var put secret/foo @spec.nv.json
```

Or it can be read from standard input using the "-" symbol:

```shell
$ echo "abcd1234" | norca var put secret/foo bar=-
```

[variable]: /docs/concepts/variables/
[varspec]: /docs/other-specifications/variables/
[ACL Policy]: /docs/other-specifications/acl-policy#variables
[RFC3986]: https://www.rfc-editor.org/rfc/rfc3986#section-2
