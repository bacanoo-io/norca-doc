---
title: "Command: operator api"
linkTitle: "operator api"
description: "operator api is a utility command for accessing Norca's HTTP API similar to the popular open source program curl."
upstream:
  path: "website/content/docs/commands/operator/api.mdx"
---

The `operator api` command allows easy access to Norca's HTTP API similar to
the popular [curl] program. Norca's `operator api` command reads [environment
variables][envvars] to dramatically ease HTTP API access compared to trying to
manually write the same command with the third party `curl` command.

For example for the following environment:

```
NOMAD_TOKEN=d4434353-c797-19e4-a14d-4068241f86a4
NOMAD_CACERT=$HOME/.nomad/ca.pem
NOMAD_CLIENT_CERT=$HOME/.nomad/cli.pem
NOMAD_CLIENT_KEY=$HOME/.nomad/client-key.pem
NOMAD_TLS_SERVER_NAME=client.global.nomad
NOMAD_ADDR=https://remote.client123.internal:4646
```

Accessing Norca's [`/v1/jobs`][jobs] HTTP endpoint with `norca operator
api` would require:

```
norca operator api /v1/jobs
```

Performing the same request using the external `curl` tool would require:

```
curl \
  --cacert "$HOME/.nomad/ca.pem" \
  --cert "$HOME/.nomad/client.pem" \
  --key "$HOME/.nomad/client-key.pem" \
  --connect-to "client.global.nomad:4646:remote.client123.internal:4646" \
  -H "X-Nomad-Token: ${NOMAD_TOKEN}" \
  https://client.global.nomad:4646/v1/jobs
```

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

## Operator API Options

- `-dryrun`: output a curl command instead of performing the HTTP request
  immediately. Note that you do *not* need the 3rd party `curl` command
  installed to use `operator api`. The `curl` output from `-dryrun` is intended
  for use in scripts or running in locations without a Norca binary present.

- `-filter`: Specifies an expression used to filter query results.

- `-H`: Adds an additional HTTP header to the request. May be specified more
  than once. These headers take precedence over automatically set ones such as
  `X-Nomad-Token`.

- `-verbose`: Output extra information to stderr similar to curl's --verbose
  flag.

- `-X`: HTTP method of request. If there is data piped to stdin, then the
  method defaults to POST. Otherwise the method defaults to GET.

## Examples

```shell
$ norca operator api -verbose /v1/agent/members?pretty
> GET http://127.0.0.1:4646/v1/agent/members?pretty=
* Sending request and receiving response...
< HTTP/1.1 200 OK
< Date: Wed, 02 Mar 2022 01:10:59 GMT
< Content-Type: application/json
< Vary: Accept-Encoding
{
    "Members": [
...

$ norca operator api -region eu-west -filter 'Status == "completed"' -dryrun /v1/evaluations
curl \
  -X GET \
    http://127.0.0.1:4646/v1/evaluations?filter=.Status+%3D%3D+%22completed%22&region=eu-west
```

[curl]: https://curl.se/
[envvars]: /docs/commands#environment-variables
[jobs]: /docs/api/jobs/
