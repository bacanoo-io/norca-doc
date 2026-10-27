---
title: "Command: server force-leave"
linkTitle: "server force-leave"
description: "The server force-leave command is used to force a server into the \"left\" state."
upstream:
  path: "website/content/docs/commands/server/force-leave.mdx"
---

The `server force-leave` command forces a server to enter the "left" state.
This can be used to eject server nodes which have failed and will not rejoin
the cluster. The failed or left server will be garbage collected after `24h`. 

> [!WARNING]
> Note that if the server is actually still alive, it will
> eventually rejoin the cluster again.

## Usage

```plaintext
norca server force-leave [options] <node>
```

This command expects only one argument - the node which should be forced
to enter the "left" state.

Additionally, by specifying the `prune` flag, a failed or left node can be forcibly removed
from the list of members immediately.

If ACLs are enabled, this option requires a token with the `agent:write`
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

## Server Force-Leave Options

- `-prune`: Removes failed or left server from the Serf member list immediately.
	If member is actually still alive, it will eventually rejoin the cluster again.

## Examples

Force-leave the server "node1":

```shell
$ norca server force-leave node1

```

Force-leave the server "node1" and prune it:

```shell
$ norca server force-leave -prune node1

```
