---
title: "Storage and RPC update – plan"
weight: 1
status: "Plan"
---

**Status:** Plan · 2026-11-02 · Starting point: Norca main (Nomad v1.6.5 base) with `hashicorp/raft`
v1.5.0, `raft-boltdb/v2` v2.2.2, `go.etcd.io/bbolt` v1.3.10, `hashicorp/go-msgpack` v1.1.5,
`google.golang.org/grpc` v1.84.0 and `hashicorp/go-plugin` v1.8.0

Norca updates four building blocks of its storage and of its process-to-process connections:

| # | Area | Today | After the change |
| --- | --- | --- | --- |
| 1 | Encoding | `hashicorp/go-msgpack` v1.1.5 | unchanged: the same MessagePack codec and wire format |
| 2 | Consensus library | `hashicorp/raft` v1.5.0 | the [`bacanoo-io/raft`](https://github.com/bacanoo-io/raft) fork, updated to the current upstream with Norca's changes |
| 3 | Embedded databases | BoltDB (`raft-boltdb/v2`, `bbolt`) | [Badger](https://github.com/dgraph-io/badger) v4, tuned against compaction spikes |
| 4 | Plugin connections | gRPC (through `go-plugin`) | [drpc](https://github.com/bacanoo-io/drpc) (the `bacanoo-io/drpc` fork of `storj.io/drpc`) |

Before any of it, a general performance test records a **baseline**, so that the effect of the whole
change can be measured on the same test afterwards.

## Table of contents

- [Phase 0: baseline performance test](#phase-0-baseline-performance-test)
- [Starting point](#starting-point)
- [1. MessagePack stays](#1-messagepack-stays)
- [2. The raft fork](#2-the-raft-fork)
- [3. BoltDB to Badger](#3-boltdb-to-badger)
- [4. gRPC to drpc](#4-grpc-to-drpc)
- [Phases](#phases)
- [Testing and acceptance](#testing-and-acceptance)
- [Risks](#risks)
- [Licenses](#licenses)
- [Decisions](#decisions)

## Phase 0: baseline performance test

The same test suite runs three times: on the current main before any change (the baseline), after each
phase that changes a hot path (to catch a regression early), and after the last phase (the final
comparison). The suite and its results are versioned, so every run names the Norca commit it measured.

### Rules

- Same hardware and VM sizes for every run: the lab VMs (2 vCPU, 2 GB RAM, the same host and disk),
  the same Go version and build flags (the release build, `-trimpath`, no race detector).
- Every measurement runs at least three times; the result is the median with the spread (min–max).
  Micro benchmarks run with `-count 10` and are compared with `benchstat`.
- The host is otherwise idle; the run records the host load, the kernel and the disk.
- A result is a JSON file plus a short summary per run, in `norca-lab` under `bench/results/<date>-<commit>/`.

### Micro benchmarks (Go, one machine)

| ID | What | How |
| --- | --- | --- |
| B1 | Raft log store: `StoreLog`, `StoreLogs` (batches of 1, 64 and 512 entries of 1 KB and 16 KB), `GetLog`, `FirstIndex`, `LastIndex`, `DeleteRange`; stable store `Set`/`Get`/`SetUint64` | The `bench` package of the raft repository, which runs the same functions against any `LogStore`/`StableStore`: first on `raft-boltdb/v2`, later on the Badger store. Durable writes (fsync) on. |
| B2 | Client state database: storing and reading allocations and task runner states for 100 and 1000 allocations, the write deduplication | The existing `helper/boltdd` benchmarks plus new ones on `client/state`, with the same interface for both backends |
| B3 | Plugin connections: round trip of a unary call and of a streaming call (task stats every second) between the client and `logmon`, the executor and an external driver plugin | New benchmarks on the driver test harness and the executor/logmon clients, run with gRPC first and drpc later |
| B4 | MessagePack encoding of the main structures | The existing `BenchmarkEncodeDecode` in `norca/structs`; a control: it must not change |

### Cluster tests (lab)

On the lab case with three servers and two clients per datacenter (`multidc`), started fresh for each run:

| ID | What | Measured |
| --- | --- | --- |
| M1 | Job submission: 1000 service jobs (count 1–3) and 500 batch jobs, at a fixed rate and as a burst | time from register to placement (p50/p95/p99), evaluations per second, failed placements |
| M2 | Raft under load | `raft.commitTime`, `raft.apply` latency, `raft.fsm.apply`, the replication lag of the followers |
| M3 | Leader failover: the leader is stopped hard (`PowerOff`) | time to a new leader and to the first successful write |
| M4 | Snapshot and restore: state with 10 000 allocations | snapshot time and size, time for a restarted server to be ready, `norca operator snapshot` save and restore time |
| M5 | Client restart with 100 running allocations | time until every task is reattached; task start latency for `exec`, `exec2` and `docker` |
| M6 | Soak: five minutes of steady writes (job updates, allocation updates) | p99, p99.9 and maximum write latency per minute, write stalls, CPU, RSS, disk write bytes and fsyncs per second, size of the data directory over time |

M6 is the test for compaction spikes: a database that compacts in bursts shows up as periodic peaks
in p99.9 latency and disk writes, not in averages.

Process resources come from `/proc/<pid>/stat`, `/proc/<pid>/io` and `/proc/<pid>/status` of the
`norca` processes and their subprocesses (`logmon`, executor); the Norca metrics come from the agent
metrics endpoint. The collector belongs to the lab (`norca-lab`), so it measures every Norca version in
the same way.

### Reporting

After the last phase, a comparison table per ID: baseline, after, change in percent, and whether the
change is beyond the spread of the runs. It is added to this page, together with the commit hashes of
both runs.

## Starting point

| Component | Where | Use |
| --- | --- | --- |
| MessagePack (`hashicorp/go-msgpack` v1.1.5) | `norca/structs` (encoding of raft log entries, snapshots, RPC), `client/state`, `plugins/base`, `helper/raftutil` | the encoding of everything Norca stores or sends between agents |
| Agent RPC | `net/rpc` with MessagePack (`net-rpc-msgpackrpc`) over `yamux` | server–server and client–server calls; **not gRPC** |
| `hashicorp/raft` v1.5.0 | `norca/server.go` | consensus; transport `raft.NewNetworkTransport` (`norca/server.go:1490`) |
| `raft-boltdb/v2` v2.2.2 | `norca/server.go:1535` (`raft.db`, with a log cache), `helper/raftutil` (`norca operator raft info/logs/state`) | raft log store and stable store; agent option `raft_boltdb { no_freelist_sync }` |
| `go.etcd.io/bbolt` v1.3.10 | `helper/boltdd`, `client/state` (`state.db`) | the client's persistent state: allocations, task runner state, dynamic plugin registry, node meta |
| gRPC (`google.golang.org/grpc`) through `hashicorp/go-plugin` | `plugins/base`, `plugins/drivers`, `plugins/device`, `client/logmon`, `drivers/shared/executor`, `drivers/docker/docklog`, `norca/autoscaler/plugins` | connections between the agent and its plugin processes: the per-task `logmon` and executor subprocesses, external task driver and device plugins, external autoscaler plugins |
| gRPC for CSI | `plugins/csi` | the connection to CSI plugins, fixed by the CSI specification |

Two things follow from this map. Agent-to-agent traffic (RPC and raft) is MessagePack over `yamux` and
TCP, so it is not affected by the move from gRPC to drpc; the drpc change speeds up the local
connections between an agent and its plugin processes. And the raft log is written by every server for
every change of the cluster state, so the storage change affects the write latency of the whole
cluster.

## 1. MessagePack stays

The MessagePack codec (`hashicorp/go-msgpack` v1.1.5) and the format of the encoded data do not change:

- raft log entries, snapshots and agent RPC keep their encoding;
- the Badger stores keep the values as they are encoded today (Badger stores bytes; only the
  container changes, see [3](#3-boltdb-to-badger));
- the raft fork is changed so that its own transport encodes with the same codec as before
  (see [2](#2-the-raft-fork)).

Keeping the encoding means that the stored values, the snapshots and the backups keep their format, and
that a server on the old and one on the new storage still exchange the same messages.

## 2. The raft fork

Norca uses the `bacanoo-io/raft` fork instead of `hashicorp/raft`. The fork follows the upstream
`main` (MPL 2.0 in every version, see [licenses](#licenses)) and carries Norca's changes on top.

### Updating the fork

The fork's `main` is synchronized with the upstream (today `a5b4692`, 2026-10-12, 100 commits after
v1.5.0). What Norca gets from the update:

| Upstream change | Version | Effect |
| --- | --- | --- |
| Pre-vote extension, on by default, with its fixes | 1.7.0–1.7.1 | fewer needless elections when a server is cut off and comes back |
| Fix of rare leadership transfer failures during writes | 1.6.1 | safer leader changes (server shutdown, leadership transfer by raft) |
| Data race fix in the network transport | 1.7.0 | – |
| `CommitIndex()`, `CurrentTerm()` | 1.6.0, 1.7.2 | better raft metrics and diagnostics |
| Commit index kept in the log store for faster recovery (optional interface) | 1.8.0 | used by the Badger store, see [3](#3-boltdb-to-badger) |

### Norca's changes in the fork

1. **MessagePack.** Upstream moved to `go-msgpack/v2` (1.6.0). The fork keeps the transport and the
   log encoding helpers on `hashicorp/go-msgpack` v1.1.5, the codec Norca uses, so the raft messages
   stay byte for byte what they are today.
2. Each change is a separate commit with a `Norca:` line in the message; the fork tags its releases as
   `v<upstream>-norca.<n>` (for example `v1.8.0-norca.1`).

### Metrics library

Upstream raft 1.8.0 emits its metrics only through `hashicorp/go-metrics` (MIT), the renamed
continuation of `armon/go-metrics`; Norca collects through `armon/go-metrics` v0.4.1, pinned to a
2023 commit, in about 113 files. Without a change the raft metrics (`raft.*`) would leave the metrics
store, the Prometheus endpoint and the alerts. Norca therefore moves to `hashicorp/go-metrics` v0.7.0 in
phase 1, before it takes the updated raft:

- What it brings: the Prometheus sink can clear metrics that are no longer reported even when nobody
  scrapes the endpoint (`RunBackgroundCleanup`, v0.6.0), the Prometheus client library with its
  security updates (v0.6.1), error logging for the statsd and statsite sinks, and the DataDog line
  ending that the DataDog agent uses to detect truncation.
- What it saves: the fork needs no metrics patch, and the newer versions of `serf`, `memberlist` and
  `raft-autopilot`, which emit through `hashicorp/go-metrics`, can be taken later without patches.
- What it costs: the import path in about 113 files and the sink setup of the agent (in-memory,
  Prometheus, statsd, statsite, DataDog and Circonus sinks all exist in v0.7.0); metric names do not
  change. The `replace` of `armon/go-metrics` is removed when `raft-boltdb`, its last user, goes in
  phase 2.
- What comes with it: `serf` (v0.10.1 → v0.11.0) and `memberlist` (v0.5.0 → v0.7.0), both MPL 2.0,
  emit through `hashicorp/go-metrics` v0.7.0 as well, so they are updated in the same step and the
  gossip metrics stay in the same sinks. `memberlist` v0.7.0 encodes its own gossip messages with
  `go-msgpack/v2`; that is internal to the gossip protocol, every agent runs the same version, and
  Norca's own encoding (section 1) does not change.

Norca uses the fork through a `replace` directive, so the import path stays `github.com/hashicorp/raft`
and `raft-autopilot`, which imports raft by that path, needs no fork:

```text
replace github.com/hashicorp/raft => github.com/bacanoo-io/raft v1.8.0-norca.1
```

`raft-boltdb` goes away with the move to Badger.

## 3. BoltDB to Badger

### Scope

| Store | Today | After |
| --- | --- | --- |
| Raft log and stable store of the servers | `raft.db`, `raft-boltdb/v2` | `raft/badger/`, a Norca package implementing `raft.LogStore`, `raft.StableStore` and the commit index interface of the fork |
| Client state | `client/state.db`, `bbolt` through `helper/boltdd` | `client/state/` as a Badger database behind the same `client/state` interface |
| Operator commands | `helper/raftutil` reads `raft.db` | reads the Badger store (`norca operator raft info/logs/state`) |
| Raft snapshots | files (`raft.FileSnapshotStore`) | unchanged |

Badger is an LSM-tree key-value store with a separate value log. Compared with BoltDB (one B+tree file,
one writer, an fsync of the whole transaction), it writes sequentially and batches writes, which suits
the raft log (append at the end, delete from the start). In exchange it compacts in the background,
and badly sized compaction shows up as latency spikes and write stalls. The configuration is therefore
part of the design, not an afterthought.

### Data layout

- Raft log: key = prefix `l/` + the 8-byte big-endian index, value = the encoded `raft.Log` (the
  MessagePack bytes of today). Stable store: prefix `s/` + the key. The commit index: `c/commit`.
- Client state: today's buckets become key prefixes (`alloc/<id>/...`, `taskrunner/<alloc>/<task>/...`
  and so on). The write deduplication of `boltdd` (skip a write when the value hash is unchanged) is
  kept in the new layer.
- Every store has a format version key; a store with an unknown version is not opened.

### Durability and consistency

- `SyncWrites = true` for both stores: a raft append is acknowledged only after it is on disk, as with
  BoltDB today. `StoreLogs` writes one batch per call, so a batch of entries costs one sync.
- `DetectConflicts = false`: each store has one writer, the conflict tracking of transactions is only
  overhead.
- `NumVersionsToKeep = 1`.
- Truncating the raft log after a snapshot deletes the range in write batches. `DropPrefix` is not used:
  it blocks writes while it runs.

### Configuration against compaction spikes

The values below are the starting point, to be tuned with the soak test (M6) and the store benchmark
(B1). The agent exposes the options that matter for tuning (memory, the level 0 thresholds, the
compactors, the caches, the value log GC interval) in a `badger` block of the server and client
configuration; the rest are fixed by Norca, so the configuration stays shallow.

| Option | Badger default | Starting value (server) | Starting value (client) | Why |
| --- | --- | --- | --- | --- |
| `MemTableSize` | 64 MB | 64 MB | 16 MB | the size of a flush to level 0; larger means fewer, bigger flushes |
| `NumMemtables` | 5 | 3 | 2 | memory bound; enough to absorb a burst while one flushes |
| `NumLevelZeroTables` | 5 | 8 | 5 | level 0 tables before level 0 is compacted |
| `NumLevelZeroTablesStall` | 15 | 24 | 15 | **the write stall threshold**: when level 0 reaches it, writes block. A larger gap to `NumLevelZeroTables` gives compaction room before a burst turns into a stall |
| `NumCompactors` | 4 | 4 | 2 | parallel compactions (the first one prefers level 0); at least 2 |
| `BaseTableSize` | 2 MB | 4 MB | 2 MB | table size on level 1; larger tables mean fewer but longer compactions |
| `BaseLevelSize` | 10 MB | 64 MB | 10 MB | size of level 1; a small level 1 cascades compactions more often |
| `LevelSizeMultiplier` | 10 | 10 | 10 | – |
| `ValueThreshold` | 1 MB | 1 MB | 1 MB | values up to 1 MB stay in the LSM tree, so deleted raft entries are reclaimed by compaction and the value log stays small (it then works mostly as the write-ahead log) |
| `ValueLogFileSize` | 1 GB | 256 MB | 64 MB | smaller files make value log garbage collection cheaper and more even |
| `Compression` | Snappy | Snappy | Snappy | MessagePack compresses well; ZSTD level 1 is measured as an alternative |
| `BlockCacheSize` | 256 MB | 128 MB | 16 MB | memory bound on small nodes |
| `IndexCacheSize` | 0 (unbounded) | 64 MB | 8 MB | bounds the memory of the table indexes |
| `CompactL0OnClose` | false | false | false | keeps shutdown fast |
| `MetricsEnabled` | true | true | true | the compaction and stall metrics below |

Further measures:

- **Value log garbage collection** runs in a background loop (`RunValueLogGC` with a discard ratio of
  0.5, repeated while it frees a file, at most once per interval), never in the write path. With
  `ValueThreshold` at 1 MB it rarely has work.
- **Raft log size** is kept bounded by the existing raft settings (`TrailingLogs`, snapshot interval and
  threshold), so compaction works on a bounded amount of data.
- **Monitoring**: the number of level 0 tables, pending compactions, write stalls, LSM and value log
  size and the GC runs are exported to the Norca metrics store and the Prometheus endpoint
  (`nomad.badger.*`, following the existing metric names). A warning alert fires when level 0 gets close to `NumLevelZeroTablesStall`.
- **Disk space**: an LSM store temporarily needs more space during compaction. Phase 2 adds a free
  space metric and warning for the data directory of servers; clients already garbage collect
  allocations by disk usage (`gc_disk_usage_threshold`).

### Configuration

The agent option `raft_boltdb { no_freelist_sync }` is replaced by:

```hcl
server {
  badger {
    mem_table_size_mb          = 64
    num_level_zero_tables      = 8
    num_level_zero_tables_stall = 24
    num_compactors             = 4
    block_cache_size_mb        = 128
    index_cache_size_mb        = 64
    value_log_gc_interval      = "10m"
  }
}
```

and a `badger` block with the same keys in `client`. Unset keys take the values of the table above.

### Moving existing data

Norca has no released versions, so there is no in-place migration of `raft.db` and `state.db`: a server
or client starts with an empty Badger store and catches up (a server from the leader's snapshot, a
client from the servers). The lab clusters are redeployed. A `norca operator raft` command that finds an
old `raft.db` says so instead of failing silently.

## 4. gRPC to drpc

### What changes

drpc is a smaller RPC library that uses the same protobuf definitions as gRPC but its own framing
instead of HTTP/2, which makes each call cheaper in CPU and memory. Norca uses the `bacanoo-io/drpc`
fork (module path `storj.io/drpc`, through a `replace` directive, like the raft fork).

| Connection | Today | After |
| --- | --- | --- |
| Agent ↔ `logmon` (one subprocess per task) | gRPC through `go-plugin` | drpc |
| Agent ↔ executor (one subprocess per `exec`, `raw_exec` and `java` task) | gRPC through `go-plugin` | drpc |
| Agent ↔ `docker_logger` (one per Docker task) | gRPC through `go-plugin` | drpc |
| Agent ↔ built-in task drivers and devices | in process, no RPC | unchanged |
| Agent ↔ external task driver and device plugins | gRPC through `go-plugin` | drpc for plugins that support it, gRPC otherwise (see below) |
| Agent ↔ external autoscaler plugins | gRPC through `go-plugin` | as external task driver plugins |
| Client ↔ CSI plugins | gRPC | **unchanged**: the CSI specification defines gRPC, and CSI plugins are third-party programs |
| Agent RPC and raft | MessagePack over `yamux` | unchanged (not gRPC) |

### How

- The `.proto` files stay the single definition of each plugin interface. The drpc code is generated
  next to the gRPC code (`protoc-gen-go-drpc`), so both protocols serve the same messages.
- The subprocesses Norca starts itself (`logmon`, executor, `docker_logger`) are part of the same
  binary, so they switch to drpc completely. The process start, the handshake and the reattach after a
  client restart keep working as today: the handshake line written by the subprocess names the
  protocol, and the reattach configuration stored in the client state records it.
- External plugins built against the Nomad 1.6.5 plugin API speak gRPC. Compatibility with them is a
  promise of Norca ([compatibility](/docs/introduction/compatibility)), so the agent offers both: the
  plugin's handshake says which protocol it serves, and the agent uses drpc when the plugin serves it
  and gRPC otherwise. A plugin built with the Norca plugin SDK serves both on one listener
  (`drpcmigrate` tells the two apart by the first bytes of a connection).
- `go-plugin` stays for starting and supervising plugin processes. The drpc side of the plugin
  protocol (serving a plugin over drpc, the client side, the protocol name in the handshake) lives in
  the `bacanoo-io/drpc` fork, as a package next to drpc's own, so Norca and plugin authors take it from
  one place.
- Streaming calls (task stats, log streaming, `alloc exec`) map to drpc streams; cancellation and
  deadlines are carried through the context as today.

### Expected effect

The agent keeps a stats stream open for every running task and a `logmon` and often an executor
process per task, so on a client with many small tasks the plugin connections are a noticeable part of
the CPU and memory of the agent. That is where drpc is expected to help (B3, M5). It does not change
the speed of scheduling or of raft (M1–M4); the baseline shows how large the plugin share is.

## Phases

| Phase | Content | Depends on |
| --- | --- | --- |
| 0 | Benchmark suite (B1–B4, M1–M6) and collector in `norca-lab`; the baseline on the current main | – |
| 1 | Norca moves to `hashicorp/go-metrics`; raft fork synchronized with upstream with MessagePack v1.1.5 kept, tagged; Norca switches with `replace`; B1, M2, M3 against the baseline | 0 |
| 2 | Badger raft store (`raft/badger`), `helper/raftutil`, the `badger` server options, metrics and alerts; `raft-boltdb` removed; B1, M1–M4, M6 | 1 |
| 3 | Badger client state, the `badger` client options; `bbolt` removed; B2, M5, M6 | 2 |
| 4 | drpc for `logmon`, executor and `docker_logger`; the handshake and reattach; B3, M5 | 0 |
| 5 | drpc for external plugins with gRPC fallback; the plugin SDK; tests with a gRPC-only plugin built against the 1.6.5 API | 4 |
| 6 | Final run of the whole suite, the comparison table on this page, the documentation (agent configuration, operations, licence) | 1–5 |

Phases 1–3 and 4–5 are independent of each other and can run in parallel after phase 0.

## Testing and acceptance

- The existing tests of `norca/`, `client/state`, `helper/raftutil`, the plugins and the drivers pass,
  with the same failures as main where the environment causes them.
- The raft log store passes the raft `bench` functions and a conformance test shared with the in-memory
  store (append, read, gaps, truncation, restart).
- Crash tests on the lab: a server and a client are powered off hard during writes; after the restart
  no acknowledged raft entry is lost and the client reattaches to its tasks.
- Acceptance against the baseline: no p99 in M1–M5 more than 5% worse, unless the comparison explains
  it; in M6, no write stall and no minute whose p99.9 write latency is more than three times the median
  of the run; the memory of the agent within the limits set by the `badger` options.
- drpc: B3 shows the gain on unary and streaming calls; a gRPC-only external plugin keeps working.

## Risks

| Risk | Mitigation |
| --- | --- |
| Compaction spikes or write stalls under bursts | the configuration above, the level 0 alert, the M6 soak test before acceptance |
| Badger memory use (memtables, caches, memory-mapped tables) on small clients | the client sizes in the table, bounded caches, measured RSS in M5/M6 |
| More disk space during compaction | the free space metric and warning of phase 2, M6 records the size over time |
| Losing raft entries on power loss | `SyncWrites`, one sync per batch, the crash tests |
| Plugin incompatibility | gRPC fallback, the test with a 1.6.5 plugin; CSI stays gRPC |
| The forks drift from upstream | Norca's changes are separate, marked commits; the forks are synchronized at least with every upstream release |

## Licenses

| Component | License | Note |
| --- | --- | --- |
| `bacanoo-io/raft` (fork of `hashicorp/raft`) | MPL 2.0 | every version including the current `main` (`LICENSE` and the SPDX header of every Go file); copyright IBM Corp. from 2025-11 |
| Badger v4 (`github.com/dgraph-io/badger/v4`) | Apache 2.0 | its dependencies (for example `ristretto`, `flatbuffers`, `klauspost/compress`) are listed in `THIRD_PARTY_NOTICES.md` when they are added |
| `bacanoo-io/drpc` (fork of `storj.io/drpc`) | MIT | – |

None of them is a HashiCorp product under BSL; the raft fork is MPL code. `THIRD_PARTY_NOTICES.md` is
regenerated with every dependency change, and `bbolt`, `boltdb/bolt` and `raft-boltdb` leave it with
phases 2 and 3.

## Decisions

- 2026-11-03: Norca moves to `hashicorp/go-metrics` in phase 1 (see [metrics library](#metrics-library)).
- 2026-11-03: the agent exposes only the Badger options that matter for tuning (the `badger` block).
- 2026-11-03: the drpc plugin protocol lives in the `bacanoo-io/drpc` fork.
- 2026-11-03: the benchmarks run on the lab VMs only.
- 2026-11-03: the soak (M6) runs five minutes.
