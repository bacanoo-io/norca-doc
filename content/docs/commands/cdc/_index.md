---
title: "Command: cdc"
linkTitle: "cdc"
description: "The cdc command groups the tools for change data capture."
---

The `cdc` command groups the subcommands for [change data
capture](/docs/features/change-data-capture): the changes of a region, read
one way from the system bus by a reader with a
[`cdc` rule](/docs/other-specifications/acl-policy#cdc-rules).

## Usage

Usage: `norca cdc <subcommand> [options]`

| Subcommand | Description |
| --- | --- |
| [`consumer apply`](/docs/commands/cdc/consumer-apply) | Create or change the reader's consumer of a change stream |
| [`consumer read`](/docs/commands/cdc/consumer-read) | Show the reader's consumer of a change stream |
| [`consumer delete`](/docs/commands/cdc/consumer-delete) | Delete the reader's consumer of a change stream |

The reader is the token of the command (`NORCA_TOKEN`), or the workload
identity of a task.
