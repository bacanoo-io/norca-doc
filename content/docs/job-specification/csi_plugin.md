---
title: "csi_plugin Block"
linkTitle: "csi_plugin"
description: "The \"csi_plugin\" block allows the task to specify it provides a Container Storage Interface plugin to the cluster."
upstream:
  path: "website/content/docs/job-specification/csi_plugin.mdx"
---

**Placement:** `job -> group -> task -> csi_plugin`

The "csi_plugin" block allows the task to specify it provides a
Container Storage Interface plugin to the cluster. Norca will
automatically register the plugin so that it can be used by other jobs
to claim [volumes][csi_volumes].

```hcl
csi_plugin {
  id                     = "csi-hostpath"
  type                   = "monolith"
  mount_dir              = "/csi"
  stage_publish_base_dir = "/local/csi"
  health_timeout         = "30s"
}
```

## `csi_plugin` Parameters

- `id` `(string: <required>)` - This is the ID for the plugin. Some
  plugins will require both controller and node plugin types (see
  below); you need to use the same ID for both so that Norca knows they
  belong to the same plugin.

- `type` `(string: <required>)` - One of `node`, `controller`, or
  `monolith`. Each plugin supports one or more types.
  - **Each Norca client node where you want to mount a volume will need a `node`
    plugin instance.**
  - Some plugins will also require one or more `controller` plugin instances to
    communicate with the storage provider's APIs.
  - Some plugins can serve as both `controller` and `node` at the same time, and
    these are called `monolith` plugins.

  Refer to your CSI plugin's documentation.

- `mount_dir` `(string: <optional>)` - The directory path inside the
  container where the plugin will expect a Unix domain socket for
  bidirectional communication with Norca. This field is typically not
  required. Refer to your CSI plugin's documentation for details.

- `stage_publish_base_dir` `(string: <optional>)` - The base directory
  path inside the container where the plugin will be instructed to
  stage and publish volumes. This field is typically not required.
  Refer to your CSI plugin's documentation for details. **This can not
  be a subdirectory of `mount_dir`.** A plugin task without its own
  file system (`raw_exec`) gets no mounts: it is told to stage and
  publish under the plugin directory of the host instead, so a plugin
  can run as a raw_exec task without a privileged container.

- `health_timeout` `(duration: <optional>)` - The duration that
  the plugin supervisor will wait before restarting an unhealthy
  CSI plugin. Must be a duration value such as `30s` or `2m`.
  Defaults to `30s` if not set.

- `stats_interval` `(duration: "1m")` - How often the client asks a
  `node` or `monolith` plugin for the usage of the volumes it has
  published on the node (CSI `NodeGetVolumeStats`). Only for plugins
  with the `GET_VOLUME_STATS` node capability; plugins with
  `VOLUME_CONDITION` also report whether a volume is abnormal. `0`
  turns it off. See [volume usage and condition](#volume-usage-and-condition).

- `capacity_interval` `(duration: "5m")` - How often the leader asks a
  `controller` or `monolith` plugin for the capacity of its storage (CSI
  `GetCapacity`): for the whole storage and, for a plugin with topologies,
  for every topology segment of its nodes. Only for plugins with the
  `GET_CAPACITY` controller capability. `0` turns it off. See
  [capacity](#capacity).

## Volume usage and condition

When a node plugin can report it, **Norca knows how full each published
volume is and whether the plugin considers it healthy**:

- `norca volume status <id>` shows a **Node Usage** table: bytes used,
  available and in total, inodes used and free, the condition
  (`normal`, `abnormal: <message>`, or the error of the last request)
  and when the node last asked the plugin.
- The [metrics store](/docs/configuration/metrics_store#volume-metrics)
  keeps the `norca.volume.*` gauges.
- The `CSIVolume` [event topic](/docs/api/events#additional-topics) has a
  `VolumeAbnormal` event when a plugin reports a volume abnormal, and a
  `VolumeRecovered` event when it is normal again or no longer published
  on that node.

The client sends the latest answers with its usage report on the system
bus, so they need a client with
[`usage`](/docs/configuration/client) on and servers that ask for the
reports (the metrics store or the built-in autoscaler enabled). The
servers keep only the latest answer per volume and node, in memory, and
only for volumes the node has a claim on.

## Capacity

For a controller plugin with `GET_CAPACITY`, **Norca knows how much room its
storage has**:

- `norca plugin status <id>` shows a **Capacity** table: bytes available and
  the largest and smallest volume size, as the controller reported them at the
  last `capacity_interval` (the leader asks, and keeps the answers in memory).
- [`norca plugin capacity`](/docs/commands/plugin/capacity) asks once with the
  parameters, capability and topology you give, e.g. for another storage
  class.
- The [metrics store](/docs/configuration/metrics_store#csi-capacity-metrics)
  keeps the `norca.csi.*` gauges.
- `norca volume create` asks first, with the parameters, capabilities and (for
  a plugin with topologies) the one required topology of the volume, and
  **refuses the volume** when the plugin reports less available than
  `capacity_min`, or a largest volume size below it. If the plugin can not be
  asked, the volume is created as before.

## Live volume state

For a controller plugin with `GET_VOLUME`, **Norca compares the state of the
storage with its claims**:

- `norca volume status -live <id>` asks the controller at once and shows a
  **Controller State** section: the nodes the volume is published on, the
  claimed nodes the controller does not list (**Claimed, Not Published**), the
  nodes it lists without a claim (**Published, Not Claimed**), and the
  controller's condition. Without `-live` the section shows the leader's last
  check.
- The leader asks every 5 minutes per volume. With
  `LIST_VOLUMES_PUBLISHED_NODES`, a claimed node the controller does not list,
  seen in two checks in a row (the second 30 seconds later), publishes a
  `VolumeDrift` event naming the node. Nodes the controller lists without a
  claim are only shown: the CSI specification allows a controller to list nodes
  a volume is not published to.
- With `VOLUME_CONDITION` of the controller a change of its condition publishes
  `VolumeAbnormal` or `VolumeRecovered` without a node.
- **Nothing is changed:** no claim is released and no allocation is stopped.

> [!WARNING]
> Plugins running as `node` or `monolith` require root
> privileges (or `CAP_SYS_ADMIN` on Linux) to mount volumes on the
> host. With the Docker task driver, you can use the `privileged = true`
> configuration, but no other default task drivers currently have this
> option.

## Recommendations for Deploying CSI Plugins

CSI plugins run as Norca tasks, but after mounting the volume are not in the
data path for the volume. Tasks that mount volumes write and read directly to
the volume via a bind-mount and there is no communication between the job and
the CSI plugin. But when an allocation that mounts a volume stops, Norca will
need to communicate with the plugin on that allocation's node to unmount the
volume. This has implications on how to deploy CSI plugins:

* If you are stopping jobs on a node, **you must stop tasks that claim
  volumes before stopping the `node` or `monolith` plugin for those
  volumes.** If you use the `node drain` feature, plugin tasks will
  automatically be drained last.

* **Only the most recently-placed allocation for a given plugin ID and
  type (controller or node) will be used by any given client node.** Run
  `node` plugins as system jobs and distribute `controller` plugins
  across client nodes using a constraint as shown below.

* Some plugins will create volumes only in the same location as the
  plugin. For example, the AWS EBS plugin will create and mount
  volumes only within the same Availability Zone. You should configure
  your plugin task as recommended by the plugin's documentation to use
  the [`topology_request`] field in your volume specification.

## `csi_plugin` Examples

```hcl
job "plugin-efs" {
  datacenters = ["dc1"]

  # you can run node plugins as service jobs as well, but running
  # as a system job ensures all nodes in the DC have a copy.
  type = "system"

  # only one plugin of a given type and ID should be deployed on
  # any given client node
  constraint {
    operator = "distinct_hosts"
    value = true
  }

  group "nodes" {
    task "plugin" {
      driver = "docker"

      config {
        image = "amazon/aws-efs-csi-driver:v.1.3.2"

        args = [
          "--endpoint=unix://csi/csi.sock",
          "--logtostderr",
          "--v=5",
        ]

        # all CSI node plugins will need to run as privileged tasks
        # so they can mount volumes to the host. controller plugins
        # do not need to be privileged.
        privileged = true
      }

      csi_plugin {
        id             = "aws-efs0"
        type           = "node"
        mount_dir      = "/csi"  # this path /csi matches the --endpoint
                            # argument for the container
        health_timeout = "30s"
      }
    }
  }
}
```

[csi]: https://github.com/container-storage-interface/spec
[csi_volumes]: /docs/job-specification/volume/
[system]: /docs/concepts/schedulers#system
[`topology_request`]: /docs/commands/volume/create#topology_request
