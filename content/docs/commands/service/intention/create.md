---
title: "Command: service intention create"
linkTitle: "service intention create"
description: "The service intention create command creates or replaces a service intention."
---

The `service intention create` command (Norca) creates or replaces the
[intention](/docs/features/native-mtls/intentions) from a source service to a destination service of the
namespace.

## Usage

```plaintext
norca service intention create [options] <source> <destination>
```

The source is `<service>` (in the same namespace as the destination) or `<namespace>/<service>`; either
part may be `*`. The destination is a service of the namespace given with `-namespace`, or `*`. An
existing intention with the same source and destination is replaced.

When ACLs are enabled, this command requires a token with the `write-intention` capability for the
namespace. No policy shorthand includes it.

## General Options

The [general options](/docs/commands/service/info#general-options) of the `service` commands apply,
including `-namespace` (the namespace of the destination) and `-region`.

## Create Options

- `-allow`: Allow the connections (default).

- `-deny`: Deny the connections. Only one of `-allow` and `-deny` may be given.

- `-description=<text>`: Description of the intention (at most 1024 bytes).

## Examples

```shell
$ norca service intention create -namespace apps -description "probe reads test-api" probe test-api
Service intention allow probe -> test-api written

$ norca service intention create -namespace apps -deny 'dev/*' test-api
Service intention deny dev/* -> test-api written

$ norca service intention create -region eu-1 -namespace apps probe test-api
Service intention allow probe -> test-api written
```
