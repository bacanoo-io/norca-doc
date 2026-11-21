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

**An object with finalizers is only marked for deletion**; it disappears when its
controllers have removed the finalizers (after cleaning up). The objects and
jobs the object owns are deleted according to the propagation mode. See
[Lifecycle](/docs/features/operator-framework/lifecycle) for the details.

If ACLs are enabled, this command requires a token with the `write` capability
of an object rule matching the kind in the namespace. If the object's
`managed_by` names an identity, only that identity or a management token may
delete it. The same holds for an object whose deletion in the `background`
or `foreground` mode would take a managed tenant, certificate, volume
request or snapshot schedule with it.

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-namespace`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## Delete Options

- `-cas <index>`: Only delete if the stored object has this modify index.

- `-dry-run`: Check that the object can be deleted without deleting it.

- `-propagation <mode>`: What happens to the objects and jobs the object owns:
  - `background` (default) deletes the object at once and them afterwards,
  - `foreground` deletes them first and the object afterwards,
  - `orphan` leaves them in place.

  **Running the command again with `-propagation orphan`** on an object that
  is marked for deletion in the `background` or `foreground` mode lets go of
  what the object owns: nothing more of it is deleted or stopped, what was
  deleted or stopped already stays so, and the object goes when its own
  finalizers are removed. If it has no finalizers of its own, it is removed
  at once and the command prints
  `Successfully deleted object "<group>/<Kind>/<name>"!`. Any other repeated
  delete changes nothing. See
  [Lifecycle](/docs/features/operator-framework/lifecycle#owners-and-garbage-collection).

  In every mode the event log of the object stays listable with
  [`object events`](/docs/commands/object/events) for
  [`object_tombstone_gc_threshold`](/docs/configuration/server#object_tombstone_gc_threshold)
  (5 minutes by default) after the object is gone.

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
Successfully deleted object "db.example.com/PostgresCluster/billing"!
```
