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
  time it was scheduled for, and CSI makes a snapshot of a name once: a new
  leader that takes over, or a retry after a failure, never makes a second
  one.
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
| `schedule` | required | A cron expression, as for [periodic jobs](/docs/job-specification/periodic): five fields, or six or seven with seconds and years. |
| `time_zone` | `UTC` | The time zone of the schedule (an IANA name). |
| `keep.last` | | Keep the newest so many snapshots (1 to 500). |
| `keep.max_age` | | Keep the snapshots younger than this, a Go duration such as `"720h"`. |
| `name_prefix` | `<namespace>-<name>` | The start of the snapshot names. A snapshot is named `<prefix>-<YYYYMMDD-hhmmss>` after its scheduled time in UTC. |
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
- **A failure is tried again**, after one minute, doubling up to an hour,
  unless the next scheduled time comes first. The condition `Failed` says
  why; the event `SnapshotFailed` records each attempt.
- A snapshot the plugin has not finished (`ready` false) is asked for again
  every 30 seconds until it is.

### What is kept

A snapshot is **kept while one of the rules of `keep` keeps it**: it is one
of the newest `last`, or it is younger than `max_age`. Besides:

- the newest finished snapshot is always kept, so a schedule that can't
  take new ones does not delete its last good one;
- a snapshot that is not finished is never deleted;
- a deletion that fails is tried again; the snapshot stays in the list with
  `deleteError`.

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
| `snapshots` | The snapshots the schedule took and keeps: `id` (the plugin's), `name`, `volume`, `plugin`, `scheduled`, `createTime`, `sizeBytes`, `ready`, and `deleteError` when a deletion failed. |
| `kept`, `taken`, `deleted` | How many snapshots are kept, and were taken and deleted since the schedule was written. |
| `failures`, `retryAt` | Failed attempts in a row, and when the next one is made. |

Conditions:

| Condition | True when |
| --- | --- |
| `Ready` | The schedule can take its snapshots and the last attempt succeeded. When it is false, its reason says why: `VolumeNotFound`, `PluginNotFound`, `Unsupported`, `SecretUnavailable`, `InvalidSpec`, `SnapshotFailed`, or `Deleting` while snapshots of a deleted schedule are left. |
| `Failed` | The last attempt failed; the message is the plugin's error. |
| `Unsupported` | The plugin can't create snapshots. |
| `Suspended` | `suspend` is set. |
| `Degraded` | `Ready` is false. Counted in `norca.objects.degraded`. |

Events of the object: `SnapshotTaken`, `SnapshotFailed`, `SnapshotDeleted`,
`SnapshotDeleteFailed`.

## Deleting a schedule

The schedule has the finalizer `norca.io/operators`. When it is deleted:

- without `delete_snapshots`, the snapshots stay with the plugin, and the
  object goes at once;
- with `delete_snapshots = true`, the servers delete every snapshot in the
  list first. A snapshot that can't be deleted holds the object (the
  condition `Ready` with the reason `Deleting` names it) and is tried again.

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
- The snapshot calls run in the loop of the built-in operators on the
  leader: a plugin that answers slowly delays the other operators (such as
  certificate renewals) for that time.
- A snapshot whose creation failed with a timeout may have been made by the
  plugin anyway. If a later time is taken before the retry, that snapshot is
  not in the list and is not deleted by the schedule.
