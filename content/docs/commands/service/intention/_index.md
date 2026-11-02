---
title: "Command: service intention"
linkTitle: "service intention"
description: "The service intention commands manage the service intentions of native mTLS."
---

The `service intention` commands (Norca) manage
[service intentions](/docs/features/native-mtls/intentions), which allow or deny connections between
services that use native mTLS.

An intention belongs to the namespace of its destination service (the `-namespace` option) and names a
source service, optionally in another namespace as `<namespace>/<service>`. `*` matches every service or
namespace. The most specific matching intention decides; at equal specificity `deny` wins over `allow`;
without a matching intention a connection is denied. Intentions are regional: they are written to and
enforced in the region of the request (`-region`).

## Usage

Usage: `norca service intention <subcommand> [options] [args]`

Run `norca service intention <subcommand> -h` for help on that subcommand. The following subcommands are
available:

- [`service intention create`](/docs/commands/service/intention/create) - Create or replace a service
  intention
- [`service intention delete`](/docs/commands/service/intention/delete) - Delete a service intention
- [`service intention list`](/docs/commands/service/intention/list) - List service intentions
- [`service intention info`](/docs/commands/service/intention/info) - Show a service intention
- [`service intention check`](/docs/commands/service/intention/check) - Check whether intentions allow a
  connection

## Examples

Allow the `web` service to connect to the `api` service:

```shell
$ norca service intention create -allow web api
```

Deny every service of the namespace `dev` access to the `db` service:

```shell
$ norca service intention create -deny 'dev/*' db
```

List the intentions of a namespace:

```shell
$ norca service intention list -namespace prod
```
