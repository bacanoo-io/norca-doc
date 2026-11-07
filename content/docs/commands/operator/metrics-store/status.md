---
title: "Command: operator metrics-store status"
linkTitle: "status"
description: "The operator metrics-store status command displays the state of the metrics store of a server."
weight: 1
---

The `operator metrics-store status` command displays the state of the
[metrics store](/docs/configuration/metrics_store) of one server: its
partitions, the disk use against `max_disk_size`, the series against
`max_series`, the oldest and the newest point, the effective retention and
sample interval, the reports and task groups it dropped, and the series it
forgot for having no point within the retention. A second part, `Hosts
Store`, shows the hosts store, which keeps the node and server metrics
(`norca.node.*`, `norca.server.*`, `norca.bus.*`): its partitions, its disk
use against `host_max_disk_size`, its series (counted in the `Series` of the
first part as well, which `max_series` limits), its oldest and newest point
and `host_retention`. The retentions, the disk caps and `max_series` shown
are those in effect: a [reload](/docs/configuration/metrics_store#reload) of
the server configuration changes them without a restart. A retention of
whole days is shown in days (`7d`).

Without `-server`, the server that answers the request reports. On a client
agent, that is a server the client is connected to.

## Usage

```plaintext
norca operator metrics-store status [options]
```

If ACLs are enabled, this command requires a token with the `operator:read`
capability.

## Options

- `-server`: The name or ID of the server of the region to report.
- `-json`: Output the state in JSON format.

## Examples

```shell-session
$ norca operator metrics-store status
Server            = nomad-1.global
Partitions        = 14 (12 on disk)
Disk              = 46 MiB of 4.0 GiB
Series            = 960 of 50000
Oldest Point      = 2026-10-28T08:00:00Z
Newest Point      = 2026-10-31T08:41:30Z
Retention         = 30d
Sample Interval   = 30s
Dropped Reports   = 0
Duplicate Reports = 0
Dropped Groups    = 0
Forgotten Series  = 0

Hosts Store (norca.node.*, norca.server.*, norca.bus.*)
Partitions   = 6 (4 on disk)
Disk         = 9.0 MiB of 1.0 GiB
Series       = 240
Oldest Point = 2026-10-28T08:00:00Z
Newest Point = 2026-10-31T08:41:30Z
Retention    = 7d
```
