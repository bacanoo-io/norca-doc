---
title: "Command: service intention delete"
linkTitle: "service intention delete"
description: "The service intention delete command deletes a service intention."
---

The `service intention delete` command (Norca) deletes the
[intention](/docs/features/native-mtls/intentions) from a source service to a destination service of the
namespace.

## Usage

```plaintext
norca service intention delete [options] <source> <destination>
```

The source is `<service>` or `<namespace>/<service>`, written as when the intention was created.

When ACLs are enabled, this command requires a token with the `write-intention` capability for the
namespace.

## General Options

The [general options](/docs/commands/service/info#general-options) of the `service` commands apply,
including `-namespace` and `-region`.

## Examples

```shell
$ norca service intention delete -namespace apps probe test-api
Service intention probe -> test-api deleted

$ norca service intention delete -namespace apps 'dev/*' test-api
Service intention dev/* -> test-api deleted
```
