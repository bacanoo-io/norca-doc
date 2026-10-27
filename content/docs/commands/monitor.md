---
title: "Command: monitor"
linkTitle: "monitor"
description: "Stream the logs of a running Norca agent."
upstream:
  path: "website/content/docs/commands/monitor.mdx"
---

The `norca monitor` command streams log messages for a given agent.

## Usage

```plaintext
norca monitor [options]
```

The `norca monitor` command can be used to stream the logs of a
running Norca agent. Monitor will follow logs and exit when
interrupted or until the remote agent quits.

The power of the monitor command is that it allows you to log
the agent at a relatively high log level (such as "warn"),
but still access debug logs and watch the debug logs if necessary.
The monitor command also allows you to specify a single client node id to follow.

When ACLs are enabled, this command requires a token with the `agent:read`
capability.

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

## Monitor Options

- `-log-level`: The log level to use for log streaming. Defaults to `info`.
  Possible values include `trace`, `debug`, `info`, `warn`, `error`

- `-log-include-location`: Include file and line information in each log line.
  The default is `false`.

- `-node-id`: Specifies the client node-id to stream logs from. If no
  node-id is given the Norca server from the -address flag will be used.

- `-server-id`: Specifies the Norca server id to stream logs from. Accepts
  server names from `norca server members` and also a special `leader` option
  which will target the current leader.

- `-json`: Stream logs in json format

## Examples

```shell
$ norca monitor -log-level=DEBUG -node-id=a57b2adb-1a30-2dda-8df0-25abb0881952
2019-11-04T12:22:08.528-0500 [DEBUG] http: request complete: method=GET path=/v1/agent/health?type=server duration=1.445739ms
2019-11-04T12:22:09.892-0500 [DEBUG] nomad: memberlist: Stream connection from=127.0.0.1:53628

$ norca monitor -log-level=DEBUG -json=true
{"@level":"debug","@message":"request complete"...}

```
