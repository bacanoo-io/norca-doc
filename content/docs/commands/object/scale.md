---
title: "Command: object scale"
linkTitle: "object scale"
description: "The object scale command shows or sets the replica count of a custom object."
---

The `object scale` command shows or sets the replica count of a custom object,
through the scale subresource of its kind (the `scale` block of the kind
definition).

## Usage

```plaintext
norca object scale [options] <group>/<Kind>/<name> [<count>]
norca object scale [options] <group>/<Kind> <name> [<count>]
```

Without a count, the command shows the replica count (from the spec path), the
observed replica count (from the status path, if the status sets it), the spec
path and the generation. With a count, the new count is written to the spec
path of the kind, validated like any spec change, and recorded in the object's
event log as a `Scaled` event. The `managed_by` identity of the object is not
enforced, so the count of an object managed by another tool can be changed.

If ACLs are enabled, this command requires a token with the `write` capability
of an object rule matching the kind in the namespace (`read` to show the scale).

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-namespace`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## Scale Options

- `-message <text>`: Message recorded in the object's event log.

- `-cas <index>`: Only write if the stored object has this modify index.

- `-json`: Output the scale in JSON format.

## Examples

Show the scale:

```shell
$ norca object scale -namespace prod db.example.com/PostgresCluster/billing
```

Scale to five replicas:

```shell
$ norca object scale -namespace prod -message "quarter end" db.example.com/PostgresCluster billing 5
```
