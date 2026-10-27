---
title: "Command: object-kind apply"
linkTitle: "object-kind apply"
description: "The object-kind apply command creates or updates an object kind."
---

The `object-kind apply` command creates or updates an object kind.

## Usage

```plaintext
norca object-kind apply [options] <input>
```

The specification file is read from stdin by specifying `-`, otherwise a path to
the file is expected. Files are parsed as HCL in the format of the
[object kind specification](/docs/other-specifications/object-kind), or as JSON
in the API form with `-json` or a `.json` extension. In HCL, `file()` reads a
file relative to the specification (for example the JSON Schema).

The server compiles the JSON Schema and the CEL rules and rejects the kind if
one of them is invalid. When the schema, the rules or the schema version change,
the stored objects are checked against the new kind: a change that would make
stored objects invalid is rejected, unless the version is raised with a
migration that converts them (the leader then migrates them in the background).
`-dry-run` shows the report.

If ACLs are enabled, this command requires a token with the `write` capability
of the `operator` policy. Webhooks of kinds applied with a management token are
approved at once; others wait for
[`norca object-kind webhook approve`](/docs/commands/object-kind/webhook-approve),
and the command prints a warning for each pending webhook.

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## Apply Options

- `-dry-run`: Validate and compile the object kind without writing it, and
  report what the write does to the stored objects (migration, validation). The
  command exits with 1 if the write would make stored objects invalid.

- `-json`: Parse the input as a JSON object kind (also used for `.json` files).

## Examples

Register a kind:

```shell
$ norca object-kind apply loadbalancer.kind.hcl
Successfully applied object kind "norca.io/LoadBalancer"!
```

Check what raising the schema version does to the stored objects:

```shell
$ norca object-kind apply -dry-run postgrescluster.kind.hcl
```

The report lists how many objects were checked, how many are at older
versions, how many change, which would be invalid and why, and a few before
and after samples.
