---
title: Raft protocol
description: What Norca changed, fixed and added around Raft, the consensus of its servers, and what was evaluated and not taken.
weight: 2
---

The servers of a Norca region agree on the cluster state with [Raft](/docs/concepts/consensus). Norca
started from the Raft integration of Nomad v1.6.5 (`hashicorp/raft` v1.5.0, the log in BoltDB). This page
lists what Norca changed, fixed and added around Raft since then, and what was evaluated and not taken.

| Area | Change | Status |
| --- | --- | --- |
| [Raft library](#raft-library) | The `bacanoo-io/raft` fork: upstream 1.8.0, the MessagePack codec of Norca kept | Done |
| [Log and stable store](#log-and-stable-store) | Badger by default, BoltDB as an option; values above 4 KB in the value log | Done |
| [Protocol version](#protocol-version-3-only) | Raft protocol 3 only; the `raft_protocol` option removed | Done |
| [Consistent reads](#consistent-reads) | Linearizable reads with `?consistent`, confirmed by a quorum | Done |
| [Server roles](#server-roles) | Voters, observers and standbys; autopilot decides the votes from the role | Done: observers, standby failover, backups from observers |
| [Observability](#observability) | Raft internals of every server in the metrics store and on the server page | Done |
| [Evaluated, not taken](#evaluated-not-taken-raft-v4) | The "v4" extension of the fork (asynchronous disk writes, read index, typed futures) | Not taken |

## Raft library

Norca uses the [`bacanoo-io/raft`](https://github.com/bacanoo-io/raft) fork instead of
`hashicorp/raft`, through a `replace` directive, so the import path stays `github.com/hashicorp/raft`
and `raft-autopilot` needs no fork:

```text
replace github.com/hashicorp/raft => github.com/bacanoo-io/raft v1.8.0-norca.1
```

- **Upstream 1.8.0** instead of 1.5.0: the pre-vote extension (fewer needless elections when a server
  is cut off and comes back), safer leadership transfer during writes, a data race fix in the network
  transport, `CommitIndex()` and `CurrentTerm()` for diagnostics, and the commit index kept in the log
  store for faster recovery (used by the Badger store).
- **One Norca change in the fork:** the transport and the log encoding helpers keep
  `hashicorp/go-msgpack` v1.1.5, the codec of everything else Norca stores and sends, so the Raft
  messages and the encoded configuration stay byte for byte what they were. The network transport
  encodes and decodes time values in the builtin format on both sides.
- **Metrics** go through `hashicorp/go-metrics`, like the rest of Norca.

The details, the measurements before and after and the licence notes are in
[Storage update: the raft fork](/docs/technology-updates/storage-update#2-the-raft-fork).

## Log and stable store

- **Badger** (`raft/badger`, a Norca package) is the default store of the Raft log and the stable store
  of the servers. Every append is on disk before it is acknowledged (`SyncWrites`), as with BoltDB.
- **BoltDB stays an option:** [`server { raft_store = "boltdb" }`](/docs/configuration/server) keeps
  the log in `raft.db` (`raft-boltdb/v2`) with `raft_boltdb { no_freelist_sync }`. A server does not
  start next to the data of the other store and says what to change.
- **Values above 4 KB go to the value log.** With batches of 512 × 16 KB entries this cut the batch time
  from 153 ms (values up to 1 MB in the LSM tree) to 36.7 ms (BoltDB: 42.5 ms) and halved the memory per
  batch; small entries are unchanged.
- `norca operator raft info/logs/state` read both formats.

The data layout, the profiles against compaction spikes and the results are in
[Storage update: BoltDB to Badger](/docs/technology-updates/storage-update#3-boltdb-to-badger).

## Protocol version 3 only

Nomad still carried the code of Raft protocols 1 and 2 and their upgrades, although its agent accepted
protocol 3 only. Norca has no released versions to upgrade from, so it speaks **protocol 3 only**:

- a server is added as a nonvoter (`AddNonvoter`) and [autopilot](/docs/configuration/autopilot)
  promotes it; removing a server, leaving and the operator endpoints remove by server ID
  (`RemoveServer`); the remove-by-address endpoint looks up the ID of the address first;
- the Serf bootstrap and the Raft `LocalID` always use the node ID;
- `peers.json` recovery reads the protocol 3 format only; the `raft/version` file and its downgrade
  check are gone;
- the server health endpoint no longer compares protocol versions, and answers with an empty reply
  before autopilot's first health check instead of failing;

> [!IMPORTANT]
> **The agent has no `raft_protocol` option and no `-raft-protocol` flag.** A configuration that sets
> it is refused with `server unexpected keys raft_protocol`.

## Consistent reads

Nomad serves a non-stale read from the leader's state without confirming the leadership, so a leader
cut off from its quorum may answer with stale values until it steps down. Norca adds an opt-in
**consistent** read mode:

- `?consistent` on any read endpoint (or `QueryOptions.Consistent` in the Go API client);
- a follower always forwards such a read to the leader, also when `stale` would allow it locally;
- the leader serves it only after it confirmed with a quorum of servers that it is still the leader
  (Raft `VerifyLeader`), and only after its first barrier as leader. A write is acknowledged only
  after the leader applied it, so the answer includes **every write acknowledged before the request**;
- **a leader that lost its quorum answers with an error instead of stale values;**
- the cost is one round trip from the leader to the other servers per read
  (metric `nomad.rpc.consistent_read`).

> [!NOTE]
> `?stale` and `?consistent` contradict each other: a request with both is answered with
> `400 Bad Request`.

The modes are described in [the HTTP API overview](/docs/api#consistency-modes). No change of the
Raft library was needed.

## Server roles

Every server has a [`role`](/docs/configuration/server#role): `voter` (default), `observer` or
`standby`. Before, autopilot promoted every stable non-voter, so a cluster could not keep servers
without a vote. Norca's own autopilot promoter decides the votes from the roles:

- **voters** are promoted once they are stable, as before;
- **observers** replicate the Raft log and the state, serve stale reads and run scheduler workers,
  but never vote: more read and scheduling capacity without a larger quorum. With backup
  [`prefer_observer`](/docs/configuration/backup#prefer_observer) they also take the scheduled and
  manual backups from their own copy of the state, and the leader only records them;
- **standbys** replicate like observers until a voter fails. With autopilot
  [`target_voters`](/docs/configuration/autopilot#target_voters) autopilot promotes the most
  suitable standby when the healthy voters fall below the target (after `standby_failover_after`, or
  at once when the failed voter is gone from the configuration) and lets it step back when the voter
  returns, with a cooldown between the changes;
  [`norca operator raft promote-standby`](/docs/commands/operator/raft/promote-standby) is the
  manual failover;
- a voter restarted with another role is demoted, one per round and only while a `voter`-role server
  keeps the vote; a leader in that state hands over the leadership first.

Every server that is not the leader, observers included, takes work off the leader at the edge: it
rejects a job registration that fails the static validation before forwarding it, runs the dry run of
the placements on its own state (`dry_run_capacity` of
[job registration and plan](/docs/api/jobs#create-job)), and limits the HTTP requests per ACL token
([`limits`](/docs/configuration) `token_*`).

The feature page is [observers and hot standby servers](/docs/features/server-roles).

`norca operator raft list-peers` and the autopilot health API show the role of every server. Every
standby promotion and step back is an event of the `Server` topic of the
[event stream](/docs/api/events), and the leader's metrics store keeps
`norca.cluster.autopilot_voters`, `norca.cluster.autopilot_standbys_ready`,
`norca.cluster.autopilot_standby_promotions` and `norca.cluster.autopilot_standby_demotions`. This is
an independent development under source rules: Norca's own design on the public parts of Raft and autopilot.

## Observability

Every server samples its own Raft internals into its [metrics store](/docs/configuration/metrics_store),
so their history is available without an external metrics system:

| Metric | Meaning |
| --- | --- |
| `norca.server.raft_db_bytes` | Space the Raft log store takes on disk (Badger or BoltDB) |
| `norca.server.raft_last_contact_seconds` | Time since the last contact with the leader |
| `norca.server.raft_commit_lag` | Commit index minus applied index |
| `norca.server.raft_fsm_pending` | Batches waiting for the state machine |
| `norca.server.raft_term` | Current Raft term |
| `norca.server.raft_commit_seconds` | Mean time from append to commit on the leader |
| `norca.server.raft_append_entries_seconds` (label `peer`) | Mean time of the leader's AppendEntries requests to each follower |

The page of a server in the web UI shows them in its **Raft and system bus history** card (operator
read needed).

## Evaluated, not taken: Raft v4

A "protocol version 4" extension of the fork was written and reviewed on 2026-11-11: asynchronous
disk writes on the leader (`AsyncDiskIO`), a batched read index (`ReadIndex`), context-aware and typed
apply futures, a replication status with automatic promotion of nonvoters, a telemetry hook, and
`ProtocolVersionMax = 4`.

> [!IMPORTANT]
> **It is not part of Norca.** Norca keeps the fork's tag `v1.8.0-norca.1`; the review below explains
> why.

The review found:

- **Asynchronous disk writes:** each batch was written by its own goroutine, so batches could reach
  the disk out of order; the leader counted entries as stored before they were on disk; the last log
  index was advanced before the write and not undone on a step-down; and a write still running after a
  step-down could overwrite the entries of the next leader.
- **Read index:** a read joining a batch that was already running got that batch's earlier read
  index, so it could miss a write acknowledged in between (not linearizable); and a new leader could
  serve reads before an entry of its own term was committed.
- **Not needed by Norca:** linearizable reads are served with `VerifyLeader` (see
  [Consistent reads](#consistent-reads)), [autopilot](/docs/configuration/autopilot) already manages
  nonvoters and their promotion, the typed futures only change the API shape, and protocol version 4
  changes nothing on the wire while older servers would refuse it.

The change is kept on the branch
[`v4-experimental`](https://github.com/bacanoo-io/raft/tree/v4-experimental) of the fork; **the main
branch of the fork does not contain it**.

> [!NOTE]
> Asynchronous disk writes would be taken up again only if a measurement shows the Raft disk write as
> the bottleneck, and then with one ordered writer and a step-down that discards the unwritten entries.
