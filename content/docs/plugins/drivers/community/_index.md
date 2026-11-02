---
title: "Community Supported"
linkTitle: "Task Driver Plugins: Community Supported"
description: "A list of community supported Task Driver Plugins."
upstream:
  path: "website/content/plugins/drivers/community/index.mdx"
---

If you have authored a task driver plugin that you believe will be useful to the
broader Norca community and you are committed to maintaining the plugin, please
file a PR to add your plugin to this page.

For details on authoring a task driver plugin, please refer to the [plugin
authoring guide][plugin_guide].

## Task Driver Plugins

Norca has a plugin system for defining task drivers. External task driver
plugins will have the same user experience as built in drivers.

Below is a list of community-supported task drivers you can use with Norca:

- [containerd][nomad-driver-containerd]
- [Firecracker][firecracker-task-driver]
- [Jail task driver][jail-task-driver]
- [Lightrun][lightrun]
- [LXC][lxc]
- [Pledge][pledge]
- [Pot][pot]
- [Rkt][rkt]
- [Rookout][rookout]
- [Singularity][singularity]
- [systemd-nspawn][nspawn-driver]
- [Windows IIS][nomad-driver-iis]

[rookout]: /docs/plugins/drivers/community/rookout/
[lxc]: /docs/plugins/drivers/community/lxc/
[rkt]: /docs/plugins/drivers/community/rkt/
[plugin_guide]: /docs/concepts/plugins/
[singularity]: /docs/plugins/drivers/community/singularity/
[jail-task-driver]: /docs/plugins/drivers/community/jail-task-driver/
[pot]: /docs/plugins/drivers/community/pot/
[firecracker-task-driver]: /docs/plugins/drivers/community/firecracker-task-driver/
[nspawn-driver]: /docs/plugins/drivers/community/nspawn/
[nomad-driver-iis]: /docs/plugins/drivers/community/iis/
[nomad-driver-containerd]: /docs/plugins/drivers/community/containerd/
[lightrun]: /docs/plugins/drivers/community/lightrun/
[pledge]: /docs/plugins/drivers/community/pledge/
