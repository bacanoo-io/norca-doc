---
title: "Custom Object Specification"
linkTitle: "Custom object"
description: "The HCL format of custom objects, applied with norca object apply."
---

Custom objects are instances of an [object kind](/docs/other-specifications/object-kind).
They are written in HCL and applied with
[`norca object apply`](/docs/commands/object/apply), or rendered from
`*.object.hcl.tpl` templates of a pack. The JSON form is the one of the
[objects API](/docs/api/objects).

The file may call `file("<path>")` (relative to the file), `jsonencode()` and
`jsondecode()`.

```hcl {filename="billing.hcl"}
kind       = "db.example.com/PostgresCluster"
name       = "billing"
namespace  = "prod"
labels     = { team = "finance" }
managed_by = "gitops"

spec {
  version  = "16"
  replicas = 3
  storage  = "100GiB"
  backup { schedule = "0 2 * * *" }
}
```

## Parameters

- `kind` `(string: <required>)` - The kind reference, `<group>/<Kind>`.

- `name` `(string: <required>)` - The object name: starts and ends with a letter
  or digit, may contain `.`, `_` and `-`, at most 128 characters.

- `namespace` `(string: "")` - The namespace of an object of a namespaced kind.
  Without it, the `-namespace` option of the command (default `default`) is
  used. Objects of cluster-scoped kinds have no namespace.

- `labels` `(map<string|string>: nil)` - Labels, indexed for selection. At most
  64; keys may have a prefix (`example.com/team`), values are at most 256
  characters. An apply replaces the labels.

- `managed_by` `(string: "")` - The tool or identity that manages the spec. The
  identity forms `workload:<namespace>/<job>[/<task>]`, `role:<name>`,
  `policy:<name>` and `token:<accessor ID>` are enforced: only that identity
  (and management tokens) may update or delete the object. Other values are
  free text. At most 256 characters.

- `finalizers` `(array<string>: nil)` - Finalizers to add (requires the
  `manage-finalizers` capability). An apply never removes finalizers. At most 32.

- `owner` <code>([Owner](#owner-parameters): nil)</code> - An owner of the
  object. Repeatable, at most 16. An apply replaces the owners.

- `spec` `(block: nil)` - The desired state, validated against the schema of
  the kind (which usually requires it). Blocks inside the spec become objects; a block type that
  repeats becomes a list, and a labeled block becomes an object keyed by its
  label. The spec can also be given as an attribute: `spec = { ... }`.

The status is not part of the file; controllers write it through the
[status endpoint](/docs/api/objects#update-the-status).

### `owner` Parameters

- `kind` `(string: <required>)` - The owner's kind: a `<group>/<Kind>`
  reference for a custom object. `Job` and `Variable` are accepted and stored,
  but the garbage collector acts only on custom object owners.

- `name` `(string: <required>)` - The owner's name.

- `namespace` `(string: "")` - The owner's namespace; defaults to the object's
  namespace (empty for owners of a cluster-scoped kind).

When all custom object owners of an object are deleted in the `background` or
`foreground` mode, the garbage collector deletes the object. See
[Lifecycle](/docs/features/operator-framework/lifecycle#owners-and-garbage-collection).

## Spec Blocks

Nested blocks map to JSON as follows:

```hcl
spec {
  backup { schedule = "0 2 * * *" }      # "backup": {"schedule": "0 2 * * *"}

  user { name = "app" }                  # "user": [{"name": "app"}, {"name": "report"}]
  user { name = "report" }

  database "orders" { owner = "app" }    # "database": {"orders": {"owner": "app"}}
}
```

A block type may not be mixed with an attribute of the same name, and labeled
and unlabeled blocks of the same type can't be mixed.
