---
title: "Command: object apply"
linkTitle: "object apply"
description: "The object apply command creates or updates a custom object."
---

The `object apply` command creates or updates the spec and the metadata of a
custom object.

## Usage

```plaintext
norca object apply [options] <input>
```

The specification file is read from stdin by specifying `-`, otherwise a path to
the file is expected. Files are parsed as HCL in the format of the
[custom object specification](/docs/other-specifications/custom-object), or as
JSON in the API form with `-json` or a `.json` extension.

The server fills in the default values of the kind's schema, validates the
object against the schema and the kind's rules (and its approved webhooks), and
increases the generation if the spec changed. The status written by controllers
is kept. Labels, `managed_by` and owners are replaced by the values in the file;
finalizers in the file are added to the stored ones.

If ACLs are enabled, this command requires a token with the `write` capability
of an object rule matching the kind in the namespace. Adding finalizers also
requires `manage-finalizers`. If the object's `managed_by` names an identity,
only that identity or a management token may update it.

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-namespace`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## Apply Options

- `-cas <index>`: Only write if the stored object has this modify index (`0`:
  only create the object). On a mismatch the write fails with a conflict; read
  the object again and retry.

- `-dry-run`: Fill in the defaults and validate the object, and show the result
  without writing it.

- `-json`: Parse the input as a JSON object in the API form (also used for
  `.json` files).

## Examples

Create a load balancer object:

```shell
$ cat web.hcl
kind = "norca.io/LoadBalancer"
name = "web"

spec {
  service = "web"
  port    = 8080
}

$ norca object apply web.hcl
Successfully applied object "norca.io/LoadBalancer/web" (generation 1, modify index 72)!
```

Check an object with its defaults filled in, without writing it:

```shell
$ norca object apply -dry-run web.hcl
```

Update only if nobody changed the object since it was read at index 72:

```shell
$ norca object apply -cas 72 web.hcl
```
