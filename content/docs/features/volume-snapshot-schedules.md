---
title: "Volume snapshot schedules"
linkTitle: "Snapshot schedules"
description: "CSI snapshots of a volume taken on a cron schedule by the servers, the old ones deleted by a retention rule."
weight: 50
---

## What and why

**A `VolumeSnapshotSchedule` object takes a snapshot of a CSI volume at the
times of a cron schedule and deletes the old ones.** You write the object
once; the leader asks the volume's controller plugin for each snapshot and
keeps the list of what it took in the status of the object.

- **Built in.** The operator runs in the servers, on the leader. Nothing has
  to be installed, and it upgrades with the servers.
- **One snapshot per scheduled time.** The name of a snapshot comes from the
  schedule and the time it was scheduled for, and CSI makes a snapshot of a
  name once: a new leader that takes over, or a retry after a failure, never
  makes a second one.
- **Only its own snapshots are deleted.** Norca keeps no record of snapshots
  in its state; the schedule deletes only the snapshots listed in its status.
- **By right.** Writing a schedule takes the same rights as taking a
  snapshot by hand.

The kind `norca.io/VolumeSnapshotSchedule` is namespaced and registered by
the servers. It is a [custom object](/docs/features/operator-framework):
written with [`norca object apply`](/docs/commands/object/apply), read with
`norca object get`, listed in the web UI.

> [!NOTE]
> Snapshots are **crash-consistent**: the volume as it is at the moment of
> the snapshot, as after a power cut. Norca does not pause or flush the
> application first. A database that needs a consistent backup should make
> its own (for example a dump to the volume before the scheduled time).

## Requirements

- A CSI volume registered or created in the namespace of the schedule.
- A controller plugin of the volume that can create and delete snapshots
  (the controller capability `CREATE_DELETE_SNAPSHOT`). Without it the
  schedule has the condition `Unsupported` and takes nothing.

## A schedule

```hcl
kind      = "norca.io/VolumeSnapshotSchedule"
name      = "db-nightly"
namespace = "prod"

spec {
  volume    = "db-data"
  schedule  = "0 3 * * *"
  time_zone = "Europe/Berlin"

  keep {
    last    = 7
    max_age = "720h"
  }
}
```

```shell-session
$ norca object apply db-nightly.hcl
```

| Field | Default | Meaning |
| --- | --- | --- |
| `volume` | required | The ID of the CSI volume in the namespace of the object. Can't be changed: delete the schedule and create a new one. |
| `schedule` | required | A cron expression, as for [periodic jobs](/docs/job-specification/periodic): five fields, or six or seven with seconds and years. It must have a time in the future when the schedule is written; a schedule that ends (a year field) takes its last time and goes on with the retention. |
| `time_zone` | `UTC` | The time zone of the schedule (an IANA name). |
| `keep.last` | | Keep the newest so many snapshots (1 to 500). |
| `keep.max_age` | | Keep the snapshots younger than this, a Go duration such as `"720h"`. At the rate of `schedule` it may keep at most 500 snapshots: a longer one is refused. |
| `name_prefix` | `<namespace>-<name>` | The start of the snapshot names, at most 64 bytes of it. A snapshot is named `<prefix>-<8 hex digits>-<YYYYMMDD-hhmmss>`: the first digits of the ID of the schedule object, and its scheduled time in UTC. Two schedules never ask for the same name, also with the same prefix. |
| `parameters` | | Passed to the plugin with every snapshot, as `-parameter` of [`volume snapshot create`](/docs/commands/volume/snapshot-create). |
| `secret_path` | | A secret of the namespace whose items are passed to the plugin as CSI secrets. Read at every call; the object never holds it. |
| `delete_snapshots` | `false` | Delete the snapshots of the schedule when the schedule is deleted. |
| `suspend` | `false` | Take no new snapshots. The retention still deletes old ones. |

`keep` needs `last`, `max_age` or both.

### When a snapshot is taken

- At each time of the schedule. The first time is the first one after the
  object was written.
- **A missed time is taken once.** If there was no leader at a scheduled
  time, or the plugin could not be reached, the next leader takes the
  latest time that has come, once, not every time it missed.
- **A snapshot is written down before it is asked for.** The schedule adds
  the snapshot to `status.snapshots` (its name and scheduled time, no `id`
  yet) and only then calls the plugin. If the answer is lost (a timeout, a
  leader change), the snapshot is asked for again under the same name, and
  no other one is begun until it has its `id`: it stands for the times that
  come meanwhile.
- **A failure is tried again**, after one minute, doubling up to an hour,
  unless the next scheduled time comes first. The condition `Failed` says
  why; the event `SnapshotFailed` records each attempt.
- A snapshot the plugin has not finished (`ready` false) is asked for again
  every 30 seconds until it is. If asking fails, the condition `Failed` says
  so; if the plugin answers with another ID, the new one is stored (event
  `SnapshotReplaced`).
- **The list has a size limit.** The status of an object holds a limited
  amount of data. A schedule whose list comes near it takes no new snapshot
  (`Ready` false, the reason `StatusFull`) until its retention has deleted
  some.

### What is kept

A snapshot is **kept while one of the rules of `keep` keeps it**: it is one
of the newest `last`, or it is younger than `max_age`. Besides:

- the newest finished snapshot is always kept, so a schedule that can't
  take new ones does not delete its last good one;
- a snapshot that is not finished is never deleted;
- a deletion that fails is tried again, after one minute, doubling up to an
  hour; the snapshot stays in the list with `deleteError` (the start of the
  plugin's error), and the event `SnapshotDeleteFailed` is recorded once per
  snapshot, not at every attempt;
- a deletion is sent with the secrets of the volume and those of
  `secret_path` over them, as the creation is. While the secret can't be
  read nothing is deleted.

With `last = 7` and `max_age = "720h"`, a nightly schedule keeps a month of
snapshots, and at least seven when nights were missed.

## Status

```shell-session
$ norca object get -namespace prod norca.io/VolumeSnapshotSchedule db-nightly
```

| Field | Meaning |
| --- | --- |
| `lastRun` | The scheduled time of the last snapshot taken. |
| `nextRun` | The next time of the schedule. |
| `snapshots` | The snapshots the schedule took and keeps: `id` (the plugin's; empty while the plugin has not answered), `name`, `volume`, `plugin`, `scheduled`, `createTime`, `sizeBytes`, `ready`, and `deleteError` when a deletion failed. |
| `kept`, `taken`, `deleted` | How many snapshots are kept, and were taken and deleted since the schedule was written. |
| `failures`, `retryAt`, `failedRun` | Failed attempts in a row, when the next one is made, and the scheduled time that failed. |
| `deleteFailures`, `deleteRetryAt` | Passes in a row in which a deletion failed, and when deletions are tried again. |

Conditions:

| Condition | True when |
| --- | --- |
| `Ready` | The schedule can take its snapshots and the last attempt succeeded. When it is false, its reason says why: `VolumeNotFound`, `PluginNotFound`, `Unsupported`, `SecretUnavailable`, `InvalidSpec`, `SnapshotFailed`, `StatusFull`, or `Deleting` while snapshots of a deleted schedule are left. |
| `Failed` | The last attempt failed; the message is the plugin's error. |
| `Unsupported` | The plugin can't create snapshots. |
| `Suspended` | `suspend` is set. |
| `Degraded` | `Ready` is false. Counted in `norca.objects.degraded`. |

Events of the object: `SnapshotTaken`, `SnapshotFailed`, `SnapshotReplaced`,
`SnapshotDeleted`, `SnapshotDeleteFailed`, and `DependentKept` when the
schedule stays although its owner was deleted (see
[owners](/docs/features/operator-framework/lifecycle#owners-and-garbage-collection)).

## Deleting a schedule

The schedule has the finalizer `norca.io/operators`. When it is deleted:

- without `delete_snapshots`, the snapshots stay with the plugin, and the
  object goes at once;
- with `delete_snapshots = true`, the servers delete every snapshot in the
  list first. A snapshot that can't be deleted holds the object (the
  condition `Ready` with the reason `Deleting` names it) and is tried again,
  with the same waits as the retention. While the secret of `secret_path`
  can't be read, every snapshot is held. An entry that never got an `id`
  can't be deleted and is left: if the plugin made that snapshot, it stays
  with the plugin.

Snapshots that stay are managed by hand from then on:
[`norca volume snapshot list`](/docs/commands/volume/snapshot-list) and
[`norca volume snapshot delete`](/docs/commands/volume/snapshot-delete).

## Rights

The servers take and delete the snapshots, so the writer of a schedule is
checked when the object is written:

- `csi-write-volume` in the namespace and read on plugins, as for
  [`volume snapshot create`](/docs/commands/volume/snapshot-create);
- `read-secret` on `secret_path`, if it is set;
- the object right `write` on `norca.io/VolumeSnapshotSchedule` in the
  namespace, as for every object.

Deleting a schedule with `delete_snapshots = true` makes the servers delete
snapshots, so it needs `csi-write-volume` in the namespace and read on
plugins too. A schedule that keeps its snapshots is deleted with the object
right alone. The same rights are asked of whoever deletes an
[owner](/docs/features/operator-framework/lifecycle#owners-and-garbage-collection)
of such a schedule (the volume request it belongs to, for example) in the
background or foreground mode.

```hcl
namespace "prod" {
  capabilities = ["csi-write-volume"]
  secret "csi/*" { capabilities = ["read-secret"] }
  object "norca.io/VolumeSnapshotSchedule" { capabilities = ["read", "write"] }
}
plugin { policy = "read" }
```

The status is written by the servers only.

## Restoring

A schedule only takes and deletes snapshots. To restore, create a volume
from one with [`norca volume create`](/docs/commands/volume/create) and
`snapshot_id` in the volume specification, using the `id` of a snapshot of
the status.

## Limits

- One volume per schedule.
- The snapshot calls run one after the other on the leader: a plugin that
  answers slowly delays the other snapshot schedules for that time, not the
  other built-in operators (such as certificate renewals). A pass over the
  schedules stops beginning new ones after 20 seconds and goes on from there
  in the next pass; one call can still take as long as the plugin timeout.
- At most 500 snapshots per schedule: `keep.last`, and what `keep.max_age`
  keeps at the rate of the schedule.
