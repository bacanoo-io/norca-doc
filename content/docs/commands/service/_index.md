---
title: "Command: service"
linkTitle: "service"
description: "The service command is used to interact with the service API."
upstream:
  path: "website/content/docs/commands/service/index.mdx"
---

The `service` command is used to interact with the service API.

## Usage

Usage: `norca service <subcommand> [options]`

Run `norca service <subcommand> -h` for help on that subcommand. The following
subcommands are available:

- [`service delete`][servicedelete] - Deregister a registered service
- [`service info`][serviceinfo] - Display an individual Norca service registration
- [`service list`][servicelist] - Display all registered Norca services

Norca adds the following subcommands:

- [`service register`](/docs/commands/service/register) - Register an external service
- [`service deregister`](/docs/commands/service/deregister) - Deregister an external service
- [`service ttl`](/docs/commands/service/ttl) - Renew the TTL checks of an external service
- [`service intention`](/docs/commands/service/intention) - Interact with service intentions
  (`create`, `delete`, `list`, `info`, `check`)

[servicedelete]: /docs/commands/service/delete/
[serviceinfo]: /docs/commands/service/info/
[servicelist]: /docs/commands/service/list/
