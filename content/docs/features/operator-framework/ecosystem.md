---
title: "Operator ecosystem"
linkTitle: "Ecosystem"
weight: 4
description: "Operator packs, admission webhooks bound to a kind, schema versions with CEL migrations, per-kind limits, and offline checks with norca object-kind lint."
---

The tools on this page help when operators are written and installed by teams
other than the cluster administrators: packaging, validation that needs code,
evolving schemas, and protection of the servers from a misbehaving controller.

## Operator packs

There is no separate operator format: an operator is a pack of the
[extended pack format](/docs/features/packages/releases). One release installs,
upgrades, rolls back and uninstalls everything the operator needs, in a fixed
order: the ACL policy, the object kind (with its webhooks, schema version,
migration and limits), admission policies, custom objects, and the controller
job. Uninstalling runs in the reverse order.

The reference operator pack is `loadbalancer-operator` in the
[Norca pack registry](https://github.com/bacanoo-io/norca-registry):

| Template | Resource |
| --- | --- |
| `controller.acl.hcl.tpl` | ACL policy bound to the controller job (`job_acl`): jobs, the proxy jobs' Variables, the leases, and the `norca.io/LoadBalancer` objects |
| `loadbalancer.kind.hcl.tpl` | The kind: JSON Schema with defaults, a CEL transition rule, display columns, optional webhooks, limits |
| `service-marks.admission.hcl.tpl` | Admission policy: services marked with `norca_lb_port` must name a valid port (optional) |
| `controller.nomad.tpl` | The controller job (two instances with leader election) and the optional webhook task |

```shell
$ norca pack plan ./packs/loadbalancer-operator
$ norca pack run ./packs/loadbalancer-operator --name=lb
$ norca pack status lb
$ norca pack uninstall lb
```

The pack states what it needs from the servers in `metadata.hcl`, and the
servers reject the release if they can't provide it:

```hcl {filename="metadata.hcl"}
pack {
  name    = "loadbalancer-operator"
  version = "0.1.0"

  requires {
    norca    = ">= 0.1.0"
    features = ["releases", "custom-objects", "admission-cel", "object-webhooks", "object-limits"]
  }
}
```

Applying a release grants no extra permissions: the token needs `operator`
write for the kind, `acl` write for the policy and the admission permissions
for admission policies. A kind can only be deleted when it has no objects, so
delete the objects first (the controller removes their resources through the
finalizer) and then uninstall the release.

`norca operator init` generates such a pack for a new operator, in
`pack/<name>/` of the project.

## Type-bound webhooks

Some checks need code: whether a class is offered by a provider of the region,
whether a referenced external resource exists. A kind can bind admission
webhooks that review the writes of its objects:

```hcl
webhook "default" {
  mode           = "default"
  url            = "https://lb-webhook.internal:8443/default"
  ca_cert        = file("ca.pem")
  failure_policy = "fail"
}

webhook "validate" {
  mode           = "validate"
  url            = "https://lb-webhook.internal:8443/validate"
  ca_cert        = file("ca.pem")
  operations     = ["create", "update", "delete"]
}
```

On a create or update the server runs, in order:

1. the schema defaults;
2. the **defaulting** webhooks (`mode = "default"`), which may change the spec
   with a JSON patch (changes outside the spec are rejected); the defaults are
   filled in again and the generation recomputed;
3. the schema and the CEL rules;
4. the **validating** webhooks (`mode = "validate"`), which accept or reject
   the write. They can also review deletions when `delete` is listed in
   `operations`.

Status, finalizer, event log and scale writes are not reviewed.

The webhooks receive an `AdmissionReview` document (`api_version =
"admission.norca.io/v1"`) with `resource = "object"`, the `operation`, the
`user`, the `object_kind`, and the `object` and `old_object` in the form CEL
rules see them. They answer with `allowed`, an optional `message`, `warnings`
and, for defaulting webhooks, a `patch`. The `controller/webhook` package of the
SDK implements the protocol:

```go
mux := http.NewServeMux()
mux.Handle("/validate", webhook.Validating(func(ctx context.Context, req *webhook.Request) ([]string, error) {
	var spec Spec
	if err := req.Object.DecodeSpec(&spec); err != nil {
		return nil, err
	}
	return nil, spec.Validate() // a non-nil error denies the write
}))
mux.Handle("/default", webhook.Defaulting(func(ctx context.Context, req *webhook.Request, spec map[string]any) ([]string, error) {
	if _, ok := spec["class"]; !ok {
		spec["class"] = "nomad"
	}
	return nil, nil
}))
return webhook.ListenAndServeTLS(ctx, ":8443", "cert.pem", "key.pem", mux)
```

- Webhooks are called over **https only**. The CA comes from the kind
  (`ca_cert`, usually provided by the pack); without it the system roots are
  used. No client certificate is sent.
- **Failure policy:** with `fail` (the default), a write fails with `403` when
  the webhook can't be called, returns an invalid response, or is not approved.
  With `ignore`, such failures become warnings and the write goes ahead.
- Each call has a `timeout` (default `5s`, at most `30s`). A kind has at most 8
  webhooks.
- Failed calls are counted in the `nomad.custom_object.webhook.failures`
  metric.

### Approval

Registering a general admission webhook is reserved for the server
configuration. A type-bound webhook is limited to one kind, but its URL still
receives every write of that kind, so the servers call it only after an
administrator approved it:

- A kind written with a management token (or with ACLs disabled) approves its
  webhooks at once.
- A kind written by another token with `operator` write leaves its webhooks
  pending, with a warning. A management token approves them with
  [`norca object-kind webhook approve`](/docs/commands/object-kind/webhook-approve)
  and can revoke the approval with
  [`norca object-kind webhook revoke`](/docs/commands/object-kind/webhook-revoke).
- An approval covers the whole configuration of the webhook (URL, CA, mode,
  operations, timeout, failure policy). Any change needs a new approval;
  unchanged webhooks keep theirs when the kind is updated or rolled back.

`norca object-kind inspect` shows each webhook with its approval.

## Schema versions and migrations

A kind has one stored version. To change the schema in a way that existing
objects would not satisfy, raise `version` and add a `migration` that converts
the stored objects:

```hcl
version = 2

migration {
  spec = "self.spec.omit(['port']).merge({'ports': [self.spec.port]})"
}
```

- `spec` and `status` are CEL expressions that return the new spec or status as
  a map. They see `self` (the stored object), `fromVersion` and `toVersion`.
  Maps have two helpers: `m.merge(other)` adds or replaces entries, and
  `m.omit(["a", "b"])` removes keys. An empty `spec` keeps the spec; an empty
  `status` keeps the status, and a `status` that returns an empty map drops it
  (the controller writes it again).
- The version starts at 1 and can never be lowered.
- Every kind write that changes the schema, the rules, the version or the
  migration checks all stored objects (migration for objects at an older
  version, defaults, schema validation). A write that would leave stored
  objects invalid is rejected with `409`. Violations of new CEL rules are only
  warnings.
- `norca object-kind apply -dry-run` (`PUT /v1/object-kind/:group/:kind/plan`)
  returns the report: how many objects were checked, how many are at an older
  version, how many change, which would be invalid and why, and before and after
  samples.
- After the write, the leader migrates the objects in the background, in batches
  of 200 with check-and-set; the generation increases when the spec changes.
  Writes to an object not yet migrated migrate it first. An object whose
  migration fails gets a `MigrationFailed` warning event and is retried only
  when it or the kind changes. The `nomad.custom_object.migrated` metric counts
  migrated objects.

Each object records the schema version it was last written or migrated at
(`KindVersion`).

## Limits

A kind can limit the load its objects put on the servers:

```hcl
limits {
  write_rate                = 50
  write_burst               = 100
  identity_write_rate       = 10
  identity_write_burst      = 20
  max_objects_per_namespace = 100
  max_watches_per_identity  = 10
}
```

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `write_rate` | number | `0` (no limit) | Writes per second of all identities, for the whole kind. |
| `write_burst` | number | `1` | Burst of `write_rate`. |
| `identity_write_rate` | number | `0` (no limit) | Writes per second of each identity (token or workload identity). |
| `identity_write_burst` | number | `1` | Burst of `identity_write_rate`. |
| `max_objects_per_namespace` | number | `0` (no limit) | Objects of the kind per namespace (cluster-scoped kinds: in total); limits creation. |
| `max_watches_per_identity` | number | `0` (no limit) | Concurrent blocking queries (list or get with an index) of each identity, per server. |

The rates are token buckets on the leader and cover every object write: spec,
status, finalizers, events, scale and deletion. The identity bucket is checked
first, so a controller stuck in a loop is throttled before it uses up the budget
of the users. Over a limit, a request fails with `429 Too Many Requests`; the SDK
reports it as `ErrThrottled` (`IsThrottled`) and retries with backoff. The
`nomad.custom_object.throttled` metric counts rejected requests. Without a
`limits` block, there are no limits.

## Checking kinds offline

[`norca object-kind lint`](/docs/commands/object-kind/lint) compiles the schema,
the rules and the migration of a kind like the servers do, without contacting
them, and validates sample objects against it:

```shell
$ norca object-kind lint loadbalancer.kind.hcl examples/web.hcl
```

Besides errors, it warns about deviations from the framework's conventions: a
missing description, a schema that does not describe `spec` or `status`, a
status schema that rejects the fields the SDK writes, webhooks without
`ca_cert` or with a loopback URL or `failure_policy = "ignore"`, a migration
without a raised version, and an `identity_write_rate` higher than `write_rate`.

## Web UI

The [web UI](/docs/features/web-ui) has an Objects page and a Type definitions
page. The object list shows the columns of the kind, the health from the
conditions, the scale and the generation against the observed generation. The
object page shows the spec, status, conditions, event log, labels, finalizers,
owners and what the object owns, and offers editing (validated against the
schema with a dry run) and deletion with a propagation mode. The type definition
page shows the schema, rules, columns, migration, limits and webhooks with their
approval state.

## Reference

- [Object kind specification](/docs/other-specifications/object-kind)
- [`norca object-kind apply`](/docs/commands/object-kind/apply),
  [`lint`](/docs/commands/object-kind/lint),
  [`webhook approve`](/docs/commands/object-kind/webhook-approve)
- [Object kinds HTTP API](/docs/api/object-kinds)
- [Packages and releases](/docs/features/packages/releases)
