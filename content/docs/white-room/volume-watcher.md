---
title: "Volume watcher"
linkTitle: "Volume watcher"
description: "The findings of the review of the CSI volume watcher of the leader: locking, leadership changes, retries and watch list keys, with their verdicts, fixes, tests and commits."
weight: 6
---

The review, part of the second round, covered the CSI volume watcher
(`nomad/volumewatcher` in the norca repository), which runs on the leader and
releases the claims of terminated allocations on CSI volumes. It reported 7
findings. The fixes are in commit `82b586a80` of the norca repository; the
tests named below are in `nomad/volumewatcher/volumes_watcher_test.go`. Paths
are relative to the `nomad` directory of the norca repository. See the
[section page](/docs/white-room) for the process.

| ID | Finding | Verdict | Commit |
| --- | --- | --- | --- |
| VOLWATCH-DEADLOCK-01 | `Notify` blocks with the watcher lock held | Valid | `82b586a80` |
| VOLWATCH-RACE-01 | A late goroutine of the previous leadership term removes the new watcher | Partially valid | `82b586a80` |
| VOLWATCH-SPIN-01 | `watchVolumes` retries without a pause when the query fails | Partially valid (latent) | `82b586a80`, `bc65e20b7` |
| VOLWATCH-RACE-02 | `getVolume` writes the volume under a read lock | Invalid | — |
| VOLWATCH-KEY-01 | The watch list key `ID + Namespace` collides | Valid | `82b586a80` |
| VOLWATCH-RETRY-01 | A failed unpublish is never retried | Invalid | — |
| VOLWATCH-DEAD-01 | Unused fields and functions | Partially valid | `82b586a80` |
| extra | Data race on the state store of the watcher | Valid (not in the report) | `82b586a80` |

## Locking and leadership

### VOLWATCH-DEADLOCK-01 `Notify` under the watcher lock

**Report.** `addLocked` calls `Notify` of a volume watcher while holding the
lock of the watcher (`Watcher.wlock`), and `Notify` sends on the one-slot
update channel of the volume watcher with a blocking send. While the volume's
goroutine is in a slow unpublish RPC and an update is already queued, the
send blocks with the lock held: no volume can be added or removed and the
leader cannot step down. When the goroutine is instead exiting, its deferred
removal waits for the same lock, a deadlock.

**Verdict: valid.** The only escape of the send was the context of the
watcher, which `SetEnabled` cancels, and `SetEnabled` needs the lock. The
stall is deterministic: while the goroutine is in a slow unpublish RPC with
an update queued, the next update blocks holding the lock, stopping every
other volume and the leader step-down until the RPC returns. The deadlock
needs a narrow window: the goroutine leaves its loop with an update queued
while `Notify`, still seeing the watcher as running, blocks holding the lock,
and the deferred removal waits for it.

**Fix.** It goes beyond the proposed non-blocking send, which alone would lose
updates or start a second goroutine for the same volume. `Notify` does not
block: the update channel only wakes the goroutine, which reads the volume
again from the state store, so an update already queued covers the new one.
Before it exits, the goroutine removes itself from the watch list under the
lock, and does not exit when an update is queued for it. A watcher in the
watch list therefore always has a live goroutine, and the running flag,
`Start`, `Stop`, `isRunning`, the restart in `Notify` and the lock of the
volume watcher were removed. Files: `nomad/volumewatcher/volume_watcher.go`,
`nomad/volumewatcher/volumes_watcher.go`.

**Test.** `TestVolumeWatch_NotifyDuringSlowRPC` (updates for a volume whose
watcher is in a slow unpublish RPC block neither the volumes watcher nor the
leader step-down) and `TestVolumeWatch_Remove` (a volume watcher leaves the
watch list only when no update is queued for it).

**Commit.** `82b586a80`.

### VOLWATCH-RACE-01 Late goroutine of the previous leadership term

**Report.** When the server loses and then regains leadership, a goroutine of
the earlier term that was still in an unpublish RPC returns and its deferred
removal deletes the volume from the new term's watch list. The volume is then
not watched, and its claims are stuck forever.

**Verdict: partially valid.** The removal is real: the goroutine of the
earlier term deleted the new term's entry for the same volume, and the
sequence can happen through a leadership reassertion as well. The impact is
overstated: the claims are not stuck forever, as the next update of the
volume starts a new watcher. The real effects are two reapers running for the
same volume at the same time and a goroutine the watch list no longer tracks.

**Fix.** The shutdown path of a volume watcher no longer touches the watch
list (the list was already flushed when the context was cancelled), and the
removal deletes the entry only when it is the same watcher. File:
`nomad/volumewatcher/volumes_watcher.go`.

**Test.** `TestVolumeWatch_StaleWatcherAfterLeadershipChange`: a watcher of
the previous term that finishes late does not remove the current term's
watcher for the same volume. `TestVolumeWatch_Remove` checks that a watcher
never removes another watcher stored under its key.

**Commit.** `82b586a80`.

## Other findings

### VOLWATCH-SPIN-01 No pause after a failed volumes query

**Report.** When `getVolumes` fails, `watchVolumes` retries at once with the
index 0, which makes the next query non-blocking, so a persistent error
spins a CPU core and floods the log.

**Verdict: partially valid, latent.** The loop did retry at once and reset
the index to 0. But in this tree the blocking query returns only a
cancellation, which the loop handles, or a schema error, so the spin cannot
be triggered today.

**Fix.** After a failed query the loop waits one second (and returns at once
when its context ends), and keeps the last-seen index. File:
`nomad/volumewatcher/volumes_watcher.go`.

**Test.** `TestVolumeWatch_QueryErrorBackoff`: the volumes query and the
retry interval are fields of the watcher, so the test replaces the query with
a failing one and checks that each retry waits the interval, keeps the
last-seen index, and that the loop stops when its context is cancelled during
the wait. It fails on the old loop, which retried at once with index 0. The
state store itself returns no such error, so the test needs the replaceable
query.

**Commit.** `82b586a80` (fix), `bc65e20b7` (test).

### VOLWATCH-RACE-02 Write under a read lock in `getVolume`

**Report.** `getVolume` takes the read lock of the volume watcher, then
writes `vw.v`, a data race.

**Verdict: invalid.** `getVolume` is called only by the single goroutine of
the volume watcher, and `vw.v` is read nowhere else, so there is no
concurrent access. The misleading lock was removed with the fix of
VOLWATCH-DEADLOCK-01. Nothing else was changed.

### VOLWATCH-KEY-01 Colliding watch list keys

**Report.** The watch list is keyed by `v.ID + v.Namespace` without a
separator, so volume `vol` in namespace `default` and volume `voldef` in
namespace `ault` share one key and one watcher.

**Verdict: valid.** Volume IDs are free-form and namespace names may contain
letters, digits and dashes, so the two keys collide, and the second volume
was never watched.

**Fix.** The watch list is keyed by `structs.NamespacedID` instead of a
string. Files: `nomad/volumewatcher/volumes_watcher.go`,
`nomad/volumewatcher/volume_watcher.go`.

**Test.** `TestVolumeWatch_NamespacedKeys`: volumes whose ID and namespace
concatenate to the same string get their own watchers.

**Commit.** `82b586a80`.

### VOLWATCH-RETRY-01 No retry of a failed unpublish

**Report.** When the unpublish RPC fails, `volumeReap` only logs it; the
watcher stops after its quiescent timeout and nobody retries until the
volume changes for another reason.

**Verdict: invalid.** The retry exists. The leader's volume claim garbage
collection (every 5 minutes by default) writes a claim for the volumes with
past claims, which updates the CSI volumes table, notifies every watcher and
retries the unpublish; any other write to the table does the same. Nothing
was changed.

### VOLWATCH-DEAD-01 Unused code

**Report.** The `ctx` and `exitFn` fields of the volume watcher are never
set, so `Stop` cannot cancel the watcher; `isUnclaimed` and
`collectPastClaims` are never called.

**Verdict: partially valid.** The fields are never set and the two functions
are unused: the state store's volume denormalization collects the past
claims. The claimed effect is wrong: a volume watcher is cancelled through
the context of the watcher, which the flush on a leadership change cancels.

**Fix.** The unused fields and functions were removed. Files:
`nomad/volumewatcher/volume_watcher.go`,
`nomad/volumewatcher/volume_watcher_test.go`.

**Test.** None: the change removes code only.

**Commit.** `82b586a80`.

## Found during the checking

### Data race on the state store of the watcher

This was not in the report. `watchVolumes` read the state store field of the
watcher without the lock, while `SetEnabled(true)` wrote it and the loop of
an earlier leadership term could still be running. The race detector
reported it.

**Fix.** `watchVolumes` gets its state store as a parameter. File:
`nomad/volumewatcher/volumes_watcher.go`.

**Test.** `TestVolumeWatch_RapidLeadershipChanges`, which toggles leadership
while volumes change and is meant to be run with the race detector.

**Commit.** `82b586a80`.
