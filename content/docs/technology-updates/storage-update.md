---
title: "Storage update"
aliases:
  - /docs/technology-updates/storage-and-rpc-plan/
weight: 1
status: "Done"
---

**Status:** Done · 2026-11-03 (results in [Results](#results)) · Plan of 2026-11-02 · Starting point: Norca main (Nomad v1.6.5 base) with `hashicorp/raft`
v1.5.0, `raft-boltdb/v2` v2.2.2, `go.etcd.io/bbolt` v1.3.10 and `hashicorp/go-msgpack` v1.1.5

Norca updates three building blocks of its storage:

| # | Area | Today | After the change |
| --- | --- | --- | --- |
| 1 | Encoding | `hashicorp/go-msgpack` v1.1.5 | unchanged: the same MessagePack codec and wire format |
| 2 | Consensus library | `hashicorp/raft` v1.5.0 | the [`bacanoo-io/raft`](https://github.com/bacanoo-io/raft) fork, updated to the current upstream with Norca's changes |
| 3 | Embedded databases | BoltDB (`raft-boltdb/v2`, `bbolt`) | [Badger](https://github.com/dgraph-io/badger) v4, tuned against compaction spikes |

Before any of it, a general performance test records a **baseline**, so that the effect of the whole
change can be measured on the same test afterwards.

## Table of contents

- [Phase 0: baseline performance test](#phase-0-baseline-performance-test)
- [Starting point](#starting-point)
- [1. MessagePack stays](#1-messagepack-stays)
- [2. The raft fork](#2-the-raft-fork)
- [3. BoltDB to Badger](#3-boltdb-to-badger)
- [Phases](#phases)
- [Results](#results)
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
| B3 | Plugin connections: round trip of a unary call and of a streaming call (task stats every second) between the client and an external driver plugin | New benchmarks on the driver test harness; a control: the storage change must not affect it |
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
| Agent RPC | `net/rpc` with MessagePack (`net-rpc-msgpackrpc`) over `yamux` | server–server and client–server calls |
| `hashicorp/raft` v1.5.0 | `norca/server.go` | consensus; transport `raft.NewNetworkTransport` (`norca/server.go:1490`) |
| `raft-boltdb/v2` v2.2.2 | `norca/server.go:1535` (`raft.db`, with a log cache), `helper/raftutil` (`norca operator raft info/logs/state`) | raft log store and stable store; agent option `raft_boltdb { no_freelist_sync }` |
| `go.etcd.io/bbolt` v1.3.10 | `helper/boltdd`, `client/state` (`state.db`) | the client's persistent state: allocations, task runner state, dynamic plugin registry, node meta |

The raft log is written by every server for every change of the cluster state, so the storage change
affects the write latency of the whole cluster.

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
- Client state (`<data_dir>/client/state/`): the buckets of `state.db` became key paths whose parts
  are separated by a zero byte: `a/<alloc>/alloc`, `a/<alloc>/deploy_status`,
  `a/<alloc>/t/<task>/local_state`, `c/<alloc>_<check>`, `node/meta` and so on. Deleting an
  allocation or a task deletes its prefix in one transaction. The write deduplication of `boltdd`
  (skip a write when the value hash is unchanged) is kept in the new layer; concurrent writes share
  one sync in Badger, so the batch mode of BoltDB needs no counterpart.
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
Both blocks share one implementation (`helper/badgerdb`); the metrics are `nomad.badger.raft.*` and
`nomad.badger.client.*`.

### Moving existing data

Norca has no released versions, so there is no in-place migration of `raft.db` and `state.db`: a server
or client starts with an empty Badger store and catches up (a server from the leader's snapshot, a
client from the servers). The lab clusters are redeployed. A `norca operator raft` command that finds an
old `raft.db` says so instead of failing silently, and a client that finds an old `state.db` in its
state directory does not start until it is removed.

## Phases

| Phase | Content | Depends on |
| --- | --- | --- |
| 0 | Benchmark suite (B1–B4, M1–M6) and collector in `norca-lab`; the baseline on the current main | – |
| 1 | Norca moves to `hashicorp/go-metrics`; raft fork synchronized with upstream with MessagePack v1.1.5 kept, tagged; Norca switches with `replace`; B1, M2, M3 against the baseline | 0 |
| 2 | Badger raft store (`raft/badger`), `helper/raftutil`, the `badger` server options, metrics and alerts; `raft-boltdb` removed; B1, M1–M4, M6 | 1 |
| 3 | Badger client state, the `badger` client options; `bbolt` removed; B2, M5, M6 | 2 |
| 4 | Final run of the whole suite, the comparison table on this page, the documentation (agent configuration, operations, licence) | 1–3 |

Phases 1–3 build on each other; phase 4 closes the update.

## Results

Measured on the lab (three servers that are clients too, 2 vCPU and 2 GB each, see
[phase 0](#phase-0-baseline-performance-test)), with the same workload in every run. The baseline ran
the soak (M6) for two hours, the later runs for five minutes; for the soak, the table compares the
first five minutes of the baseline. The raw results are in `norca-lab/bench/results/`.

| Run | Norca | Content |
| --- | --- | --- |
| Baseline | `74d33c1d2` | `hashicorp/raft` v1.5.0, `raft-boltdb`, BoltDB client state |
| Phase 1 | `1b29fe48d` | the raft fork, `hashicorp/go-metrics` (soak skipped) |
| Phase 2 | `dd2661b5a` | the raft log on Badger |
| Phase 3 | `d7ebb576f` | the client state on Badger |
| Final | `ad0579914` | phase 3 with the regenerated notices (the same code, run again) |

### Cluster tests

| Test (p50 unless noted) | Baseline | Phase 1 | Phase 2 | Phase 3 | Final |
| --- | --- | --- | --- | --- | --- |
| M1 300 batch jobs at once: task start | 9.32 s | 9.42 s | 9.49 s | 6.14 s | 6.47 s |
| M1 same: placement | 7.98 s | 8.30 s | 8.11 s | 5.12 s | 5.40 s |
| M1 same: task start p99 | 17.2 s | 17.0 s | 17.2 s | 13.0 s | 13.2 s |
| M1 200 batch jobs at 10/s: task start | 331 ms | 320 ms | 326 ms | 279 ms | 284 ms |
| M1 same: task start p99 | 720 ms | 842 ms | 892 ms | 508 ms | 548 ms |
| M1 12 service jobs: task start | 698 ms | 666 ms | 640 ms | 520 ms | 539 ms |
| M3 leader failover: longest write gap | 6.05 s | – | 2.05 s | 4.05 s | 2.05 s |
| M4 snapshot save | 77 ms | 62 ms | 65 ms | 76 ms | 69 ms |
| M4 server restart until ready | 10.8 s | 10.4 s | 8.0 s | 8.0 s | 10.6 s |
| M5 task start raw_exec | 210 ms | 205 ms | 196 ms | 188 ms | 162 ms |
| M5 task start exec2 | 150 ms | 156 ms | 139 ms | 138 ms | 106 ms |
| M5 task start exec | 2.12 s | 2.14 s | 2.13 s | 2.12 s | 2.11 s |
| M5 task start docker | 329 ms | 341 ms | 353 ms | 334 ms | 348 ms |
| M5 agent restart: allocations reattached after | 11.7 s | 11.0 s | 9.0 s | 8.8 s | 11.6 s |
| M6 soak, raft write p50 | 9.4–18.5 ms | – | 4.1 ms | 3.7 ms | 4.1 ms |
| M6 soak, raft write p99.9 | 22–41 ms | – | 16.5 ms | 23.1 ms | 17.4 ms |

The failover gap, the server restart and the reattach move in steps of about two seconds between runs
of the same code (phase 3 and final), so single differences there are within the noise of the lab.

### Micro benchmarks (final run, one lab VM)

| Benchmark | BoltDB | Badger |
| --- | --- | --- |
| B1 `StoreLog` (one entry, one sync) | 2.37 ms | 1.29 ms |
| B1 `StoreLogs` | 2.47 ms | 1.36 ms |
| B1 `GetLog` | 3.2 µs | 1.3 µs |
| B1 append, batches of 64 × 1 KB | 4.3 ms | 6.6 ms |
| B1 append, batches of 64 × 16 KB | 13.4 ms | 14.5 ms |
| B1 append, batches of 512 × 16 KB | 41.8 ms | 472 ms |
| B1 `DeleteRange` | 2.29 ms | 2.47 ms |
| B2 `PutAllocation` | 8.63 ms | 6.08 ms |
| B2 `PutTaskRunnerLocalState` | 6.74 ms | 3.14 ms |
| B2 `GetAllAllocations`, 1000 allocations | 38.3 ms | 31.0 ms |
| B4 MessagePack encode/decode (control) | 37.2 µs | 36.8 µs |

B2's BoltDB column is from the baseline run, B1 runs both stores in the same run.

### Resources per VM

| | Baseline (2 h soak) | Final (5 min soak) |
| --- | --- | --- |
| Agent RSS, maximum | 426–518 MB | 481–792 MB |
| Data directory at the end | 147–149 MB | 820–825 MB |
| Agent disk writes per minute | 200–220 MB | 11–19 MB |

The agent writes per minute cover the whole run, which in the baseline is mostly the soak; the order
of magnitude is the point: BoltDB rewrote pages and its freelist with every raft commit.

### Against the acceptance criteria

- **p99 in M1–M5 not more than 5% worse:** met for M1 (all better), M3 and M4. In M5 the p99 of
  raw_exec and exec2 starts is higher (316 ms against 249 ms, 229 ms against 204 ms), but with ten starts
  per driver the p99 is the single slowest start, while the p50 of both improved by about 25%; no
  storage path is slower there.
- **M6:** no write stall; the worst minute's p99.9 (18.8 ms) is far below three times the median of the
  run.
- **Memory:** higher. A server's Badger may hold up to three 64 MB memtables plus a 128 MB block cache
  and a 64 MB index cache, which is a large share of a 2 GB VM; smaller servers should lower
  `mem_table_size_mb` and the caches in the `badger` block.

### Follow-up: profiles and the value threshold

The open points of the final run were taken up the same day:

- **Large raft batches.** On the 2 GB VMs the slow batches of large entries were a memory problem:
  with the default server values, Badger filled the memory of the machine and the benchmark was
  killed. The raft log now keeps values above 4 KB in the value log (`value_threshold_kb`); B1, batches
  of 512 × 16 KB entries: 153 ms → 37.7 ms with the `small` profile, 175 ms → 34.8 ms with `default`
  (BoltDB 44.7 ms), at half the memory per batch. A single 16 KB entry costs more (6.2 → 8.5 ms);
  entries of 1 KB are unchanged. The client state keeps values up to 1 MB in the tree.
- **Memory and disk footprint.** The `badger` blocks got a `profile` switch (`small`, `default`,
  `large`) and the keys `value_threshold_kb`, `value_log_file_size_mb`, `compression` and
  `num_memtables`; see the [server configuration](/docs/configuration/server/#badger-profiles).
  The lab now runs `small`.

A full run with the `small` profile (`norca-lab/bench/results/20261103-1154-small-vt4k-b089d81e0`),
against the final run with `default`:

| | Final (`default`) | `small`, 4 KB threshold |
| --- | --- | --- |
| Data directory at the end | 820–825 MB | 245–249 MB |
| Agent RSS, maximum | 481–792 MB | 433–521 MB |
| M6 soak, raft write p50 / p99.9 | 4.1 / 17.4 ms | 4.6 / 25.9 ms |
| M1 300 batch jobs: task start p50 | 6.47 s | 6.65 s |
| M1 200 batch jobs at 10/s: task start p99 | 548 ms | 462 ms |

The `small` profile brings the memory back to the level of BoltDB and the data directory to a third,
at a slightly higher tail latency of the raft writes (the smaller memtables flush more often), still
well below the baseline (p50 9.4–18.5 ms, p99.9 22–41 ms).

### Optional BoltDB stores

Badger stays the default, but both stores can be switched back to BoltDB, for machines where memory
matters more than write speed, as a fallback, and for comparisons:

| Setting | Values | Data |
| --- | --- | --- |
| `server { raft_store }` | `badger` (default), `boltdb` | `server/raft/badger/` or `server/raft/raft.db`; `raft_boltdb { no_freelist_sync }` tunes BoltDB |
| `client { state_store }` | `badger` (default), `boltdb` | `client/state/` or `client/state.db` |

- The BoltDB code is the one before phases 2 and 3 (`raft-boltdb/v2`, the client's `BoltStateDB` and
  `helper/boltdd`), without the upgrades from Nomad 0.8, 0.9 and 1.3 state.
- No conversion between the stores: an agent whose directory holds only the other store does not
  start, and says what to change or remove. A server switches by rejoining the cluster from the
  leader's snapshot, a client by being drained; servers of one cluster may use different stores.
- A `badger` block next to `boltdb`, or a `raft_boltdb` block next to `badger`, is logged as having no
  effect.
- `norca operator raft info/logs/state` and `norca operator client-state` read both formats.
- `bbolt` and `raft-boltdb` are shipped again and listed in `THIRD_PARTY_NOTICES.md`.
- Tested with the store tests on both stores, a server with the BoltDB raft log, and the
  configuration; no lab measurement (the BoltDB numbers are those of the baseline).

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

## Risks

| Risk | Mitigation |
| --- | --- |
| Compaction spikes or write stalls under bursts | the configuration above, the level 0 alert, the M6 soak test before acceptance |
| Badger memory use (memtables, caches, memory-mapped tables) on small clients | the client sizes in the table, bounded caches, measured RSS in M5/M6 |
| More disk space during compaction | the free space metric and warning of phase 2, M6 records the size over time |
| Losing raft entries on power loss | `SyncWrites`, one sync per batch, the crash tests |
| The forks drift from upstream | Norca's changes are separate, marked commits; the forks are synchronized at least with every upstream release |

## Licenses

| Component | License | Note |
| --- | --- | --- |
| `bacanoo-io/raft` (fork of `hashicorp/raft`) | MPL 2.0 | every version including the current `main` (`LICENSE` and the SPDX header of every Go file); copyright IBM Corp. from 2025-11 |
| Badger v4 (`github.com/dgraph-io/badger/v4`) | Apache 2.0 | its dependencies (for example `ristretto`, `flatbuffers`, `klauspost/compress`) are listed in `THIRD_PARTY_NOTICES.md` when they are added |

None of them is a HashiCorp product under BSL; the raft fork is MPL code. `THIRD_PARTY_NOTICES.md` is
regenerated with every dependency change; it lists `raft-boltdb` (MPL 2.0) and `bbolt` (MIT) for the
[optional BoltDB stores](#optional-boltdb-stores).

## Decisions

- 2026-11-03: Norca moves to `hashicorp/go-metrics` in phase 1 (see [metrics library](#metrics-library)).
- 2026-11-03: the agent exposes only the Badger options that matter for tuning (the `badger` block).
- 2026-11-03: the benchmarks run on the lab VMs only.
- 2026-11-03: the soak (M6) runs five minutes.
- 2026-11-03: BoltDB stays available as an option (`raft_store`, `state_store`), Badger is the default;
  no conversion command.
