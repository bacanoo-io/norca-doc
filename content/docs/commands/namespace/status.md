---
title: "Command: namespace status"
linkTitle: "namespace status"
description: "The namespace status command is used to view the status of a particular namespace."
upstream:
  path: "website/content/docs/commands/namespace/status.mdx"
---

The `namespace status` command is used to view the status of a particular
namespace.

## Usage

```plaintext
norca namespace status [options] <namespace_name>
```

If ACLs are enabled, this command requires a management ACL token or a token
that has a capability associated with the namespace.

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

## Status Options

- `-json` : Output the namespace status in its JSON format.
- `-t` : Format and display the namespace status using a Go template.

## Examples

View the status of a namespace:

```shell
$ norca namespace status default
Name            = api-prod
Description     = Prod API servers
Quota           = prod
EnabledDrivers  = docker,exec
DisabledDrivers = raw_exec

Metadata
contact = platform-eng@example.com

Quota Limits
Region  CPU Usage   Memory Usage
global  500 / 2500  256 / 2000
```

The `-json` flag can be used to get the namespace status in json format:

```shell
$ norca namespace status -json default
{
    "Capabilities": null,
    "CreateIndex": 1,
    "Description": "Default shared namespace",
    "Meta": null,
    "ModifyIndex": 1,
    "Name": "default",
    "Quota": ""
}

Or use the `-t` flag to format and display the status using a Go template:

```shell-session
$ norca namespace status -t {{.Description}} default
Default shared namespace
```
