---
title: "Command: plugin capacity"
linkTitle: "plugin capacity"
description: "Ask a CSI plugin for the capacity of its storage."
---

The `plugin capacity` command asks a controller of a [Container Storage
Interface (CSI)][csi] plugin for the capacity of its storage (CSI
`GetCapacity`): the bytes available for new volumes and, when the plugin
reports them, the largest and the smallest size of a volume. The plugin needs
the `GET_CAPACITY` controller capability.

Without options the answer is for the whole storage. With options it is for
volumes of these parameters, capability and topology, as a
[`volume create`][create] would send them, for example for a storage class or
a pool with other parameters.

The capacity the leader asks every [`capacity_interval`][capacity_interval]
is shown by [`plugin status`][status].

## Usage

```plaintext
norca plugin capacity [options] <plugin>
```

If ACLs are enabled, this command requires a token with the `plugin:read`
capability.

## General Options

The [general options](/docs/commands/plugin/status#general-options) of the
plugin commands.

## Capacity Options

- `-parameter <key=value>`: A parameter of the plugin, as in the
  [`parameters`][parameters] block of a volume. May be given more than once.

- `-topology <key=value>`: A segment of the accessible topology to ask for.
  May be given more than once. Only for a plugin with topologies
  (`VOLUME_ACCESSIBILITY_CONSTRAINTS`); other plugins refuse a topology.

- `-access-mode <mode>`, `-attachment-mode <mode>`: The capability of the
  volumes, e.g. `single-node-writer` and `file-system`. Both or neither.

- `-json`: Output the capacity in JSON format.

## Examples

```shell-session
$ norca plugin capacity -parameter tier=fast -access-mode single-node-writer -attachment-mode file-system ebs-prod
Topology  Available  Max Volume  Min Volume  Reported
(all)     10 GiB     5.0 GiB     -           2026-11-11T20:45:12Z
```

[csi]: https://github.com/container-storage-interface/spec
[create]: /docs/commands/volume/create/
[status]: /docs/commands/plugin/status/
[capacity_interval]: /docs/job-specification/csi_plugin/#capacity_interval
[parameters]: /docs/other-specifications/volume/#parameters
