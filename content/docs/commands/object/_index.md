---
title: "Command: object"
linkTitle: "object"
description: "The object command is used to manage custom objects of registered object kinds."
---

The `object` command groups subcommands for managing custom objects: objects of
a kind registered with [`norca object-kind apply`](/docs/commands/object-kind/apply).
Users write the spec of an object; controllers write its status. See the
[operator framework](/docs/features/operator-framework) for the concepts.

## Usage

Usage: `norca object <subcommand> [options] [args]`

Run `norca object <subcommand> -h` for help on that subcommand. The following
subcommands are available:

- [`object apply`](/docs/commands/object/apply) - Create or update a custom object
- [`object delete`](/docs/commands/object/delete) - Delete a custom object
- [`object events`](/docs/commands/object/events) - Show the event log of a custom object
- [`object get`](/docs/commands/object/get) - Show a custom object
- [`object list`](/docs/commands/object/list) - List the custom objects of a kind
- [`object scale`](/docs/commands/object/scale) - Show or set the replica count of a custom object

Objects are addressed by their kind reference `<group>/<Kind>` and their name.
The namespace comes from the `-namespace` option (or the `namespace` attribute
of the object file); objects of cluster-scoped kinds have no namespace.

## Examples

```shell
$ norca object apply web.hcl
$ norca object list norca.io/LoadBalancer
$ norca object get norca.io/LoadBalancer web
$ norca object events norca.io/LoadBalancer web
$ norca object delete norca.io/LoadBalancer web
```
