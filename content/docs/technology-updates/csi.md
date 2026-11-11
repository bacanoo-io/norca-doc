---
title: "Container storage (CSI)"
description: The parts of the CSI specification Norca completes, the SeaweedFS CSI driver and its packs, and how they are tested.
weight: 3
status: "In progress"
---

**Status:** In progress · 2026-11-11 · phase 1 done, phase 2 built and lab tested, in review · Starting
point: CSI specification v1.7.0 (`container-storage-interface/spec`), the CSI integration of Norca

Norca runs [CSI](https://github.com/container-storage-interface/spec) plugins as tasks
([`csi_plugin`](/docs/job-specification/csi_plugin)) and manages their volumes. A review of the
specification against the plugin client found parts that were missing or not used. They are completed
in phases, each on its own, designed from the specification and Norca's own requirements.

| Area | Change | Status |
| --- | --- | --- |
| [Specification rules](#phase-1-specification-rules) | `readonly` of `ControllerPublishVolume` only with `PUBLISH_READONLY`; a hint when a create from a clone or snapshot fails | Done |
| [Volume usage and condition](#phase-2-volume-usage-and-condition) | `NodeGetVolumeStats`: usage and condition of every published volume, `norca.volume.*` metrics, `CSIVolume` events | Built, lab tested, in review |
| [Plugins without isolation](#plugins-without-file-system-isolation) | A raw_exec plugin gets the host paths to stage and publish; raw_exec `allowed_devices` (e.g. `/dev/fuse`) | Built, lab tested, in review |
| [SeaweedFS](#seaweedfs-driver-and-packs) | The SeaweedFS CSI driver with volume conditions, the `seaweedfs` and `seaweedfs-csi` packs | Built, lab tested, in review |
| [Capacity](#phase-3-capacity) | `GetCapacity`: a periodic capacity metric, `plugin capacity`, a check before `volume create` | Built, in review |
| [Live volume state](#phase-4-live-volume-state) | `ControllerGetVolume`: `volume status -live`, drift events, controller-side conditions | Built, in review |
| [Access modes](#later-phases) | `single-node-single-writer`, `single-node-multi-writer`, `VOLUME_MOUNT_GROUP` | Planned |
| [Newer specification](#later-phases) | CSI 1.9 and later | A separate decision |

## Phase 1: specification rules

- **`readonly` of `ControllerPublishVolume`** is set only when the controller reports
  `PUBLISH_READONLY`; before, a read-only claim set it for every controller, which the specification
  does not allow.
- **Create from a clone or a snapshot:** when the controller does not report `CLONE_VOLUME` or
  `CREATE_DELETE_SNAPSHOT` and the create fails, the error says so. Norca does not refuse the create
  beforehand: the specification only says a plugin MAY report these capabilities.
- **`NodeExpandVolume` stays** as it is: the specification says the CO MUST call it when the
  controller answers `node_expansion_required`.

## Phase 2: volume usage and condition

- A node plugin with `GET_VOLUME_STATS` is asked for the usage of every volume it has published on the
  node, every [`stats_interval`](/docs/job-specification/csi_plugin#stats_interval) (1 minute by
  default, `0` off). A plugin with `VOLUME_CONDITION` also reports whether the volume is abnormal.
- The client sends the answers with its usage report on the system bus; every server keeps the latest
  answer per volume and node in memory, only for volumes the node has a claim on.
- **What you see:** the Node Usage table of `norca volume status`, the `norca.volume.*` gauges of the
  [metrics store](/docs/configuration/metrics_store#volume-metrics), and the `VolumeAbnormal` and
  `VolumeRecovered` events of the `CSIVolume` [topic](/docs/api/events#additional-topics).
- **No reaction:** an abnormal volume is reported, the allocations keep running.

## Phase 3: capacity

- Every [`capacity_interval`](/docs/job-specification/csi_plugin#capacity_interval)
  (5 minutes by default, `0` off) the leader asks a controller with `GET_CAPACITY` for the capacity
  of the whole storage and, for a plugin with topologies, of every topology segment of its nodes.
  The answers stay in the memory of the leader: `plugin status` shows them and the `norca.csi.*`
  gauges keep their history.
- [`norca plugin capacity`](/docs/commands/plugin/capacity) asks once with the parameters,
  capability and topology you give.
- `volume create` asks first with the volume's parameters, capabilities and required topology, and
  refuses a volume the storage can not hold: less available than `capacity_min`, or a largest volume
  size below it. A topology is only sent to a plugin with `VOLUME_ACCESSIBILITY_CONSTRAINTS`, as
  the specification requires.

## Phase 4: live volume state

- `volume status -live` asks the controller (`GET_VOLUME`) at once and shows its view next to the
  claims: the published nodes, claimed nodes it does not list, nodes it lists without a claim, its
  condition.
- The leader asks every 5 minutes per volume. A claimed node the controller does not list
  (`LIST_VOLUMES_PUBLISHED_NODES`), seen twice in a row, publishes `VolumeDrift`; nodes listed without
  a claim are only shown, because the specification allows them. A change of the controller's
  condition (`VOLUME_CONDITION`) publishes `VolumeAbnormal` or `VolumeRecovered` without a node.
- Nothing is changed by Norca; the answers stay in the leader's memory.

## Plugins without file system isolation

A plugin task with its own file system gets the plugin directory of the host mounted at
`stage_publish_base_dir` and is told to stage and publish under it. A raw_exec task gets no mounts, so
those paths did not exist for it. Norca now hands such a plugin the host paths themselves, as it already
did for the socket (`CSI_ENDPOINT`). This lets a CSI driver run as a raw_exec task, without a
privileged container.

A driver that mounts with FUSE also needs `/dev/fuse`. With cgroups v2 every raw_exec task is in a
cgroup that only lets it open a short list of devices, even as root; the raw_exec setting
[`allowed_devices`](/docs/drivers/raw_exec#plugin-options) adds devices to it (norca-deployer:
`client_settings.raw_exec_allowed_devices`).

## SeaweedFS driver and packs

| | |
| --- | --- |
| Storage | [SeaweedFS](https://github.com/seaweedfs/seaweedfs) (Apache-2.0), release 4.51 |
| Driver | [`bacanoo-io/seaweedfs-csi-driver`](https://github.com/bacanoo-io/seaweedfs-csi-driver) (Apache-2.0), a fork of the SeaweedFS CSI driver |
| Packs | `seaweedfs` 0.1.0 and `seaweedfs-csi` 0.1.0 of the [Norca pack registry](https://github.com/bacanoo-io/norca-registry) |

- **The fork adds `VOLUME_CONDITION`:** a staged or published volume whose FUSE mount does not answer
  (the `weed mount` process died or hangs) is reported abnormal instead of missing. The health monitor
  of the driver remounts it, and the condition is normal again.
- **`seaweedfs` pack:** one server (master, volume server and filer in one `weed` process) with
  raw_exec, the data in a directory of its node, the services in the native catalog.
- **`seaweedfs-csi` pack:** on every node the mount service (`weed mount`, FUSE) and the driver as a
  monolith CSI plugin, both raw_exec; the filer is found in the native catalog. The nodes need FUSE 3.
- Both are Apache-2.0 software; Norca references the release archives and binaries and never ships
  them.

## Testing

Each phase has unit tests, and a lab case (norca-lab, case `csi`, on one node) checks the whole path;
the run of 2026-11-11 passed all 42 checks:

- a test plugin with both capabilities: the Node Usage in the API and in `volume status`, the six
  `norca.volume.*` series, `VolumeAbnormal` and `VolumeRecovered` (also when an abnormal volume is no
  longer published), no usage with `stats_interval = "0s"`;
- the SeaweedFS packs: a volume created by the driver, mounted and written by a task, its usage and a
  normal condition; its `weed mount` killed: `VolumeAbnormal`, remounted by the driver:
  `VolumeRecovered`.

## Later phases

- **Access modes:** the single-node modes of CSI 1.5 and `VOLUME_MOUNT_GROUP`.
- **CSI 1.9 and later** (group snapshots, modify volume) is a separate decision.
