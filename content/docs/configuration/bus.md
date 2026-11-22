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

    consul_kv_max_bytes      = "256MiB"
    rigger_logs_max_bytes    = "256MiB"
    rigger_logs_max_age      = "720h"
    rigger_bundles_max_bytes = "1GiB"
    reader_compact_threshold = 2000

    events {
      enabled        = true
      subject_prefix = "norca"
      max_age        = "72h"
      max_bytes      = "1GiB"
      max_consumers  = 64
      topics         = ["*"]
    }

    leafnodes {
      enabled = false
    }
  }
}

ports {
  bus          = 4649
  bus_cluster  = 4650
  bus_leafnode = 4652
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

- `rigger_logs_max_bytes` `(string: "256MiB")` - The size limit of the stream
  of the logs of the [stack operations of Rigger](/docs/api/rigger-stacks); a
  sixteenth of `max_storage` when that is less. The oldest logs go first.

- `rigger_logs_max_age` `(string: "720h")` - How long the log of a stack
  operation is kept. The log of an operation is also removed when the
  operation is deleted (the servers keep the last 10 operations of a stack).

- `rigger_bundles_max_bytes` `(string: "1GiB")` - The size limit of the
  object store of the [bundles of Rigger](/docs/api/rigger-stacks#bundles-for-a-cluster-without-a-network)
  imported into the cluster; half of what the other streams leave of
  `max_storage` when that is less. **An import beyond it fails**; no bundle
  is dropped. Delete bundles, or raise the limit. When the other streams
  leave less than 2 MiB and this is not set, there is no object store, and
  an import says so.

- `reader_compact_threshold` `(int: 2000)` - How many retired
  [CDC reader accounts](/docs/features/change-data-capture#guarantees) a server
  must have before it drops them; they must also be more than the live ones,
  and a server drops them at most once an hour. **Dropping them closes every
  connection to the bus of that server once**, as a change of the servers
  does. A higher value means fewer such reconnections and more memory (about
  20 kB per retired account). Must be positive.

- `events` - The [event stream](/docs/features/system-bus#the-event-stream)
  of the region and the handling of
  [pack push notices](/docs/features/system-bus#pack-push-notices):

  - `enabled` `(bool: true)` - The leader publishes the events into the
    stream `NORCA_EVENTS_<region>` and handles the push notices.
  - `subject_prefix` `(string: "norca")` - The first part of the subjects
    `<prefix>.<region>.<namespace>.<topic>`, `<prefix>.packs.pushed` and
    `<prefix>.packs.notices`. One or more
    tokens separated by dots.
  - `max_age` `(string: "72h")` - How long events are kept.
  - `max_bytes` `(string: "1GiB")` - The size limit of the event streams
    together, within `max_storage`: five eighths for `NORCA_EVENTS_<region>`,
    a quarter for the admin events in `NORCA_ADMIN_EVENTS_<region>`, an eighth
    for the Consul KV notices in `NORCA_KV_CHANGES_<region>`. Without it they
    take at most a quarter of `max_storage`.
  - `max_consumers` `(int: 64)` - The consumers each change data capture
    stream (`NORCA_EVENTS_<region>`, `NORCA_ADMIN_EVENTS_<region>`,
    `NORCA_KV_CHANGES_<region>`) may have; creating one more fails. The
    streams also bound their consumers: idle at most `max_age` (a consumer
    without its own `inactive_threshold` gets `max_age` and goes after it),
    at most 1000 messages unacknowledged.
  - `topics` `(array<string>: ["*"])` - The published topics, for example
    `["Job", "Deployment", "Allocation"]`; `"*"` publishes all.

- `leafnodes` - The listener of the [leaf nodes](#leaf-nodes):

  - `enabled` `(bool: false)` - Accepts NATS servers as leaf nodes on the
    `bus_leafnode` port.

## Storage budget

Everything the bus keeps on disk must fit into `max_storage`, or the agent
does not start and says what each part takes:

| Stream | Size |
| --- | --- |
| Events | `events.max_bytes` |
| Pack push notices | `64MiB` |
| Usage reports of the clients | a sixteenth of `max_storage` |
| Consul KV | `consul_kv_max_bytes` |
| Logs of the Rigger stack operations | `rigger_logs_max_bytes` |
| Bundles of Rigger | `rigger_bundles_max_bytes` |

With the defaults that is about 2.8 GiB of the 4 GiB. The events and the push
notices count only when `events.enabled` is set.

## Region names and subjects

The streams of a region must not share subjects. The events use
`<subject_prefix>.<region>.>`, the admin events
`<subject_prefix>.admin.<region>.>`, the usage reports
`norca.telemetry.<region>.*`, the logs of the Rigger stack operations
`norca.rigger.oplog.<region>.*` and the push notices
`<subject_prefix>.packs.pushed` (what a pipeline publishes) and
`<subject_prefix>.packs.notices` (what the servers store). **With the default prefix a region can't be
named `telemetry`, `packs`, `admin` or `rigger`**, and a subject prefix
can't lie under `norca.telemetry` or `norca.rigger.oplog`: the agent refuses to start its bus and
names the subjects that collide.

## Ports and addresses

The bus uses the ports of the agent's [`ports`](/docs/configuration#ports)
block:

- `bus` (`4649`) - The connections of nodes and of tokens with
  [bus rights](/docs/other-specifications/acl-policy#bus-rules).
- `bus_cluster` (`4650`) - The routes between the servers of a region.
- `bus_leafnode` (`4652`) - The [leaf nodes](#leaf-nodes), with
  `leafnodes { enabled = true }` only.

- The listeners bind to the address of the RPC listener.
- Servers advertise both
  ports to each other in their gossip tags.
- Each server opens a route to the
  `bus_cluster` port of the region's other servers at their gossip address, the
  same address that Raft uses.

The defaults differ from the NATS defaults
(4222, 6222), so **a `nats` pack on a server node does not collide with the bus.**

## Leaf nodes

With `leafnodes { enabled = true }` a NATS server outside the cluster
attaches to the bus as a leaf node and receives the changes of the region,
one way ([change data capture](/docs/features/change-data-capture#through-a-leaf-node)).

- **Authentication.** The leaf sends the secret ID of an ACL token in its
  URL (`nats-leaf://<secret ID>@<server>:4652`); the token's
  [`cdc` rule](/docs/other-specifications/acl-policy#cdc-rules) must have
  `leaf = true`, or the token is a management token. Without ACLs no leaf is
  accepted.
- **TLS.** The listener uses the TLS of the client connections: the leaf
  verifies the server with the agent CA and needs no client certificate.
- **An account of its own.** The leaf lands in a NATS account of its own on
  the server it attached to, which imports its subjects and the API of its
  consumers from the account `NORCA` of the bus and nothing else; the leaf
  may publish only the fetches and acknowledgements of its consumers. One
  leaf per token on a server, 10000 subscriptions, 4KiB per message, fetches
  of at most 30 seconds; a leaf with more than 32768 fetches waiting for
  their answers is closed and refused for 30 seconds
  ([limits](/docs/features/change-data-capture#through-a-leaf-node)).
- **Firewall.** Open `bus_leafnode` to the leaf nodes only, as you would the
  HTTP API to its clients.

## Security

- **TLS.** The bus uses the agent's [`tls`](/docs/configuration/tls)
  configuration. With `rpc = true`, both listeners use TLS with the agent's
  certificates:
  - Routes require the certificate of a server of the region
    (`server.<region>.norca`, signed by the agent CA) in both directions.
  - Client connections need no client certificate.

  **Without RPC TLS the bus is not encrypted**, like RPC. A TLS reload
  (`SIGHUP`) reaches the bus: client and leaf node connections are closed and
  connect again under the new CA, certificate and settings; routes are
  checked against the new CA and distrusted CA list, and the ones it refuses
  are closed (a renewed certificate of the same CA keeps them). **Turning the
  TLS of the bus on or off takes a restart.** See
  [TLS reloads](/docs/configuration/tls#tls-configuration-reloads).
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
- **Replies are private.** The connections of the servers, the nodes and
  the tokens with a `bus` rule share the NATS account `NORCA`. A connection
  gets the replies of its own requests under `_INBOX.<accessor id>` and
  can't subscribe to the inbox of another, so the values a server or
  another token reads are not visible to it; a connection without a token
  has no inbox and gets no replies. No connection may publish to a reply
  subject because it received it: a connection answers a request only by the
  `publish` subjects of its
  [`bus` rule](/docs/other-specifications/acl-policy#answering-requests). The
  servers' own connections use inboxes of their own (`_NORCA_INBOX`), which
  no rule reaches. A leaf node and a reader of the changes
  (a `cdc` rule) are each in an account of their own, which holds only
  their subjects, their consumers and their own replies.
- **Usage reports are checked.** The stream stores them without an
  acknowledgement: a node publishes and does not wait. A report must come on
  the subject of its node, and of its task groups only those are kept that the node has an
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

**When the servers of the region change** (a server joins, leaves or gets
another address), **every connection to the bus of a server is closed once**
and connects again: nodes, tokens, workload identities, CDC readers and leaf
nodes. A [TLS reload](/docs/configuration/tls#tls-configuration-reloads) does
the same, and so does dropping the retired reader accounts: a server retires
the account of a CDC reader after 5 minutes without a connection, and drops
the retired ones when it has at least `reader_compact_threshold` (2000) of them and more than live ones,
at most once an hour
([reader accounts](/docs/features/change-data-capture#guarantees)). NATS
clients and leaf nodes reconnect on their own; a
[CDC reader](/docs/features/change-data-capture) gets an account again when it
reconnects and continues from its durable consumer.

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
