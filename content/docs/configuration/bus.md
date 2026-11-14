---
title: "bus Block"
linkTitle: "bus"
description: "The \"bus\" block configures the system bus: the NATS server with JetStream embedded in the Norca servers."
---

**Placement:** `server -> bus`

The `bus` block configures the system bus of a server: a NATS server with
JetStream that runs inside the Norca server process. The servers of a region
form one NATS cluster. The bus carries Norca's own traffic. **It is not a
message broker for applications:** applications use their own NATS, for
example the `nats` pack.

**The bus is enabled by default on servers.**

```hcl
server {
  bus {
    enabled         = true
    max_memory      = "256MiB"
    max_storage     = "4GiB"
    max_payload     = "1MiB"
    max_connections = 10000

    consul_kv_max_bytes = "256MiB"

    events {
      enabled        = true
      subject_prefix = "norca"
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

- `consul_kv_max_bytes` `(string: "256MiB")` - The size limit of the bucket of
  the [Consul KV of the Consul-compatible API](/docs/api/consul-compatible) on the bus; an
  eighth of `max_storage` when that is less. **A write beyond it fails**
  ("the Consul KV of the system bus is full"); no key is dropped. Raise the
  limit, or delete keys.

- `events` - The [event stream](/docs/features/system-bus#the-event-stream)
  of the region and the handling of
  [pack push notices](/docs/features/system-bus#pack-push-notices):

  - `enabled` `(bool: true)` - The leader publishes the events into the
    stream `NORCA_EVENTS_<region>` and handles the push notices.
  - `subject_prefix` `(string: "norca")` - The first part of the subjects
    `<prefix>.<region>.<namespace>.<topic>` and `<prefix>.packs.pushed`. One or more
    tokens separated by dots.
  - `max_age` `(string: "72h")` - How long events are kept.
  - `max_bytes` `(string: "1GiB")` - The size limit of the stream, within
    `max_storage`. Without it the stream takes at most a quarter of
    `max_storage`.
  - `topics` `(array<string>: ["*"])` - The published topics, for example
    `["Job", "Deployment", "Allocation"]`; `"*"` publishes all.

## Storage budget

Everything the bus keeps on disk must fit into `max_storage`, or the agent
does not start and says what each part takes:

| Stream | Size |
| --- | --- |
| Events | `events.max_bytes` |
| Pack push notices | `64MiB` |
| Usage reports of the clients | a sixteenth of `max_storage` |
| Consul KV | `consul_kv_max_bytes` |

With the defaults that is about 1.6 GiB of the 4 GiB. The events and the push
notices count only when `events.enabled` is set.

## Region names and subjects

The streams of a region must not share subjects. The events use
`<subject_prefix>.<region>.>`, the usage reports `norca.telemetry.<region>.*`
and the push notices `<subject_prefix>.packs.pushed`. **With the default
prefix a region can't be named `telemetry` or `packs`**, and a subject prefix
can't lie under `norca.telemetry`: the agent refuses to start its bus and
names the subjects that collide.

## Ports and addresses

The bus uses two ports of the agent's [`ports`](/docs/configuration#ports)
block:

- `bus` (`4649`) - The connections of nodes and of tokens with
  [bus rights](/docs/other-specifications/acl-policy#bus-rules).
- `bus_cluster` (`4650`) - The routes between the servers of a region.

- The listeners bind to the address of the RPC listener.
- Servers advertise both
  ports to each other in their gossip tags.
- Each server opens a route to the
  `bus_cluster` port of the region's other servers at their gossip address, the
  same address that Raft uses.

The defaults differ from the NATS defaults
(4222, 6222), so **a `nats` pack on a server node does not collide with the bus.**

## Security

- **TLS.** The bus uses the agent's [`tls`](/docs/configuration/tls)
  configuration. With `rpc = true`, both listeners use TLS with the agent's
  certificates:
  - Routes require the certificate of a server of the region
    (`server.<region>.norca`, signed by the agent CA) in both directions.
  - Client connections need no client certificate.

  **Without RPC TLS the bus is not encrypted**, like RPC.
- **Authentication.** A node logs in with its node ID and node secret. It may
  publish only its own usage subject and **subscribes to nothing**. Anyone else needs an ACL token whose
  policies have a [`bus` rule](/docs/other-specifications/acl-policy#bus-rules);
  management tokens may use every subject. When a token is deleted, or its
  policies or a node change, **the affected connections are closed within
  seconds** and reconnect with their new rights.

- **The Consul KV is encrypted at rest.** The servers encrypt every value
  of the [Consul KV](/docs/features/service-discovery/consul-compatible-api)
  with the active root key of the [keyring](/docs/commands/operator/root/keyring-rotate)
  (AES-256-GCM) before it goes into the bucket, as they do with Variables.
  The files of the bus on the disks of the servers and the backups hold
  ciphertext only. A value is bound to its key: copied under another key in
  the files it does not decrypt, and a value that does not decrypt is an
  error, never returned.
  - **A value written by a version that did not encrypt stays readable and
    is encrypted by its next write.** To encrypt all of them, write each key
    again.
  - **A root key that encrypts a value of the KV is kept** by the garbage
    collection of the keyring, as one that encrypts a Variable is, and
    [`norca operator root keyring remove`](/docs/commands/operator/root/keyring-remove)
    refuses to remove it.
  - `norca operator root keyring rotate -full` encrypts the values again
    with the new key. **The revision (`ModifyIndex`) of such a key changes**
    and a blocking query of it returns, with the same value.
  - **The events, the usage reports and the push notices are not encrypted
    at rest.** An event holds the object it is about (a job with its
    environment variables, for example), as the Raft state does: protect the
    data directory of the servers.
- **Replies are private.** All connections share one NATS account. A
  connection gets the replies of its own requests under
  `_INBOX.<accessor id>` and can't subscribe to the inbox of another, so the
  values a server or another token reads are not visible to it.
- **Usage reports are checked.** A report must come on the subject of its
  node, and of its task groups only those are kept that the node has an
  allocation of; the rest is dropped and counted
  (`nomad.bus.telemetry.foreign_groups`). The stream keeps at most 1024
  reports of a node, so a node that publishes too fast replaces its own
  reports only.

## Clustering

JetStream runs clustered when the region has or expects more than one server
(`bootstrap_expect` greater than 1, or several servers in the Raft
configuration). A clustered server waits for its peers like Raft does.

A region with a single server runs a standalone JetStream. When a second
server joins, the bus of the first server restarts clustered:

1. Its standalone
   store is moved to `[data_dir]/server/bus.standalone`.
2. The server carries the
   keys of the Consul KV over into the clustered bucket (a key already there is
   kept) and marks the store as carried over; **the other streams, such as the
   event history, are not carried over.**

The streams and the Consul KV bucket have one replica per server, up to
three. **With two servers they have two replicas and need both servers**, as
Raft does with two servers: the bus is then no less available than the
control plane, and the data is on both disks.

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
