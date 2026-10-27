---
title: "Task Drivers"
description: "Task Drivers are used to integrate with the host OS to run tasks in Norca."
upstream:
  path: "website/content/plugins/drivers/index.mdx"
---

Task drivers are used by Norca clients to execute a task and provide resource
isolation. By having extensible task drivers, Norca has the flexibility to
support a broad set of workloads across all major operating systems.

Starting with Nomad 0.9, task drivers are now pluggable. This gives users the
flexibility to introduce their own drivers without having to recompile Norca.
You can view the [plugin block][plugin] documentation for examples on how to
use the `plugin` block in Norca's client configuration. Note that we have
introduced new syntax when specifying driver options in the client configuration
(see [docker][docker_plugin] for an example). Keep in mind that even though all
built-in drivers are now plugins, Norca remains a single binary and maintains
backwards compatibility except with the `lxc` driver.

The list of supported task drivers is provided on the left of this page. Each
task driver documents the configuration available in a [job
specification](/docs/job-specification/), the environments it can be
used in, and the resource isolation mechanisms available.

For details on authoring a task driver plugin, please refer to the [plugin
authoring guide][plugin_guide].

Task driver resource isolation is intended to provide a degree of separation of
Norca client CPU / memory / storage between tasks. Resource isolation
effectiveness is dependent upon individual task driver implementations and
underlying client operating systems. Task drivers do include various
security-related controls, but the Norca client to task interface should not be
considered a security boundary. See the [ACL concepts](/docs/concepts/acl) and
the [security model](/docs/concepts/security) for how to protect Norca cluster
operations.

[plugin]: /docs/configuration/plugin/
[docker_plugin]: /docs/drivers/docker#client-requirements
[plugin_guide]: /docs/concepts/plugins/
