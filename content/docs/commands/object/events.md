---
title: "Command: object events"
linkTitle: "object events"
description: "The object events command shows the event log of a custom object."
---

The `object events` command shows the event log of a custom object: the last
events recorded by its controllers and by the server (for example scaling),
oldest first. Repeated events are counted.

## Usage

```plaintext
norca object events [options] <group>/<Kind> <name>
```

The table has the columns `Last Seen`, `Type` (`Normal` or `Warning`), `Reason`,
`Count`, `Reporter` (the identity that wrote the event) and `Message`. The log
keeps the last 20 events of an object. **The log of a deleted object can be
listed** for the time the servers keep its tombstone
([`object_tombstone_gc_threshold`](/docs/configuration/server#object_tombstone_gc_threshold),
5 minutes by default), unless an object of the name was created again.

If ACLs are enabled, this command requires a token with the `read` capability of
an object rule matching the kind in the namespace.

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-namespace`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## Events Options

- `-json`: Output the events in JSON format.

- `-t`: Format and display the events using a Go template.

## Examples

```shell
$ norca object events norca.io/LoadBalancer web
```

The log of a release, which is itself a custom object:

```shell
$ norca object events rigger.norca.io/Release lb
```
