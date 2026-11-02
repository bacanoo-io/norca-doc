---
title: "Command: alloc"
linkTitle: "alloc"
description: "The alloc command is used to interact with allocations."
upstream:
  path: "website/content/docs/commands/alloc/index.mdx"
---

The `alloc` command is used to interact with allocations.

## Usage

Usage: `norca alloc <subcommand> [options]`

Run `norca alloc <subcommand> -h` for help on that subcommand. The following
subcommands are available:

- [`alloc checks`][checks] - Outputs service health check status information.
- [`alloc exec`][exec] - Run a command in a running allocation
- [`alloc fs`][fs] - Inspect the contents of an allocation directory
- [`alloc logs`][logs] - Streams the logs of a task
- [`alloc restart`][restart] - Restart a running allocation or task
- [`alloc signal`][signal] - Signal a running allocation
- [`alloc status`][status] - Display allocation status information and metadata
- [`alloc stop`][stop] - Stop and reschedule a running allocation

[checks]: /docs/commands/alloc/checks/ 'Outputs service health check status information'
[exec]: /docs/commands/alloc/exec/ 'Run a command in a running allocation'
[fs]: /docs/commands/alloc/fs/ 'Inspect the contents of an allocation directory'
[logs]: /docs/commands/alloc/logs/ 'Streams the logs of a task'
[restart]: /docs/commands/alloc/restart/ 'Restart a running allocation or task'
[signal]: /docs/commands/alloc/signal/ 'Signal a running allocation'
[status]: /docs/commands/alloc/status/ 'Display allocation status information and metadata'
[stop]: /docs/commands/alloc/stop/ 'Stop and reschedule a running allocation'
