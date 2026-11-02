---
title: "Command: operator metrics-store status"
linkTitle: "status"
description: "The operator metrics-store status command displays the state of the metrics store of a server."
weight: 1
---

The `operator metrics-store status` command displays the state of the
[metrics store](/docs/configuration/metrics_store) of one server: its
partitions, the disk use against `max_disk_size`, the series against
`max_series`, the oldest and the newest point, and the reports and task
groups it dropped.

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
Server          = nomad-1.global
Partitions      = 14 (12 on disk)
Disk            = 46 MiB of 2.0 GiB
Series          = 960 of 50000
Oldest Point    = 2026-10-28T08:00:00Z
Newest Point    = 2026-10-31T08:41:30Z
Retention       = 720h0m0s
Sample Interval = 30s
Dropped Reports = 0
Dropped Groups  = 0
```
