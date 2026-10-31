---
title: "Concurrency, resource cleanup and nil dereferences"
linkTitle: "Concurrency and nil"
description: "The findings of the review of locking, file descriptor and goroutine leaks, and nil dereferences, with their verdicts, fixes, tests and commits."
weight: 2
---

The review covered the Docker driver and its logger, the system bus, the
Consul KV export and import on the bus, and the loading of backups. It looked
for nil dereferences (NIL), file descriptor leaks (FD), channel and goroutine
leaks (CHAN) and lock problems (LOCK), and reported 16 findings. Paths are
relative to the `nomad` directory of the norca repository. See the
[section page](/docs/white-room) for the process.

| ID | Finding | Verdict | Commit |
| --- | --- | --- | --- |
| NIL-01 | `StartTask` dereferences `cfg.Resources.LinuxResources` | Invalid | — |
| NIL-02 | The cpuset reconciler dereferences `LinuxResources` of every task | Partially valid | `e70a54140` |
| NIL-03 | `ExecTaskStreaming` closes nil output streams | Invalid | — |
| NIL-04 | `shutdownLogger` kills a nil plugin client | Invalid | — |
| NIL-05 | The bus uses a nil NATS server | Invalid | — |
| FD-01 | The image archive stays open when `LoadImage` fails | Valid | `e70a54140` |
| FD-02 | The stdout FIFO stays open when stderr fails to open | Valid | `e70a54140` |
| FD-03 | Double close and unclosed streams in the docker logger | Invalid | — |
| FD-04 | Stdin of a streaming exec is never closed | Valid | `e70a54140` |
| CHAN-01 | The `WaitTask` goroutine blocks forever on an unbuffered channel | Valid | `e70a54140` |
| CHAN-02 | The fingerprint goroutine blocks on send and cannot stop | Valid | `e70a54140` |
| CHAN-03 | The stats collector timer leaks and stops firing | Invalid | — |
| CHAN-04 | The KV lister is not stopped on an early return | Partially valid | `6dc041f60` |
| LOCK-01 | `InspectImage` runs under the global image lock | Won't fix (by design) | — |
| LOCK-02 | A finished pull deletes a newer pull's future | Valid | `e70a54140` |
| LOCK-03 | Backup loads hold the cache lock | Partially valid | `73cabfdc5` |

## Nil dereferences

### NIL-01 `StartTask` and `cfg.Resources.LinuxResources`

**Report.** On cgroups v1, `StartTask` reads
`cfg.Resources.LinuxResources.CpusetCgroupPath` without checking that
`Resources` and `LinuxResources` are set, so a task without Linux resources
panics the agent.

**Verdict: invalid.** The task runner always builds the task configuration
with `Resources.LinuxResources` set, and the cgroups v1 branch runs on Linux
only. Earlier in the same `StartTask`, `createContainerConfig` already reads
`task.Resources.LinuxResources` unconditionally (CPU shares, CPU period and
quota), so the field cannot be nil at this point. Nothing was changed.

### NIL-02 The cpuset reconciler and `LinuxResources`

**Report.** `trackedTasks`, called periodically by the cpuset fixer goroutine,
reads `h.task.Resources.LinuxResources.CpusetCgroupPath` of every tracked
task, and panics if one of them has none.

**Verdict: partially valid.** For a task started by this agent the field is
always set (see NIL-01). A task restored after a client restart is different:
its configuration comes from the stored task handle (`RecoverTask`), where
`LinuxResources` is not guaranteed, because the protocol decoding sets it only
when it was present. There the panic is possible, in a background goroutine.

**Fix.** `trackedTasks` skips tasks without `Resources` or `LinuxResources`;
they have no cpuset cgroup to reconcile. File:
`drivers/docker/reconcile_cpuset.go`. Commit `e70a54140`.

**Test.** None dedicated: the case needs a task restored from a handle without
Linux resources.

### NIL-03 `ExecTaskStreaming` and nil output streams

**Report.** `ExecTaskStreaming` defers `opts.Stdout.Close()` and
`opts.Stderr.Close()` without checking for nil, so a caller without output
streams panics it.

**Verdict: invalid.** The method is only called with options built by
`drivers.StreamToExecOptions`, by the plugin server and by the task runner's
driver handle, and that function always sets stdin, stdout and stderr. The
plugin server itself closes `Stdout` and `Stderr` after the call without a
nil check. Nothing was changed.

### NIL-04 `shutdownLogger` and a nil plugin client

**Report.** `shutdownLogger` checks `h.dlogger` for nil but then calls
`h.dloggerPluginClient.Kill()`, which may be nil.

**Verdict: invalid.** The logger and its plugin client are set together: both
come from the same call (`setupNewDockerLogger` or `reattachToDockerLogger`)
and both are nil when log collection is disabled. A non-nil logger always has
a non-nil plugin client. Nothing was changed.

### NIL-05 The bus and a nil NATS server

**Report.** The bus calls `s.server().Connz(...)`, `DisconnectClientByID` and
`Shutdown` without checking that the embedded NATS server is not nil, which
panics before the bus started or after it stopped.

**Verdict: invalid.** The NATS server (`ns`) is set by `bus.New`, which
returns an error instead of a server when it cannot start one, and it is never
set back to nil: `Shutdown` stops it but keeps the field, and a failed restart
as a cluster keeps the previous server. `ns` is never nil after `New`. Nothing
was changed.

## File descriptor leaks

### FD-01 Image archive left open on a failed load

**Report.** `loadImage` opens the image archive and closes it only after a
successful `LoadImage`; when the load fails, the descriptor stays open.

**Verdict: valid.**

**Fix.** The archive is closed with `defer f.Close()` right after it is
opened. File: `drivers/docker/driver.go`. Commit `e70a54140`.

**Test.** None dedicated: the failing load needs a Docker daemon.

### FD-02 Stdout FIFO left open when stderr fails

**Report.** `openStreams` of the docker logger opens the stdout FIFO, then the
stderr FIFO; when the second open fails, it returns without closing the first.

**Verdict: valid.**

**Fix.** The stdout FIFO is closed before the error is returned. File:
`drivers/docker/docklog/docker_logger.go`. Commit `e70a54140`.

**Test.** None dedicated.

### FD-03 Double close and unclosed streams in the docker logger

**Report.** `Stop` closes the streams without clearing the fields, so a second
`Stop` closes them again; and when the container stops by itself, the
streaming goroutine returns without closing the streams.

**Verdict: invalid.** Closing an `os.File` twice returns an error and does
nothing else; it does not close another descriptor. The streams are closed by
`Stop`, which the driver always calls when the task ends (`shutdownLogger`,
deferred in the task handle's `run`), and the logger runs in its own plugin
process, which the driver kills right after, so its descriptors are released
with the process. Nothing was changed.

### FD-04 Stdin of a streaming exec

**Report.** `ExecTaskStreaming` closes `opts.Stdout` and `opts.Stderr` but not
`opts.Stdin`.

**Verdict: valid.** `opts.Stdin` is the read end of a pipe fed by the stream
goroutine of `StreamToExecOptions`; left open, that goroutine can block on a
write after the exec has ended.

**Fix.** `ExecTaskStreaming` also defers `opts.Stdin.Close()`. File:
`drivers/docker/driver.go`. Commit `e70a54140`.

**Test.** None dedicated: the exec needs a running container.

## Channel and goroutine leaks

### CHAN-01 `WaitTask` goroutine on an unbuffered channel

**Report.** `WaitTask` returns an unbuffered channel fed by `handleWait`. When
the caller stops reading (its context ended), the send blocks forever, the
deferred `close` never runs and the goroutine leaks.

**Verdict: valid.**

**Fix.** The channel has a buffer of one, which holds the single result, so
`handleWait` always completes and closes it. File: `drivers/docker/driver.go`.
Commit `e70a54140`.

**Test.** `TestDriver_WaitTask_NoReader` in `drivers/docker/whiteroom_test.go`:
the context is cancelled, nobody reads, and the result is still buffered and
the channel closed.

### CHAN-02 Fingerprint goroutine blocked on send

**Report.** `handleFingerprint` sends every fingerprint with a plain
`ch <- d.buildFingerprint()`. When the receiver is gone, the send blocks, and
the goroutine no longer sees the cancellation of its context.

**Verdict: valid.**

**Fix.** The send is a `select` that also returns when the caller's context or
the driver's context ends. File: `drivers/docker/fingerprint.go`. Commit
`e70a54140`.

**Test.** None dedicated.

### CHAN-03 Stats collector timer

**Report.** `dockerStatsCollector` does not stop its timer when it returns;
and when the timer fires before the first stats from Docker arrived, the loop
continues without resetting it, so it never fires again.

**Verdict: invalid.** When the first stats arrive, the collector resets the
timer to fire at once (`timer.Reset(0)`), so an early firing is recovered and
the interval resumes. An unstopped timer that is no longer referenced is
collected by the Go runtime (since Go 1.23; Norca builds with Go 1.27), so it
does not leak. Nothing was changed in the collector.

**Test.** `TestDriver_DockerStatsCollector_EarlyTimer` in
`drivers/docker/whiteroom_test.go` (commit `e70a54140`) proves the recovery:
the timer fires before any stats, and stats are still emitted once Docker
sends them.

### CHAN-04 KV lister not stopped on an early return

**Report.** The Consul KV export and import of the bus (`nomad/bus_kv.go`)
iterate over `lister.Keys()`; an early `return` on an error leaves the
JetStream lister and its subscription running.

**Verdict: partially valid.** The lister runs on a NATS connection that the
function releases (`done`) when it returns, and closing that connection
already ended the lister's subscription, so it did not stay open. The lister
was still not stopped explicitly, and ended only after the return.

**Fix.** Both functions stop the lister with a deferred `lister.Stop()`. File:
`nomad/bus_kv.go`. Commit `6dc041f60`, which added the Consul KV migration and
the carry-over to a clustered bus in the same code.

**Test.** None dedicated to the early return; the export and import paths are
exercised by `TestBusKV_Backup`, `TestBusKV_Migrate` and `TestBusKV_CarryOver`
in `nomad/bus_kv_test.go`.

## Locks

### LOCK-01 `InspectImage` under the global image lock

**Report.** When the network sandbox of an allocation is prepared, the driver
calls `InspectImage` on the Docker daemon while holding the coordinator's
global `imageLock`, so a slow daemon blocks every other image operation of the
node.

**Verdict: won't fix (by design).** The lock is held on purpose: the code
documents a time-of-check to time-of-use race between finding the pause image
and taking a reference on it, during which a concurrent task shutdown could
remove the image. Holding the lock across the inspect and the reference
increment narrows that race. The lock is released before any pull, which is
the slow operation. Nothing was changed.

### LOCK-02 A finished pull deletes a newer future

**Report.** `PullImage` releases the lock while it waits for the pull, then
deletes the image's entry from `pullFutures` unconditionally. If a newer pull
of the same image registered its future in the meantime, that future is
deleted: later callers start duplicate pulls, and pull loggers are cleared.

**Verdict: valid.**

**Fix.** A caller deletes the entry, and clears the pull loggers, only when the
entry is still its own future. The loggers were cleared by the pull goroutine
before; they are now cleared together with the future. File:
`drivers/docker/coordinator.go`. Commit `e70a54140`.

**Test.** `TestDockerCoordinator_PullImage_KeepsNewerFuture` in
`drivers/docker/whiteroom_test.go`: a caller joins a pull, the pull finishes
and a new future is registered before the caller wakes; the new future is kept.

### LOCK-03 Backup loads under the cache lock

**Report.** `backup.Manager.Load` holds `m.cache.mu` while it downloads the
backup, restores the state store and verifies its checksum, so every other
backup load and cache lookup of the region waits.

**Verdict: partially valid.** Serializing the loads is intentional: a loaded
backup is a whole state store held in memory, one load at a time bounds that
and the download work, and a request for a backup that is being loaded waits
for that load instead of starting its own. But the same lock also guarded the
cache, so a request for the backup that was already cached waited for the
load of another backup.

**Fix.** The cache has its own lock, and the loads are serialized under a
separate load lock. A request looks up the cache first; on a miss it takes the
load lock and looks again, since the load it waited for may have cached the
same backup. File: `nomad/backup/load.go`. Commit `73cabfdc5`.

**Test.** `TestManager_LoadCacheHitDoesNotWait` in
`nomad/backup/directory_test.go`: a cached backup is served while another
backup is being loaded.
