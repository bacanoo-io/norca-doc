---
title: "Command: object-kind webhook revoke"
linkTitle: "object-kind webhook revoke"
description: "The object-kind webhook revoke command removes the approval of an admission webhook bound to an object kind."
---

The `object-kind webhook revoke` command removes the approval of a webhook bound
to an object kind.

## Usage

```plaintext
norca object-kind webhook revoke [options] <group>/<Kind> <webhook>
```

After the approval is revoked, the writes the webhook reviews fail, unless its
failure policy is `ignore`. Approve it again with
[`norca object-kind webhook approve`](/docs/commands/object-kind/webhook-approve).

If ACLs are enabled, this command requires a management token.

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## Examples

```shell
$ norca object-kind webhook revoke norca.io/LoadBalancer validate
Revoked the approval of webhook "validate" of norca.io/LoadBalancer
```
