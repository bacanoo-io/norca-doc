---
title: "Command: object-kind inspect"
linkTitle: "object-kind inspect"
description: "The object-kind inspect command shows the details of an object kind."
---

The `object-kind inspect` command shows the details of an object kind: its
description, scope, scale subresource, schema version and limits, the
migration, the webhooks with their approvals, the rules, the display columns and
the schema.

## Usage

```plaintext
norca object-kind inspect [options] <group>/<Kind>
```

If ACLs are enabled, this command requires a token with the `read` capability of
the `operator` policy, or any object capability on the kind.

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## Inspect Options

- `-json`: Output the object kind in JSON format.

- `-t`: Format and display the object kind using a Go template.

## Examples

```shell
$ norca object-kind inspect norca.io/LoadBalancer
```

The `Webhooks` table shows each webhook with its mode, URL, operations, failure
policy and approval (`pending`, or who approved it and when).
