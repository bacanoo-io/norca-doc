---
title: "Command: object-kind webhook approve"
linkTitle: "object-kind webhook approve"
description: "The object-kind webhook approve command approves an admission webhook bound to an object kind."
---

The `object-kind webhook approve` command approves a webhook bound to an object
kind, so that the servers call it.

## Usage

```plaintext
norca object-kind webhook approve [options] <group>/<Kind> <webhook>
```

Admission webhooks bound to an object kind review the writes of its objects.
They are declared in the kind (usually by the pack of the operator), but the
servers call them only after an administrator approved them: kinds applied with
a management token approve their webhooks at once, others wait for an approval.
The approval covers the current configuration of the webhook (URL, CA, mode,
operations, timeout, failure policy); any change of the configuration needs a
new approval. See [Type-bound webhooks](/docs/features/operator-framework/ecosystem#type-bound-webhooks).

[`norca object-kind inspect`](/docs/commands/object-kind/inspect) shows the
webhooks and their approvals.

If ACLs are enabled, this command requires a management token.

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## Examples

```shell
$ norca object-kind webhook approve norca.io/LoadBalancer validate
Approved webhook "validate" of norca.io/LoadBalancer
```
