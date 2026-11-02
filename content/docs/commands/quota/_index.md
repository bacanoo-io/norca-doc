---
title: "Command: quota"
linkTitle: "quota"
description: "The quota command is used to interact with quota specifications."
upstream:
  path: "website/content/docs/commands/quota/index.mdx"
---

The `quota` command is used to interact with
[quota specifications](/docs/other-specifications/quota), which limit the
resources of namespaces (see [namespace quotas](/docs/features/quotas)).

## Usage

Usage: `norca quota <subcommand> [options]`

Run `norca quota <subcommand> -h` for help on that subcommand. The following
subcommands are available:

- [`quota apply`][quotaapply] - Create or update a quota specification
- [`quota delete`][quotadelete] - Delete a quota specification
- [`quota init`][quotainit] - Create an example quota specification file
- [`quota inspect`][quotainspect] - Inspect a quota specification
- [`quota list`][quotalist] - List quota specifications
- [`quota status`][quotastatus] - Display a quota's status and current usage

[quotaapply]: /docs/commands/quota/apply
[quotadelete]: /docs/commands/quota/delete
[quotainit]: /docs/commands/quota/init
[quotainspect]: /docs/commands/quota/inspect
[quotalist]: /docs/commands/quota/list
[quotastatus]: /docs/commands/quota/status
