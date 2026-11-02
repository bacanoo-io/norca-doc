---
title: "Command: object-kind delete"
linkTitle: "object-kind delete"
description: "The object-kind delete command deletes an object kind."
---

The `object-kind delete` command deletes an object kind.

## Usage

```plaintext
norca object-kind delete [options] <group>/<Kind>
```

A kind that still has objects can't be deleted; delete its objects first.

If ACLs are enabled, this command requires a token with the `write` capability
of the `operator` policy.

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## Examples

```shell
$ norca object-kind delete norca.io/LoadBalancer
Successfully deleted object kind "norca.io/LoadBalancer"!
```
