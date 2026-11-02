---
title: "Object Kind Specification"
linkTitle: "Object kind"
description: "The HCL format of object kinds, the types of custom objects, applied with norca object-kind apply."
---

Object kinds are the types of the custom objects of the
[operator framework](/docs/features/operator-framework). They are written in HCL
and applied with [`norca object-kind apply`](/docs/commands/object-kind/apply),
or rendered from `*.kind.hcl.tpl` templates of an
[operator pack](/docs/features/operator-framework/ecosystem#operator-packs).
The JSON form is the one of the [object kinds API](/docs/api/object-kinds).

The file may call `file("<path>")` (relative to the file), `jsonencode()` and
`jsondecode()`.

```hcl {filename="postgrescluster.kind.hcl"}
kind "PostgresCluster" {
  group       = "db.example.com"
  description = "PostgreSQL cluster managed by the postgres operator"
  namespaced  = true
  schema      = file("postgrescluster.schema.json")

  rule {
    expression = "self.spec.replicas >= 1 && self.spec.replicas <= 7"
    message    = "The number of replicas must be between 1 and 7."
  }
  rule {
    expression = "!has(oldSelf) || quantity(self.spec.storage) >= quantity(oldSelf.spec.storage)"
    message    = "Storage cannot be reduced."
  }

  columns {
    column "Version" { path = "spec.version" }
    column "Replicas" { path = "status.readyReplicas" }
    column "Ready" { path = "status.conditions[?type=='Ready'].status" }
  }

  scale {
    spec_path   = "spec.replicas"
    status_path = "status.readyReplicas"
  }

  version = 2
  migration {
    spec = "self.spec.omit(['size']).merge({'storage': self.spec.size})"
  }

  webhook "validate" {
    url            = "https://pg-operator.internal:8443/validate"
    ca_cert        = file("ca.pem")
    failure_policy = "fail"
  }

  limits {
    write_rate                = 50
    identity_write_rate       = 10
    max_objects_per_namespace = 100
    max_watches_per_identity  = 10
  }
}
```

## `kind` Parameters

The file has one `kind` block, labeled with the name of the kind: a CamelCase
name that starts with a letter, at most 63 characters.

- `group` `(string: <required>)` - The API group, a lower case DNS name such as
  `norca.io` (at most 253 characters). The kind is referenced as
  `<group>/<Kind>`.

- `description` `(string: "")` - Shown by listings and the UI (at most 1024
  characters).

- `namespaced` `(bool: true)` - Whether objects live in namespaces. With
  `false` the kind is cluster-scoped. It can't change while objects exist.

- `schema` `(string: <required>)` - A JSON Schema (draft 2020-12 unless it
  declares another `$schema`) of the document `{"spec": ..., "status": ...}`, at
  most 256 KiB. Its `default` values are filled in on every write.

- `rule` <code>([Rule](#rule-parameters): nil)</code> - A CEL validation rule.
  Repeatable, at most 64.

- `columns` <code>([Columns](#columns-parameters): nil)</code> - The display
  columns of listings and the UI.

- `scale` <code>([Scale](#scale-parameters): nil)</code> - The scale
  subresource.

- `version` `(int: 1)` - The schema version. It can never be lowered; raising
  it migrates the stored objects with `migration`.

- `migration` <code>([Migration](#migration-parameters): nil)</code> - Converts
  objects stored at an older schema version.

- `webhook` <code>([Webhook](#webhook-parameters): nil)</code> - An admission
  webhook bound to the kind. Repeatable, at most 8.

- `limits` <code>([Limits](#limits-parameters): nil)</code> - Server-side load
  management of the kind's objects.

- `replicated` `(bool: false)` - Reserved for replication of the kind across
  regions. Not implemented; `true` is rejected.

### `rule` Parameters

- `expression` `(string: <required>)` - A CEL expression (at most 8192
  characters) that must evaluate to `true`. It sees `self` (the object:
  `kind`, `metadata`, `spec`, `status`), `oldSelf` (the stored object on update,
  `null` on create; test it with `has(oldSelf)`) and `request` (`operation`,
  `namespace`, `dryRun`, `user`). `quantity()` converts sizes such as `"100GiB"`
  to numbers.

- `message` `(string: "")` - The error message when the rule is violated (at
  most 1024 characters). Without it, the expression is shown.

### `columns` Parameters

- `column` `(block: <required>)` - A column, labeled with its name (letters,
  digits, spaces, `.`, `_`, `-`; at most 64 characters). Repeatable, at most 16.
  - `path` `(string: <required>)` - The field shown: dotted names
    (`spec.version`), list indexes (`spec.users[0]`), all elements
    (`spec.users[*].name`) or filters (`status.conditions[?type=='Ready'].status`).
    At most 256 characters.

### `scale` Parameters

- `spec_path` `(string: <required>)` - The dotted path of the replica count in
  the spec; must start with `spec.`.

- `status_path` `(string: "")` - The dotted path of the observed replica count
  in the status; must start with `status.`.

### `migration` Parameters

- `spec` `(string: "")` - A CEL expression that returns the new spec as a map.
  It sees `self` (the stored object), `fromVersion` and `toVersion`. Maps have the
  helpers `m.merge(other)` and `m.omit([keys])`. Empty keeps the spec.

- `status` `(string: "")` - A CEL expression that returns the new status. Empty
  keeps the status; an empty map drops it.

Each expression is at most 16 KiB.

### `webhook` Parameters

The block label is the webhook name (letters, digits, `.`, `_`, `-`; at most 64
characters).

- `mode` `(string: "validate")` - `validate` accepts or rejects writes;
  `default` may also change the spec with a JSON patch, before validation.

- `url` `(string: <required>)` - The absolute `https` URL the admission review
  is posted to, without user information.

- `ca_cert` `(string: "")` - A PEM bundle of the CAs that sign the webhook's
  certificate (at most 64 KiB). The system roots are used when it is empty.

- `tls_server_name` `(string: "")` - Overrides the server name verified in the
  certificate.

- `timeout` `(string: "5s")` - Timeout of a call, at most `30s`.

- `failure_policy` `(string: "fail")` - `fail` rejects the write when the
  webhook can't be called, returns an invalid response or is not approved;
  `ignore` lets it through with a warning.

- `operations` `(array<string>: ["create", "update"])` - The reviewed
  operations: `create`, `update` and, for validating webhooks, `delete`.

Webhooks are called only after an administrator approved them; see
[Approval](/docs/features/operator-framework/ecosystem#approval).

### `limits` Parameters

Zero means no limit.

- `write_rate` `(float: 0)` - Writes per second of all identities to objects of
  the kind (spec, status, finalizers, events, scale, deletion).

- `write_burst` `(int: 0)` - Burst of `write_rate` (at least 1).

- `identity_write_rate` `(float: 0)` - Writes per second of each identity
  (token or workload identity).

- `identity_write_burst` `(int: 0)` - Burst of `identity_write_rate` (at least
  1).

- `max_objects_per_namespace` `(int: 0)` - Objects of the kind per namespace
  (for cluster-scoped kinds: in total).

- `max_watches_per_identity` `(int: 0)` - Concurrent blocking queries of each
  identity on objects of the kind, per server.

Requests over a limit fail with `429 Too Many Requests`.
