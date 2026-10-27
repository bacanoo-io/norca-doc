---
title: "Command: var list"
linkTitle: "var list"
description: "The \"var list\" command lists data from Norca's variables datastore at or beginning with the given prefix."
upstream:
  path: "website/content/docs/commands/var/list.mdx"
---

The `var list` command returns a list of [variable][] paths accessible to the
current user, optionally filtered to paths containing a provided prefix. Do not
encode sensitive information in variable paths. The variable's items are not
accessible via this command.

When using pagination, the next page token is provided as part of the output of
the command. When the output format is JSON, the returned variable list is
wrapped with additional metadata that contains the next page token. For non-JSON
output, the next page token is printed as a message to standard error and
standard output contains the variables from the specifically requested page.

## Usage

```plaintext
norca var list [options] [<prefix>]
```

If ACLs are enabled, this command requires the `variables:list` capability for
the namespaces and paths containing the variables to list. See the [ACL policy][]
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

## List Options

- `-per-page` `(int: <unset>)`: How many results to show per page.

- `-page-token` `(string: "")`: Where to start pagination.

- `-filter` `(string: "")`: Specifies an expression used to filter query
  results. Queries using this option are less efficient than using the prefix
  parameter; therefore, the prefix parameter should be used whenever possible.

- `-out` `(enum: go-template | json | table | terse )`: Format to render the
  variable in. When using "go-template", you must provide the template content
  with the `-template` option. Defaults to "table" when stdout is a terminal and
  to "json" when stdout is redirected.

- `-template` `(string: "")` Template to render output with. Required when
  output is "go-template".

## Examples

List values under the key "nomad/jobs":

```shell
$ norca var list nomad/jobs
Namespace  Path                           Last Updated
default    nomad/jobs/example             2022-08-23T10:35:47-04:00
default    nomad/jobs/variable            2022-08-23T10:24:45-04:00
default    nomad/jobs/variable/www        2022-08-23T10:24:45-04:00
default    nomad/jobs/variable/www/nginx  2022-08-23T10:24:46-04:00
```

List values under the key "nomad/jobs/variable/www" in JSON format:

```shell
$ norca var list -out=json -namespace="*" nomad/jobs/variable/www
[
  {
    "Namespace": "default",
    "Path": "nomad/jobs/variable/www",
    "CreateIndex": 1457,
    "ModifyIndex": 1457,
    "CreateTime": 1662061225600373000,
    "ModifyTime": 1662061225600373000
  },
  {
    "Namespace": "default",
    "Path": "nomad/jobs/variable/www/nginx",
    "CreateIndex": 800,
    "ModifyIndex": 1000,
    "CreateTime": 1662061717905426000,
    "ModifyTime": 1662062162982630000
  }
]
```

Perform a paginated query:

```shell
$ norca var list -per-page=3
Namespace  Path                           Last Updated
default    nomad/jobs/example             2022-08-23T10:35:47-04:00
default    nomad/jobs/variable            2022-08-23T10:24:45-04:00
default    nomad/jobs/variable/www        2022-08-23T10:24:45-04:00
Next page token: default.nomad/jobs/variable/www/nginx
```

To fetch the next page :

```shell
$ norca var list -per-page=3 \
  -page-token=default.nomad/jobs/variable/www/nginx
Namespace  Path                 Last Updated
default    nomad/jobs/variable/www/nginx  2022-08-23T10:24:46-04:00
```

Perform a paginated query with JSON formatting:

```shell
$ norca var list -out=json -namespace="*" -per-page=1 nomad/jobs/variable/www
{
    "Data": [
        {
           "Namespace": "default",
            "Path": "nomad/jobs/variable/www",
            "CreateIndex": 1457,
            "ModifyIndex": 1457,
            "CreateTime": 1662061225600373000,
            "ModifyTime": 1662061225600373000
        }
    ],
    "QueryMeta": {
        "KnownLeader": true,
        "LastContact": 0,
        "LastIndex": 43,
        "NextToken": "default.nomad/jobs/variable/www/nginx",
        "RequestTime": 875792
    }
}
```

As with the tabular version, provide the `QueryMeta.NextToken` value as the
`-page-token` value to fetch the next page.

[variable]: /docs/concepts/variables/
[ACL Policy]: /docs/other-specifications/acl-policy#variables
