---
title: "Command: scaling"
linkTitle: "scaling"
description: "The scaling command is used to interact with the scaling API."
upstream:
  path: "website/content/docs/commands/scaling/index.mdx"
---

The `scaling` command is used to interact with the scaling API.

> [!WARNING]
> Scaling commands are new in Nomad 1.0.

## Usage

Usage: `norca scaling <subcommand> [options]`

Run `norca scaling <subcommand> -h` for help on that subcommand. The following
subcommands are available:

- [`policy info`][scalingpolicyinfo] - Display an individual Norca scaling policy
- [`policy list`][scalingpolicylist] - List all Norca scaling policies

[scalingpolicyinfo]: /docs/commands/scaling/policy-info/
[scalingpolicylist]: /docs/commands/scaling/policy-list/
