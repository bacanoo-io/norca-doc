---
title: "Command: node config"
linkTitle: "node config"
description: "The node config command is used to view or modify client configuration."
upstream:
  path: "website/content/docs/commands/node/config.mdx"
---

The `node config` command is used to view or modify client configuration
details. This command only works on client nodes, and can be used to update
the running client configurations it supports.

## Usage

```plaintext
norca node config [options]
```

The arguments behave differently depending on the flags given. See each flag's
description below for specific usage information and requirements.

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

## Node Config Options

- `-servers`: List the client's known servers. Client nodes do not participate
  in the gossip pool, and instead register with these servers periodically over
  the network. The initial value of this list may come from configuration files
  using the [`servers`] configuration option in the client block.

  If ACLs are enabled, this option requires a token with the 'agent:read'
  capability.

- `-update-servers`: Updates the client's server list using the provided
  arguments. Multiple server addresses may be passed using multiple arguments.
  When updating the servers list, you must specify ALL of the server nodes you
  wish to configure. The set is updated atomically. It is an error to specify
  this flag without any server addresses. If you do _not_ specify a port for each
  server address, the default port `4647` will be used.

  If ACLs are enabled, this option requires a token with the 'agent:write'
  capability.

## Examples

Query the currently known servers:

```shell
$ norca node config -servers
server1:4647
server2:4647
```

Update the list of servers:

```shell
$ norca node config -update-servers server1:4647 server2:4647 server3:4647 server4

```

[`servers`]: /docs/configuration/client#servers
