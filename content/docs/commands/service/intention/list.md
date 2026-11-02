---
title: "Command: service intention list"
linkTitle: "service intention list"
description: "The service intention list command lists the service intentions of a namespace."
---

The `service intention list` command (Norca) lists the
[intentions](/docs/features/native-mtls/intentions) of the namespace, or of every namespace the token may
read with `-namespace '*'`.

## Usage

```plaintext
norca service intention list [options]
```

The command takes no arguments. The intentions are sorted by namespace, destination and source.

When ACLs are enabled, this command requires a token with the `read-job` capability for the namespace.

## General Options

The [general options](/docs/commands/service/info#general-options) of the `service` commands apply,
including `-namespace` and `-region`.

## List Options

- `-json`: Output the intentions in JSON format.

## Examples

```shell
$ norca service intention list -namespace apps
Namespace  Destination  Source       Action  Description
apps       test-api     apps/probe   allow   probe reads test-api
apps       test-api     dev/*        deny
```

```shell
$ norca service intention list -namespace '*' -json
```
