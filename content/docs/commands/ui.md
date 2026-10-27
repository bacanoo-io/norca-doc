---
title: "Command: ui"
linkTitle: "ui"
description: "The ui command is used to open the Norca Web UI."
upstream:
  path: "website/content/docs/commands/ui.mdx"
---

The `ui` command is used to open the Norca Web UI.

## Usage

```plaintext
norca ui [options] <identifier>
```

The `ui` command can be called with no arguments, in which case the UI homepage
will be opened in the default browser.

An identifier may be provided, in which case the UI will be opened to view the
details for that object. Supported identifiers are jobs, allocations and nodes.

If ACLs are enabled, the web UI will start in an unauthenticated state and you
may see a 403 Unauthorized page if anonymous read access is denied. The `norca ui -authenticate` option will exchange your command line client's Norca ACL
token for a one-time token, which is passed to the web UI. That one-time token
will be exchanged for your Norca ACL token and stored in the browser's local
storage for authentication.

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

## UI Options

- `-authenticate`: Exchange your Norca ACL token for a one-time token in the
  web UI.

- `-show-url`: Show the Norca UI URL instead of opening with the default browser.

## Examples

Open the UI homepage:

```shell
$ norca ui
Opening URL "http://127.0.0.1:4646"
```

Open the UI directly to look at a job:

```shell
$ norca ui redis-job
http://127.0.0.1:4646/ui/jobs/redis-job
```

Open the UI directly to look at an allocation:

```shell
$ norca ui d4005969
Opening URL "http://127.0.0.1:4646/ui/allocations/d4005969-b16f-10eb-4fe1-a5374986083d"
```

Open the UI and authenticate using your ACL token:

```shell
$ NOMAD_ACL_TOKEN=e9674b26-763b-4637-a28f-0df95c53cdda norca ui -authenticate
Opening URL "http://127.0.0.1:4646" with token
```

Show the UI URL without opening the browser:

```shell
$ norca ui -show-url
URL for web UI: http://127.0.0.1:4646
```
