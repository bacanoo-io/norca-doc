---
title: "Command: agent-info"
linkTitle: "agent-info"
description: "Display information and status of a running agent."
upstream:
  path: "website/content/docs/commands/agent-info.mdx"
---

The `agent-info` command dumps metrics and status information of a running
agent. The information displayed pertains to the specific agent the CLI
is connected to. This is useful for troubleshooting and performance monitoring.

## Usage

```plaintext
norca agent-info [options]
```

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

## Agent Info Options

- `-json` : Output agent info in its JSON format.
- `-t` : Format and display agent info using a Go template.

## Output

Depending on the agent queried, information from different subsystems is
returned. These subsystems are described below:

- client - Status of the local Norca client
- `nomad` - Status of the local Norca server
- serf - Gossip protocol metrics and information
- raft - Status information about the Raft consensus protocol
- runtime - Various metrics from the runtime environment

## Examples

```shell
$ norca agent-info
raft
  commit_index = 0
  fsm_pending = 0
  last_contact = never
  last_snapshot_term = 0
  state = Follower
  term = 0
  applied_index = 0
  last_log_index = 0
  last_log_term = 0
  last_snapshot_index = 0
  num_peers = 0
runtime
  cpu_count = 4
  goroutines = 43
  kernel.name = darwin
  max_procs = 4
  version = go1.5
  arch = amd64
serf
  intent_queue = 0
  member_time = 1
  query_queue = 0
  event_time = 1
  event_queue = 0
  failed = 0
  left = 0
  members = 1
  query_time = 1
  encrypted = false
client
  heartbeat_ttl = 0
  known_servers = 0
  last_heartbeat = 9223372036854775807
  num_allocations = 0
nomad
  bootstrap = false
  known_regions = 1
  leader = false
  server = true
```
