---
title: "bus Block"
linkTitle: "bus"
description: "The \"bus\" block configures the system bus: the NATS server with JetStream embedded in the Norca servers."
---

**Placement:** `server -> bus`

The `bus` block configures the system bus of a server: a NATS server with
JetStream that runs inside the Norca server process. The servers of a region
form one NATS cluster. The bus carries Norca's own traffic. It is not a
message broker for applications: applications use their own NATS, for
example the `nats` pack.

The bus is enabled by default on servers.

```hcl
server {
  bus {
    enabled         = true
    max_memory      = "256MiB"
    max_storage     = "4GiB"
    max_payload     = "1MiB"
    max_connections = 10000

    events {
      enabled        = true
      subject_prefix = "nomad"
      max_age        = "72h"
      max_bytes      = "1GiB"
      topics         = ["*"]
    }
  }
}

ports {
  bus         = 4649
  bus_cluster = 4650
}
```

## Parameters

- `enabled` `(bool: true)` - Starts the system bus on the server.

- `max_memory` `(string: "256MiB")` - The memory a server's JetStream may
  use for memory-backed streams.

- `max_storage` `(string: "4GiB")` - The disk space a server's JetStream may
  use for file-backed streams. The store is the `bus` directory in the
  server's data directory (`[data_dir]/server/bus`).

- `max_payload` `(string: "1MiB")` - The largest message a connection may
  publish, up to `64MiB`.

- `max_connections` `(int: 10000)` - The largest number of client connections
  of a server.

- `events` - The [event stream](/docs/features/system-bus#the-event-stream)
  of the region and the handling of
  [pack push notices](/docs/features/system-bus#pack-push-notices):

  - `enabled` `(bool: true)` - The leader publishes the events into the
    stream `NORCA_EVENTS_<region>` and handles the push notices.
  - `subject_prefix` `(string: "nomad")` - The first part of the subjects
    `<prefix>.<region>.<topic>` and `<prefix>.packs.pushed`. One or more
    tokens separated by dots.
  - `max_age` `(string: "72h")` - How long events are kept.
  - `max_bytes` `(string: "1GiB")` - The size limit of the stream, within
    `max_storage`. Without it the stream takes at most a quarter of
    `max_storage`. JetStream reserves this space together with the 64MiB of
    the pack push notices; both must stay below `max_storage`, so that the
    Consul KV bucket still fits.
  - `topics` `(array<string>: ["*"])` - The published topics, for example
    `["Job", "Deployment", "Allocation"]`; `"*"` publishes all.

## Ports and addresses

The bus uses two ports of the agent's [`ports`](/docs/configuration#ports)
block:

- `bus` (`4649`) - The connections of nodes and of tokens with
  [bus rights](/docs/other-specifications/acl-policy#bus-rules).
- `bus_cluster` (`4650`) - The routes between the servers of a region.

The listeners bind to the address of the RPC listener. Servers advertise both
ports to each other in their gossip tags. Each server opens a route to the
`bus_cluster` port of the region's other servers at their gossip address, the
same address that Raft uses. The defaults differ from the NATS defaults
(4222, 6222), so a `nats` pack on a server node does not collide with the bus.

## Security

- **TLS.** The bus uses the agent's [`tls`](/docs/configuration/tls)
  configuration. With `rpc = true`, both listeners use TLS with the agent's
  certificates:
  - Routes require the certificate of a server of the region
    (`server.<region>.nomad`, signed by the agent CA) in both directions.
  - Client connections need no client certificate.

  Without RPC TLS the bus is not encrypted, like RPC.
- **Authentication.** A node logs in with its node ID and node secret. It may
  publish only its own usage subject. Anyone else needs an ACL token whose
  policies have a [`bus` rule](/docs/other-specifications/acl-policy#bus-rules);
  management tokens may use every subject. When a token is deleted, or its
  policies or a node change, the affected connections are closed within
  seconds and reconnect with their new rights.

## Clustering

JetStream runs clustered when the region has or expects more than one server
(`bootstrap_expect` greater than 1, or several servers in the Raft
configuration). A clustered server waits for its peers like Raft does.

A region with a single server runs a standalone JetStream. When a second
server joins, the bus of the first server restarts clustered. Its standalone
store is moved to `[data_dir]/server/bus.standalone`, and its streams are not
carried over.

[`norca operator bus status`](/docs/commands/operator/bus/status) shows the
routes, the JetStream meta leader, the usage and the connections of a server.

## Isolation from the control plane

The bus shares the server process with Raft and the scheduler. Its limits keep
it bounded:

- The memory, storage, payload and connection limits above.
- Streams with their own limits that drop their oldest messages.
- Slow consumers are disconnected rather than buffered.
- The JetStream data lives apart from the Raft data and is never part of
  the Raft snapshots.

Routes are compressed according to their round-trip time (`s2_auto`), as
the servers of a region usually run in different zones.
