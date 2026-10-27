---
title: "Command: operator debug"
linkTitle: "operator debug"
description: "Build an archive of debug data."
upstream:
  path: "website/content/docs/commands/operator/debug.mdx"
---

The `operator debug` command builds an archive containing Norca cluster
configuration and state information, Norca server and client node
logs, and pprof profiles from the selected servers and client nodes.

If no selection option is specified, the debug archive contains only
cluster meta information.

## Usage

```plaintext
norca operator debug [options]
```

This command accepts comma separated `server-id` and `node-id` IDs for
monitoring and pprof profiling. If IDs are provided, the command will
monitor logs for the `duration`, saving a snapshot of Norca state
every `interval`. Captured logs and configurations are subjected to
redaction, but may still contain sensitive information and the archive
contents should be reviewed before sharing.

If an `output` path is provided, `debug` will create a timestamped
directory in that path instead of an archive. By default, the command
creates a compressed tar archive in the current directory.

Consul and Vault status and version information are included if
configured.

If ACLs are enabled, this command will require a token with the 'node:read'
capability to run. In order to collect information, the token will also
require the 'agent:read' and 'operator:read' capabilities, as well as the
'list-jobs' capability for all namespaces. To collect pprof profiles the
token will also require 'agent:write', or enable_debug configuration set to
true.

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

## Debug Options

- `-duration=2m`: Set the duration of the debug capture. Logs will be captured from
  specified servers and nodes at `log-level`. Defaults to `2m`.

- `-interval=30s`: The interval between snapshots of the Norca state.
  If unspecified, only one snapshot is captured. Defaults to `30s`.

- `-log-level=DEBUG`: The log level to monitor. Defaults to `DEBUG`.

- `-log-include-location`: Include file and line information in each log line
  monitored. The default is `true`.

- `-max-nodes=<count>`: Cap the maximum number of client nodes included
  in the capture. Defaults to 10, set to 0 for unlimited.

- `-node-class=<node-class>`: Filter client nodes based on node class.

- `-node-id=<node1>,<node2>`: Comma separated list of Norca client node ids
  to monitor for logs, API outputs, and pprof profiles. Accepts id prefixes, and
  "all" to select all nodes (up to count = max-nodes). Defaults to `all`.

- `-pprof-duration=<duration>`: Duration for pprof
  collection. Defaults to 1s or `-duration`, whichever is less.

- `-pprof-interval=<pprof-interval>`: The interval between pprof
    collections. Set interval equal to duration to capture a single
    snapshot. Defaults to 250ms or `-pprof-duration`, whichever is
    less.

- `-server-id=<server1>,<server2>`: Comma separated list of Norca server names to
  monitor for logs, API outputs, and pprof profiles. Accepts server names, "leader", or
  "all". Defaults to `all`.

- `-stale=<true|false>`: If "false", the default, get membership data from the
  cluster leader. If the cluster is in an outage unable to establish
  leadership, it may be necessary to get the configuration from a non-leader
  server.

- `-event-topic=<allocation,evaluation,job,node,*>:<filter>`: Enable event
  stream capture. Filter by comma delimited list of topic filters or "all".
  Defaults to "none" (disabled).  Refer to the [Events API](/docs/api/events/) for
  additional detail.

- `-event-index=<index>`: Specifies the index to start streaming events from.
  If the requested index is no longer in the buffer the stream will start at
  the next available index. Defaults to 0.

- `-verbose`: Enable verbose output

- `-output=path`: Path to the parent directory of the output
  directory. Defaults to the current directory. If specified, no
  archive is built.

- `-consul-http-addr=<addr>`: The address and port of the Consul HTTP
  agent. Overrides the `CONSUL_HTTP_ADDR` environment variable.

- `-consul-token=<token>`: Token used to query Consul. Overrides the
  `CONSUL_HTTP_TOKEN` environment variable and the Consul token
  file.

- `-consul-token-file=<path>`: Path to the Consul token file. Overrides the `CONSUL_HTTP_TOKEN_FILE`
  environment variable.

- `-consul-client-cert=<path>`: Path to the Consul client cert file. Overrides the `CONSUL_CLIENT_CERT`
  environment variable.

- `-consul-client-key=<path>`: Path to the Consul client key file. Overrides the `CONSUL_CLIENT_KEY`
  environment variable.

- `-consul-ca-cert=<path>`: Path to a CA file to use with Consul. Overrides the `CONSUL_CACERT`
  environment variable and the Consul CA path.

- `-consul-ca-path=<path>`: Path to a directory of PEM encoded CA cert files to verify the Consul
  certificate. Overrides the `CONSUL_CAPATH` environment variable.

- `-vault-address=<addr>`: The address and port of the Vault HTTP agent. Overrides the `VAULT_ADDR`
  environment variable.

- `-vault-token=<token>`: Token used to query Vault. Overrides the `VAULT_TOKEN` environment
  variable.

- `-vault-client-cert=<path>`: Path to the Vault client cert file. Overrides the `VAULT_CLIENT_CERT`
  environment variable.

- `-vault-client-key=<path>`: Path to the Vault client key file. Overrides the `VAULT_CLIENT_KEY`
  environment variable.

- `-vault-ca-cert=<path>`: Path to a CA file to use with Vault. Overrides the `VAULT_CACERT`
  environment variable and the Vault CA path.

- `-vault-ca-path=<path>`: Path to a directory of PEM encoded CA cert files to verify the Vault
  certificate. Overrides the `VAULT_CAPATH` environment variable.

## Output

This command prints a summary of the capture and the name of the timestamped
archive file produced.

## Examples

```shell
$ norca operator debug -duration 5s -interval 5s -server-id all -node-id b5,20
Starting debugger...

          Servers: (3/3) [server1.global server2.global server3.global]
          Clients: (2/3) [b547cd3a-085f-68c2-55f4-e99beebb0433 20c0964b-72cc-4083-87fe-ec6905b6230a]
         Interval: 5s
         Duration: 5s

Capturing cluster data...
    Capture interval 0000
    Capture interval 0001
    Capture interval 0002
    Capture interval 0003
Created debug archive: nomad-debug-2020-12-08-034455Z.tar.gz
```

```shell
$ norca operator debug -duration 5s -interval 5s -server-id all -node-id all -max-nodes=1
Starting debugger...

          Servers: (3/3) [server1.global server2.global server3.global]
          Clients: (1/3) [b547cd3a-085f-68c2-55f4-e99beebb0433]
                   Max node count reached (1)
         Interval: 5s
         Duration: 5s

Capturing cluster data...
    Capture interval 0000
    Capture interval 0001
    Capture interval 0002
    Capture interval 0003
Created debug archive: nomad-debug-2020-12-08-034113Z.tar.gz
```
