---
title: "Admission Policy Specification"
description: "The HCL format of Norca admission policies: CEL rules that jobs, Variables writes and pack releases must satisfy."
---

Admission policies are cluster objects with CEL rules that are checked when a
job is registered or planned, and optionally when Variables are written or a
pack release is applied (see [dynamic admission control](/docs/features/admission-control)).
They are written as HCL files and submitted with
[`norca admission-policy apply`](/docs/commands/admission-policy/apply). A file
with the `.json` extension, or `-json`, is read in the JSON form of the
[HTTP API](/docs/api/admission-policies).

Example admission policy:

```hcl
name        = "no-privileged-container"
description = "Privileged Docker containers are forbidden in prod"
action      = "deny" # or "warn"

match {
  namespaces = ["prod"]
}

rule {
  expression = "!job.TaskGroups.exists(g, g.Tasks.exists(t, t.Driver == 'docker' && has(t.Config.privileged) && t.Config.privileged))"
  message    = "Privileged containers are not allowed in the prod namespace."
}
```

## Admission Policy Parameters

- `name` `(string: <required>)` - The name of the policy. It must match
  `^[a-zA-Z0-9-_]{1,128}$` and be unique in the region.

- `description` `(string: "")` - An optional human-readable description, at most
  256 characters.

- `action` `(string: "deny")` - What happens when a rule is violated: `deny`
  rejects the job or write, `warn` only returns a warning (useful to roll out a
  new rule gradually).

- `match` <code>([Match](#match-parameters): nil)</code> - Selects what the policy
  applies to. Without it the policy applies to the jobs of every namespace.

- `rule` <code>([Rule](#rule-parameters): nil)</code> - A CEL rule. May be
  repeated, up to 64 times. At least one rule is required, unless the policy sets
  `schema_from` or `trusted_keys`.

- `schema_from` `(string: "")` - The only value is `crd-schema`: the items of a
  `crd/<group>/<kind>/<name>` Variable must match the JSON Schema stored in the
  `schema` item of the `crd-schema/<group>/<kind>` Variable of the same
  namespace, if that Variable exists. Requires the `variable` resource.

- `trusted_keys` `(array<string>: [])` - PEM encoded public keys (cosign format),
  up to 32. A release is admitted only if its pack has a valid signature of its
  digest by one of the keys; the servers verify the signatures themselves.
  Requires the `release` resource. See
  [signatures in protected namespaces](/docs/features/packages/releases#signatures-in-protected-namespaces).

### `match` Parameters

- `namespaces` `(array<string>: [])` - The namespaces the policy applies to.
  Glob patterns are allowed. Empty means every namespace.

- `resources` `(array<string>: ["job"])` - The kinds of objects the policy
  applies to: `job`, `variable` and/or `release`. Empty means jobs only.

- `variable_paths` `(array<string>: [])` - Restricts the Variables writes the
  policy applies to. Glob patterns are allowed. Empty means every path. Requires
  the `variable` resource.

### `rule` Parameters

- `expression` `(string: <required>)` - A CEL expression of at most 8192
  characters that must evaluate to a boolean. The rule is satisfied when it
  evaluates to `true`. An expression that fails at runtime (for example because
  it reads a missing field without `has()`) counts as violated.

- `message` `(string: "")` - The message returned to the submitter when the rule
  is violated.

The expressions are compiled when the policy is applied; a policy with an
expression that does not compile, or does not return a boolean, is rejected.

## CEL Variables

| Variable | Jobs | Variables writes | Releases |
| --- | --- | --- | --- |
| `job` | The job in its API JSON form (`job.ID`, `job.Namespace`, `job.Meta`, `job.TaskGroups[*].Tasks[*].Driver`, `.Config`, ...) | `null` | `null` |
| `variable` | `null` | The written Variable: `namespace`, `path`, `items`, `create_index`, `modify_index` (no `items` for a delete) | `null` |
| `oldVariable` | `null` | The Variable it replaces or deletes, or `null` | `null` |
| `release` | `null` | `null` | The release with its pack (name, version, registry, digest, signer, signed) |
| `request` | `resource` (`job`), `operation` (`register` or `plan`), `namespace`, `user`, `secrets` | `resource` (`variable`), `operation` (`set` or `delete`), `cas`, `namespace`, `path`, `user` | see [releases](/docs/features/packages/releases) |

`request.user` describes the submitter: `accessor_id`, `name`, `type`
(`client`, `management`, `workload-identity` or `anonymous`), `roles` and
`policies`. `request.secrets` lists every secret the job references, with
`group`, `task`, `source` (`secret`, `template`, `vault` or `vault_template`),
`name`, `provider`, `default_provider`, `effective_provider`, `path`,
`version`, `file_format`, `env` and `optional` (see
[secret delivery](/docs/features/secrets/delivery)).

The standard CEL functions are available, together with the CEL string, set and
list extensions.

## Examples

Require an owner in the job meta, as a warning first:

```hcl
name   = "owner-required"
action = "warn"

rule {
  expression = "has(job.Meta.owner) && job.Meta.owner != ''"
  message    = "Set meta { owner = \"...\" } on the job."
}
```

Validate the Variables of custom object types:

```hcl
name        = "crd-objects"
action      = "deny"
schema_from = "crd-schema"

match {
  resources      = ["variable"]
  variable_paths = ["crd/*"]
}

rule {
  expression = "request.operation == 'delete' || has(variable.items.spec)"
  message    = "CRD objects need a spec item."
}
```
