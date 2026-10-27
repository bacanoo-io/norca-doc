---
title: "Command: server"
linkTitle: "server"
description: "The server command is used to interact with Norca servers."
upstream:
  path: "website/content/docs/commands/server/index.mdx"
---

Command: `norca server`

The `server` command is used to interact with servers.

## Usage

Usage: `norca server <subcommand> [options]`

Run `norca server <subcommand> -h` for help on that subcommand. The following
subcommands are available:

- [`server force-leave`][force-leave] - Force a server into the 'left' state
- [`server join`][join] - Join server nodes together
- [`server members`][members] - Display a list of known servers and their status

[force-leave]: /docs/commands/server/force-leave/ "Force a server into the 'left' state"
[join]: /docs/commands/server/join/ 'Join server nodes together'
[members]: /docs/commands/server/members/ 'Display a list of known servers and their status'
