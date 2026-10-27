---
title: "Command: plugin"
linkTitle: "plugin"
description: "The plugin command is used to interact with plugins."
upstream:
  path: "website/content/docs/commands/plugin/index.mdx"
---

The `plugin` command is used to interact with external plugins that
can be registered by Norca jobs. Currently Norca supports [Container
Storage Interface (CSI)][csi] plugins.

## Usage

Usage: `norca plugin <subcommand> [options]`

Run `norca plugin <subcommand> -h` for help on that subcommand. The following
subcommands are available:

- [`plugin status`][status] - Display status information about a plugin

[csi]: https://github.com/container-storage-interface/spec
[status]: /docs/commands/plugin/status/ 'Display status information about a plugin'
