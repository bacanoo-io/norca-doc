---
title: "CSI volume requests"
linkTitle: "Volume requests"
description: "A CSI volume declared as an object: the servers create or register it, expand it, set it back when it is changed by hand, and delete it with the policy of the request."
weight: 51
---

## What and why

**A `CSIVolumeRequest` object declares a CSI volume, and the servers keep the
volume as it says.** Instead of running `norca volume create` once and
remembering what was asked for, you write the request; the leader creates
the volume through its plugin (or registers one that exists in the
storage), expands it when you raise its capacity, sets back what is changed
by hand, and deletes it with the request if you want that.

- **Built in.** The operator runs in the servers, on the leader. Nothing has
  to be installed, and it upgrades with the servers.
- **Declared, not run once.** The request is the record of the volume: a
  pack, a stack or a GitOps tool writes it like any other object.
- **Only its own volume.** A volume of the same ID that the request did not
  make is left alone unless the request says `adopt = true`.
- **The secrets stay in the secret store.** The CSI secrets come from a
  secret of the namespace; the object never holds them.

The kind `norca.io/CSIVolumeRequest` is namespaced and registered by the
servers. It is a [custom object](/docs/features/operator-framework): written
with [`norca object apply`](/docs/commands/object/apply), read with
`norca object get`, listed in the web UI. The name of the request is the ID
of the volume in its namespace; the volume is an ordinary CSI volume that
jobs claim with a `volume` block.

## A request

```hcl
kind      = "norca.io/CSIVolumeRequest"
name      = "db-data"
namespace = "prod"

spec {
  plugin_id    = "ebs"
  capacity_min = "10GiB"
  capacity_max = "20GiB"

  capability {
    access_mode     = "single-node-writer"
    attachment_mode = "file-system"
  }

  mount_options {
    fs_type = "ext4"
  }

  secret_path     = "csi/ebs"
  deletion_policy = "delete"
}
```

```shell-session
$ norca object apply db-data.hcl
```

| Field | Default | Meaning |
| --- | --- | --- |
| `plugin_id` | required | The CSI plugin of the volume. Can't be changed. |
| `mode` | `create` | `create`: the plugin creates the volume. `register`: the volume exists in the storage and is registered. Can't be changed. |
| `external_id` | | With `register`: the ID of the volume in the storage. Can't be changed. |
| `display_name` | `<namespace>-<name>` | The name of the volume (`Name` of the volume API), which the plugin gets as the name of the volume it creates. Can't be changed. |
| `capacity_min`, `capacity_max` | | Sizes such as `"10GiB"`. A raised `capacity_min` expands the volume. |
| `capability` | required | One or more blocks with `access_mode` and `attachment_mode`, as in the [volume specification](/docs/other-specifications/volume/capability). Any other key is refused. |
| `mount_options` | | `fs_type` and `mount_flags`. |
| `topology_request` | | With `create`: `required` and `preferred` blocks with `segments`, as in the [volume specification](/docs/other-specifications/volume/topology_request). Any other key is refused. Can't be changed. |
| `parameters` | | Passed to the plugin when the volume is created. Can't be changed. |
| `context` | | With `register`: the volume context the plugin expects. |
| `secret_path` | | A secret of the namespace whose items are the CSI secrets of the volume. Read at every pass. |
| `snapshot_id`, `clone_id` | | With `create`: the volume starts from a snapshot or a volume. Can't be changed. |
| `deletion_policy` | `retain` | What happens to the volume when the request is deleted (see below). |
| `adopt` | `false` | Take over a volume of the same ID that the request did not make. |

**The name the plugin gets** has the namespace in it, so requests of one
name in two namespaces get two volumes of the storage. A `display_name` is
sent as written: if the plugin answers it with a volume that is already
registered under another namespace or ID, the request fails (`Failed`: `the
request needs a display_name of its own`) instead of registering that volume
a second time.

## What the servers keep

At every pass, and at once when the request or the volume changes:

- **A missing volume is created** (or registered with `mode = "register"`;
  the plugin is asked first whether the volume exists with the capabilities
  asked for). A plugin that can't create volumes gives `Unsupported`.
- **A raised `capacity_min` is expanded** through the plugin (and on the
  nodes, if the plugin asks for it). A volume never shrinks.
- **A volume changed by hand is set back.** If someone changes the
  capabilities, the mount options or the requested capacity with `norca
  volume register` or `norca volume create`, the next pass writes what the
  request declares again and records `DriftCorrected`. Mount options can't
  change while the volume is mounted: that waits.
- **A change of the request or of its secret is an update, not drift.** The
  volume follows a changed spec, also when the first attempt failed and a
  retry made it, and the secrets of `secret_path` as they are in the secret
  store: event `Updated`, and `drifts` does not count it. Secrets changed
  by hand on the volume are set back the same way.
- **A created volume that is gone is not created again.** If it is deleted
  or deregistered by hand, the request reports `VolumeLost` instead of
  creating an empty volume in its place: the jobs of the volume would not
  see the difference. Delete the request and write it again to get a new
  volume. A registered volume (`mode = "register"`) is registered again.
- **Failures are tried again** after 30 seconds, doubling up to 30
  minutes. The condition `Failed` and the event `Failed` say why, and the
  request is not `Ready` while it waits for its retry. A changed spec is
  tried at once and starts its own count.

### Whose volume it is

CSI volumes have no owner field. The request remembers the volume it made
by the create index of the volume, in its status.

- A volume of the same ID that exists when the request is written is not
  touched: the request gets the condition `Conflict`. So does a volume that
  appears while the request waits for its plugin, its secret or a retry.
- From the moment the request calls the plugin to create its volume
  (`status.creating`), a volume of its ID that appears is its own only if it
  is the volume the request makes: of its plugin and its name. Anything
  else is a `Conflict`.
- With `adopt = true` the request takes it over (event `Adopted`): from then
  on it keeps it as its own. The volume must be of the same plugin.
- Writing a request does not need the old volume to be free: an adopted
  volume can be in use.

## Deleting a request

The request has the finalizer `norca.io/operators`, which only the servers or
a management token can remove. When it is deleted, its
`deletion_policy` says what happens to its volume:

| Policy | The volume |
| --- | --- |
| `retain` | Stays registered. It is an ordinary volume from then on. |
| `deregister` | Leaves Norca (`volume deregister`); the storage keeps it. |
| `delete` | Is deleted in the storage and deregistered (`volume delete`). Only with `mode = "create"`: a registered volume was not made by Norca. |

With `deregister` and `delete` the request waits while allocations claim the
volume (the condition `Ready` with the reason `VolumeInUse`), and goes when
they have stopped and released it. A volume the request does not own is never
touched.

**A create without an answer.** A request with the policy `delete` that is
deleted after it asked the plugin for its volume and before a volume was
registered (the create timed out, or failed after the storage made the
volume) asks the plugin for the volume once more and deletes it. While the
plugin is missing or unhealthy the deletion waits. If the volume can't be
asked for at all, the request goes with the warning event `VolumeMayBeLeft`:
look for a volume of its name in the storage.

## Status

```shell-session
$ norca object get -namespace prod norca.io/CSIVolumeRequest db-data
```

| Field | Meaning |
| --- | --- |
| `volumeCreateIndex` | The create index of the volume the request keeps. |
| `externalID`, `provider` | Of the volume, as the plugin answered. |
| `capacityBytes` | The capacity of the volume. |
| `schedulable` | Whether jobs can claim the volume now (its plugin is healthy). |
| `readAllocs`, `writeAllocs` | Allocations that use the volume. |
| `controllersHealthy`, `nodesHealthy` | Of the plugin. |
| `drifts`, `lastDrift` | How often the volume was set back, and when last. |
| `failures`, `retryAt`, `lastFailure` | Failed attempts in a row, when the next one is made, and the error of the last one. |
| `creating` | The plugin was asked to create the volume and the volume is not registered yet. |
| `appliedGeneration` | The generation of the request the volume was last in line with. |

Conditions:

| Condition | True when |
| --- | --- |
| `Ready` | The volume is as the request declares it and schedulable. When it is false, its reason says why: `Creating`, `Updating` (the volume changed while the request was updating it, for example an allocation claimed it; the update is made again in the next pass), `Conflict`, `VolumeLost`, `PluginNotFound`, `PluginUnavailable`, `Unsupported`, `SecretUnavailable`, `InvalidSpec`, `NotSchedulable`, `Failed`, `VolumeInUse` or `DeleteFailed` during a deletion. |
| `Conflict` | A volume of the same ID exists that the request does not own. |
| `Failed` | The last attempt failed; the message is the error. |
| `Degraded` | `Ready` is false, except while the volume is being created or an update is made again (`Creating`, `Updating`). Counted in `norca.objects.degraded`. |

Events of the object: `Created`, `Registered`, `Adopted`, `Updated`,
`DriftCorrected`, `Failed`, `DeleteFailed`, `VolumeMayBeLeft`, and
`DependentKept` when the request stays although its owner was deleted (see
[owners](/docs/features/operator-framework/lifecycle#owners-and-garbage-collection)).

## Rights

The servers create, register and delete the volume, so the writer of a
request is checked when the object is written:

- `csi-write-volume` in the namespace and read on plugins, as for
  [`volume create`](/docs/commands/volume/create);
- `read-secret` on `secret_path`, if it is set;
- the object right `write` on `norca.io/CSIVolumeRequest` in the namespace,
  as for every object.

Deleting a request whose `deletion_policy` is `deregister` or `delete` makes
the servers act on the storage, so it needs `csi-write-volume` in the
namespace and read on plugins too. A request that retains its volume is
deleted with the object right alone. The same rights are asked of whoever
deletes an [owner](/docs/features/operator-framework/lifecycle#owners-and-garbage-collection)
of such a request in the background or foreground mode.

```hcl
namespace "prod" {
  capabilities = ["csi-write-volume"]
  secret "csi/*" { capabilities = ["read-secret"] }
  object "norca.io/CSIVolumeRequest" { capabilities = ["read", "write"] }
}
plugin { policy = "read" }
```

The status is written by the servers only.

## Limits

- One volume per request; the name of the request is the volume ID.
- The secrets of `secret_path` are copied into the volume, as `volume
  create` does with the `secret` block, because the clients need them to
  mount it.
- The plugin calls of the volume requests run one after the other on the
  leader: a plugin that answers slowly delays the other volume requests for
  that time, not the other built-in operators. A pass over the requests
  stops beginning new ones after 20 seconds and goes on from there in the
  next pass; one call can still take as long as the plugin timeout.
