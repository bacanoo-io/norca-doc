---
title: "Command: service intention info"
linkTitle: "service intention info"
description: "The service intention info command shows a service intention."
---

The `service intention info` command (Norca) shows the
[intention](/docs/features/native-mtls/intentions) from a source service to a destination service of the
namespace.

## Usage

```plaintext
norca service intention info [options] <source> <destination>
```

The source is `<service>` or `<namespace>/<service>`.

When ACLs are enabled, this command requires a token with the `read-job` capability for the namespace.

## General Options

The [general options](/docs/commands/service/info#general-options) of the `service` commands apply,
including `-namespace` and `-region`.

## Info Options

- `-json`: Output the intention in JSON format.

## Examples

```shell
$ norca service intention info -namespace apps probe test-api
Namespace     = apps
Destination   = test-api
Source        = apps/probe
Action        = allow
Description   = probe reads test-api
Create Index  = 412
Modify Index  = 412
```
