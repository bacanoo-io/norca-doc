---
title: "Command: object delete"
linkTitle: "object delete"
description: "The object delete command deletes a custom object."
---

The `object delete` command deletes a custom object.

## Usage

```plaintext
norca object delete [options] <group>/<Kind> <name>
```

An object with finalizers is only marked for deletion; it disappears when its
controllers have removed the finalizers (after cleaning up). The objects and
jobs the object owns are deleted according to the propagation mode. See
[Lifecycle](/docs/features/operator-framework/lifecycle) for the details.

If ACLs are enabled, this command requires a token with the `write` capability
of an object rule matching the kind in the namespace. If the object's
`managed_by` names an identity, only that identity or a management token may
delete it.

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-namespace`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## Delete Options

- `-cas <index>`: Only delete if the stored object has this modify index.

- `-dry-run`: Check that the object can be deleted without deleting it.

- `-propagation <mode>`: What happens to the objects and jobs the object owns:
  `background` (default) deletes the object at once and them afterwards,
  `foreground` deletes them first and the object afterwards, `orphan` leaves
  them in place.

## Examples

Delete a load balancer; its controller removes the proxy job through the
finalizer:

```shell
$ norca object delete norca.io/LoadBalancer web
Object "norca.io/LoadBalancer/web" is marked for deletion (background); waiting for the finalizers norca.io/loadbalancer-cleanup
```

Delete an object but keep the jobs it owns:

```shell
$ norca object delete -propagation orphan db.example.com/PostgresCluster billing
```
