---
title: "Commands (CLI)"
linkTitle: "Commands (CLI)"
description: "Norca can be controlled via a command-line interface. This page documents all the commands Norca accepts."
upstream:
  path: "website/content/docs/commands/index.mdx"
weight: 7
---

Norca is controlled via a very easy to use command-line interface (CLI).
Norca is only a single command-line application: `norca`, which
takes a subcommand such as "agent" or "status". The complete list of
subcommands is in the navigation to the left.

The Norca CLI is a well-behaved command line application. In erroneous cases,
a non-zero exit status will be returned. It also responds to `-h` and `--help`
as you would most likely expect.

To view a list of the available commands at any time, just run Norca
with no arguments. To get help for any specific subcommand, run the subcommand
with the `-h` argument.

Each command has been conveniently documented on this website. Links to each
command can be found on the left.

## Norca Command Families

Norca keeps the commands of Nomad v1.6.5 and adds the following command
families and subcommands:

| Command | Description |
| --- | --- |
| [`norca quota`](/docs/commands/quota/) | Interact with resource quotas |
| [`norca admission-policy`](/docs/commands/admission-policy/) | Interact with admission policies |
| [`norca network-policy`](/docs/commands/network-policy/) | Interact with network policies |
| [`norca object`](/docs/commands/object/) | Interact with custom objects |
| [`norca object-kind`](/docs/commands/object-kind/) | Interact with custom object kinds |
| [`norca secret`](/docs/commands/secret/) | Interact with the secrets of the built-in secret store |
| [`norca service intention`](/docs/commands/service/intention/) | Interact with service intentions |
| [`norca service register`](/docs/commands/service/register/) | Register an external service |
| [`norca operator backup`](/docs/commands/operator/backup/) | List, browse and restore the scheduled backups of a region |
| [`norca operator unseal`](/docs/commands/operator/unseal/) | Enter an unseal share on a server |
| [`norca deployment run`](/docs/commands/deployment/run/) | Run a pending multiregion deployment |
| [`norca pack`](/docs/commands/pack/) | Render, plan, run and manage packs and pack releases |

## Autocomplete

Norca's CLI supports command autocomplete. Autocomplete can be installed or
uninstalled by running the following on bash, zsh or fish shells:

```shell
$ norca -autocomplete-install
$ norca -autocomplete-uninstall
```

## Command Contexts

Norca's CLI commands have implied contexts in their naming convention. Because
the CLI is most commonly used to manipulate or query jobs, you can assume that
any given command is working in that context unless the command name implies
otherwise.

For example, the `norca job run` command is used to run a new job, the `norca status` command queries information about existing jobs, etc. Conversely,
commands with a prefix in their name likely operate in a different context.
Examples include the `norca agent-info` or `norca node drain` commands,
which operate in the agent or node contexts respectively.

### Remote Usage

The Norca CLI may be used to interact with a remote Norca cluster, even when the
local machine does not have a running Norca agent. To do so, set the
`NORCA_ADDR` environment variable or use the `-address=<addr>` flag when running
commands.

```shell
$ NORCA_ADDR=https://remote-address:4646 norca status
$ norca status -address=https://remote-address:4646
```

The provided address must be reachable from your local machine. There are a
variety of ways to accomplish this (VPN, SSH Tunnel, etc). If the port is
exposed to the public internet it is highly recommended to configure TLS.

### Environment Variables

Norca can use environment variables to configure command-line tool options.
These environment variables can be overridden as needed using individual
flags.

Each `NORCA_*` variable below is also accepted with its Nomad name, for example
`NOMAD_ADDR` for `NORCA_ADDR`, so existing Nomad environments keep working. The
`NORCA_*` variable takes precedence when both are set.

#### Connection Environment Variables

- `NORCA_ADDR` - The address of the Norca server. Defaults to
  `http://127.0.0.1:4646`.

- `NORCA_REGION` - The region of the Norca server to forward commands to.
  Defaults to the Agent's local region

- `NORCA_NAMESPACE` - The target namespace for queries and actions bound to a
  namespace. If set to `*`, job and alloc subcommands query all namespaces
  authorized to user. Defaults to the "default" namespace.

- `NORCA_HTTP_AUTH` - (Optional) This allows users to supply "Basic" HTTP
  authentication scheme ([RFC 7617](https://tools.ietf.org/html/rfc7617))
  information in environments where the Nomad API is behind an authenticating
  proxy server.

#### ACL Environment Variables

- `NORCA_TOKEN` - The SecretID of an ACL token to use to authenticate API
  requests with.

#### CLI Environment Variables

- `NORCA_CLI_NO_COLOR` - Disables colored command output.

- `NORCA_CLI_FORCE_COLOR` - Forces colored command output.

#### mTLS Environment Variables

- `NORCA_CLIENT_CERT` - Path to a PEM encoded client certificate for TLS
  authentication to the Norca server. Must also specify `NORCA_CLIENT_KEY`.

- `NORCA_CLIENT_KEY` - Path to an unencrypted PEM encoded private key matching
  the client certificate from `NORCA_CLIENT_CERT`.

- `NORCA_CACERT` - Path to a PEM encoded CA cert file to use to verify the
  Norca server SSL certificate.

- `NORCA_CAPATH` - Path to a directory of PEM encoded CA cert files to verify
  the Norca server SSL certificate. If both `NORCA_CACERT` and `NORCA_CAPATH`
  are specified, `NORCA_CACERT` is used.

- `NORCA_SKIP_VERIFY` - Do not verify TLS certificate. **This is highly not
  recommended.**

- `NORCA_TLS_SERVER_NAME` - The server name to use as the SNI host when
  connecting via TLS.
