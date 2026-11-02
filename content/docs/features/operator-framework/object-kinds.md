---
title: "Object kinds and objects"
linkTitle: "Object kinds"
weight: 1
description: "How object kinds define custom types with a JSON Schema, defaults, CEL rules and display columns, and how custom objects are written and read."
---

An **object kind** registers a type of custom object. A **custom object** is an
instance of a kind, with metadata, a `spec` written by users and a `status`
written by controllers. Both are stored in the Raft state of the servers, so
they are part of snapshots and [backups](/docs/features/backup-restore).

## Kinds

A kind is identified by its group and name, written as `<group>/<Kind>`, for
example `norca.io/LoadBalancer`:

- The **group** is a lower case DNS name (`norca.io`, `db.example.com`), at most
  253 characters.
- The **kind** is a CamelCase name that starts with a letter (`LoadBalancer`),
  at most 63 characters.

```hcl {filename="loadbalancer.kind.hcl"}
kind "LoadBalancer" {
  group       = "norca.io"
  description = "Load balancer forwarding to the healthy instances of a Nomad service"
  namespaced  = true
  schema      = file("loadbalancer.schema.json")

  rule {
    expression = "!has(oldSelf) || self.spec.internal == oldSelf.spec.internal"
    message    = "internal can't be changed; delete and recreate the load balancer."
  }

  columns {
    column "Service" { path = "spec.service" }
    column "Port" { path = "spec.port" }
    column "Class" { path = "status.class" }
    column "Addresses" { path = "status.addresses" }
    column "Ready" { path = "status.conditions[?type=='Ready'].status" }
  }
}
```

Registering or changing a kind needs `operator` write. The servers compile the
schema and the rules when the kind is written, and reject the kind if one of
them is invalid. A kind with objects cannot change between namespaced and
cluster-scoped, and cannot be deleted until its objects are gone.

### Namespaced and cluster-scoped kinds

Objects of a namespaced kind (the default) live in a namespace, like jobs.
Objects of a cluster-scoped kind (`namespaced = false`) have no namespace; their
ACL rules are looked up in the `namespace "*"` block of a policy.

### Schema and default values

The `schema` is a JSON Schema (draft 2020-12 unless it declares another
`$schema`) of the whole document `{"spec": ..., "status": ...}`, at most 256 KiB.
The `default` values of the schema are filled in on every write, so the stored
object always shows the complete, effective configuration. The schema of the
LoadBalancer sample (abridged):

```json {filename="loadbalancer.schema.json"}
{
  "type": "object",
  "properties": {
    "spec": {
      "type": "object",
      "required": ["service", "port"],
      "additionalProperties": false,
      "properties": {
        "service":     {"type": "string", "minLength": 1},
        "class":       {"type": "string", "minLength": 1, "default": "nomad"},
        "port":        {"type": "integer", "minimum": 1, "maximum": 65535},
        "internal":    {"type": "boolean", "default": false},
        "replicas":    {"type": "integer", "minimum": 1, "maximum": 16, "default": 1},
        "datacenters": {"type": "array", "items": {"type": "string", "minLength": 1}, "default": ["*"]}
      }
    },
    "status": {
      "type": "object",
      "properties": {
        "observedGeneration": {"type": "integer", "minimum": 0},
        "conditions": {"type": "array"},
        "class":     {"type": "string"},
        "addresses": {"type": "array", "items": {"type": "string"}}
      }
    }
  }
}
```

> [!TIP]
> Describe `status` in the schema and allow the fields the controller SDK
> writes (`observedGeneration`, `conditions`). `norca object-kind lint` reports
> a status schema that rejects them.

### CEL rules

`rule` blocks add checks that a schema cannot express. A rule is violated when
its expression does not evaluate to `true`; the write is then rejected with the
rule's `message`. Rules see these variables:

| Variable | Content |
| --- | --- |
| `self` | The object being written: `kind`, `metadata` (`name`, `namespace`, `labels`, `managedBy`, `generation`, `createIndex`, `modifyIndex`), `spec`, `status`. |
| `oldSelf` | The stored object on an update, `null` on create. `has(oldSelf)` tests whether it exists. |
| `request` | `operation` (`create`, `update`, `status`, `scale` or `migrate`), `namespace`, `dryRun` and `user` (the writer's identity). |

Rules that use `oldSelf` are **transition rules**: they can forbid changes, for
example making a field immutable, or allowing a size only to grow. The
`quantity()` function converts sizes such as `"100GiB"`, `"1.5Gi"`, `"2k"` or
`"500m"` to numbers:

```hcl
rule {
  expression = "!has(oldSelf) || quantity(self.spec.storage) >= quantity(oldSelf.spec.storage)"
  message    = "Storage cannot be reduced."
}
```

The CEL environment is the one of [admission control](/docs/features/admission-control),
with the string, set and list extensions. A kind has at most 64 rules.

### Display columns

`columns` define what `norca object list`, `norca object get` and the web UI
show for the objects of the kind (at most 16). A path selects a field of the
object: dotted names (`spec.version`), list indexes (`spec.users[0]`), all
elements (`spec.users[*].name`) and filters
(`status.conditions[?type=='Ready'].status`).

### Scale subresource

A `scale` block maps a replica count to fields of the object, so the object can
be scaled like a task group, by `norca object scale` or by the
[autoscaler](/docs/features/operator-framework/lifecycle#scale-subresource):

```hcl
scale {
  spec_path   = "spec.replicas"
  status_path = "status.replicas"
}
```

`spec_path` must start with `spec.` and `status_path` with `status.`.

## Objects

An object file names the kind, the object and its spec:

```hcl {filename="web.hcl"}
kind      = "norca.io/LoadBalancer"
name      = "web"
namespace = "default"
labels    = { team = "web" }

spec {
  service = "web"
  port    = 8080
}
```

The stored object has these parts:

| Part | Content | Written by |
| --- | --- | --- |
| Metadata | `ID`, `Name`, `Namespace`, `Labels`, `ManagedBy`, `Owners`, `Finalizers`, `Generation`, `KindVersion`, deletion time and mode, create and modify index and time | the server; writers set labels, `managed_by` and owners, and add finalizers (`manage-finalizers`) |
| `Spec` | The desired state | users, GitOps tools, controllers that create objects |
| `Status` | `observedGeneration`, `conditions` and kind-specific fields | controllers, on the status endpoint (`write-status`) |
| Event log | The last 20 events (`Ready`, `ProvisioningFailed`, `Scaled`) | controllers (`write-events`) and the server |

The `Generation` increases on every change of the spec. A controller copies the
generation it acted on to `status.observedGeneration`; when the two are equal and
the `Ready` condition is `True`, the object is up to date and healthy. The
conditions follow a fixed shape (`type`, `status` of `True`, `False` or
`Unknown`, `reason`, `message`, `lastTransitionTime`); `Ready`, `Progressing`
and `Degraded` are the standard types.

Object names start and end with a letter or digit and may contain `.`, `_` and
`-` in between, at most 128 characters. Labels are indexed, so `norca object
list -label key=value` and `?label=key=value` select objects without reading
all of them. The JSON form of an object is at most 256 KiB.

### Concurrency and dry runs

Every write can carry the expected modify index (`-cas` in the CLI, `cas` in
the API). If the stored object changed since it was read, the write fails with
`409 Conflict` and the writer reads the object again and retries. `-cas=0`
creates an object only if it does not exist yet. Status writes work the same
way; the SDK retries them automatically.

A dry run (`-dry-run`, `dry_run=true`) fills in the defaults, runs the webhooks,
the schema and the rules, and returns the result without writing it.

### Who manages the spec

`managed_by` names the tool or identity that manages the spec. When it names an
identity, only that identity (and management tokens) may update or delete the
object:

| Value | Who may write |
| --- | --- |
| `workload:<namespace>/<job>[/<task>]` | the workload identity of the job (of the task) |
| `role:<name>` | tokens with the ACL role |
| `policy:<name>` | tokens with the ACL policy |
| `token:<accessor ID>` | the token |

Any other value, for example `gitops`, is free text that CEL rules and
admission policies can check. The same identity forms protect the jobs a
controller manages; see [Lifecycle](/docs/features/operator-framework/lifecycle#protection-of-managed-jobs-and-objects).

## Permissions

Object rules are written per namespace and per kind; both can be globs:

```hcl
namespace "prod" {
  object "db.example.com/PostgresCluster" {
    capabilities = ["read", "write"]
  }
}

namespace "*" {
  object "norca.io/*" {
    policy = "read"
  }
}

operator {
  policy = "write"  # register and change kinds
}
```

| Capability | Allows |
| --- | --- |
| `read` | reading, listing and watching objects, reading the event log and the scale |
| `write` | creating, updating and deleting objects (spec and metadata), setting the scale |
| `write-status` | writing the status |
| `write-events` | writing the event log |
| `manage-finalizers` | adding and removing finalizers |
| `deny` | nothing: denies every operation |

`policy = "read"` grants `read`, `policy = "write"` grants `read` and `write`.
Reading a kind needs `operator` read or any object capability on it.

## Watching changes

Changes of kinds and objects are published on the `CustomObject` topic of the
[event stream](/docs/features/event-stream), with the event types
`ObjectKindUpserted`, `ObjectKindDeleted`, `CustomObjectUpserted`,
`CustomObjectStatusUpdated`, `CustomObjectDeleted` and
`CustomObjectEventRecorded`. Subscribe with the key `<group>/<Kind>` (globs such
as `norca.io/*` are allowed) or `<group>/<Kind>/<name>`:

```shell
$ curl "http://127.0.0.1:4646/v1/event/stream?topic=CustomObject:norca.io/LoadBalancer"
```

## Reference

- [Object kind specification](/docs/other-specifications/object-kind) and
  [custom object specification](/docs/other-specifications/custom-object)
- [`norca object-kind`](/docs/commands/object-kind) and [`norca object`](/docs/commands/object) commands
- [Object kinds HTTP API](/docs/api/object-kinds) and [objects HTTP API](/docs/api/objects)
