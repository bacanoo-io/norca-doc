---
title: "Command: operator bus status"
linkTitle: "status"
description: "The operator bus status command displays the status of the system bus of a server."
weight: 1
---

The `operator bus status` command displays the status of the system bus of one
server:

- its mode (clustered, or standalone in a single-server region), addresses
  and TLS;
- the JetStream meta leader, the cluster size, the streams, consumers and
  messages, and the memory and storage used against their limits;
- the streams the server stores a replica of, with their replicas, leader,
  messages, size and limits;
- the routes to the other servers of the region, with their direction and
  round-trip time;
- the client connections by kind (nodes, tokens, the server's own) and the
  message and byte counters.

Without `-server`, the server that answers the request reports. On a client
agent, that is a server the client is connected to.

## Usage

```plaintext
norca operator bus status [options]
```

If ACLs are enabled, this command requires a token with the `operator:read`
capability.

## Options

- `-server`: The name or ID of the server of the region to report.
- `-json`: Output the status in JSON format.

## Examples

```shell-session
$ norca operator bus status
Server       = nomad-1.global
Cluster      = global
Mode         = clustered
Client URL   = nats://10.0.0.11:4649
Cluster Port = 4650
TLS          = true
Started      = 2026-10-30T19:02:11Z

JetStream
Meta Leader  = nomad-2.global
Cluster Size = 3
Streams      = 2
Consumers    = 1
Messages     = 4127
Memory       = 0 B of 256 MiB
Storage      = 2.1 MiB of 4.0 GiB

Streams
Name                 Replicas  Leader          Messages  Size     Max Age  Max Bytes
NORCA_EVENTS_global  3         nomad-2.global  4125      2.1 MiB  72h0m0s  1.0 GiB
NORCA_PACK_PUSHES    3         nomad-2.global  2         412 B    24h0m0s  64 MiB

Routes
Server          Address         Direction  RTT
nomad-2.global  10.0.0.12:4650  out        412µs
nomad-3.global  10.0.0.13:4650  in         388µs

Connections
Total           = 4
Nodes           = 3
Tokens          = 0
Internal        = 1
Messages In/Out = 1203 / 1188
Bytes In/Out    = 1.2 MiB / 1.1 MiB
```

Another server of the region:

```shell-session
$ norca operator bus status -server nomad-3.global
```
