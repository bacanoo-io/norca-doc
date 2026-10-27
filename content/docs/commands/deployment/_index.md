---
title: "Command: deployment"
linkTitle: "deployment"
description: "The deployment command is used to interact with deployments."
upstream:
  path: "website/content/docs/commands/deployment/index.mdx"
---

The `deployment` command is used to interact with deployments.

## Usage

Usage: `norca deployment <subcommand> [options]`

Run `norca deployment <subcommand> -h` for help on that subcommand. The following
subcommands are available:

- [`deployment fail`][fail] - Manually fail a deployment
- [`deployment list`][list] - List all deployments
- [`deployment pause`][pause] - Pause a deployment
- [`deployment promote`][promote] - Promote canaries in a deployment
- [`deployment resume`][resume] - Resume a paused deployment
- [`deployment run`][run] - (Norca) Run a pending multiregion deployment
- [`deployment status`][status] - Display the status of a deployment
- [`deployment unblock`][unblock] - Unblock a blocked multiregion deployment

[fail]: /docs/commands/deployment/fail/ 'Manually fail a deployment'
[list]: /docs/commands/deployment/list/ 'List all deployments'
[pause]: /docs/commands/deployment/pause/ 'Pause a deployment'
[promote]: /docs/commands/deployment/promote/ 'Promote canaries in a deployment'
[resume]: /docs/commands/deployment/resume/ 'Resume a paused deployment'
[run]: /docs/commands/deployment/run/ 'Run a pending multiregion deployment'
[status]: /docs/commands/deployment/status/ 'Display the status of a deployment'
[unblock]: /docs/commands/deployment/unblock/ 'Unblock a blocked multiregion deployment'
