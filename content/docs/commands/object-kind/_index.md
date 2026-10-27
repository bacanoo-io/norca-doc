---
title: "Command: object-kind"
linkTitle: "object-kind"
description: "The object-kind command is used to manage the kinds (types) of custom objects."
---

The `object-kind` command groups subcommands for managing the kinds (types) of
custom objects. A kind has a JSON Schema with default values, CEL validation
rules and display columns, and optionally a scale subresource, a schema version
with a migration, webhooks and limits. Objects of a kind are managed with the
[`norca object`](/docs/commands/object) commands. See the
[operator framework](/docs/features/operator-framework) for the concepts.

## Usage

Usage: `norca object-kind <subcommand> [options] [args]`

Run `norca object-kind <subcommand> -h` for help on that subcommand. The
following subcommands are available:

- [`object-kind apply`](/docs/commands/object-kind/apply) - Create or update an object kind
- [`object-kind delete`](/docs/commands/object-kind/delete) - Delete an object kind
- [`object-kind inspect`](/docs/commands/object-kind/inspect) - Inspect an object kind
- [`object-kind lint`](/docs/commands/object-kind/lint) - Check an object kind and sample objects without a server
- [`object-kind list`](/docs/commands/object-kind/list) - List object kinds
- [`object-kind webhook approve`](/docs/commands/object-kind/webhook-approve) - Approve a webhook bound to an object kind
- [`object-kind webhook revoke`](/docs/commands/object-kind/webhook-revoke) - Revoke the approval of a webhook bound to an object kind

## Examples

```shell
$ norca object-kind apply loadbalancer.kind.hcl
$ norca object-kind list
$ norca object-kind inspect norca.io/LoadBalancer
$ norca object-kind lint loadbalancer.kind.hcl examples/web.hcl
$ norca object-kind webhook approve norca.io/LoadBalancer validate
$ norca object-kind delete norca.io/LoadBalancer
```
