---
title: "colocate Block"
linkTitle: "colocate"
description: "The \"colocate\" block places a task group close to the allocations of other jobs (cross-job affinity). Norca addition."
---

**Placement:** `job -> group -> colocate`

The `colocate` block (Norca) places the allocations of a task group close to the
allocations selected by its `selector`, within a topology domain defined by
`scope`. It is either a weighted preference or, with `required = true`, a hard
rule. Its counterpart is the [`separate`](/docs/job-specification/separate)
block. See [Cross-job affinity and anti-affinity](/docs/features/cross-job-affinity)
for how the scheduler evaluates the rules.

```hcl
job "cache" {
  group "redis" {
    # Prefer the node of an "api" allocation.
    colocate {
      selector {
        app = "api"
      }
      scope  = "${node.unique.id}"
      weight = 50
    }
  }
}
```

The block can be repeated. A task group may have at most 8 `colocate` and
`separate` blocks combined.

## `colocate` Parameters

- `selector` `(block or map[string]string: <required>)` - Meta key/value pairs
  that select the allocations to be close to. An allocation matches if the
  merged `meta` of its job and task group (task group values override job
  values) contains every key with the same value. The selector can be written
  as a block, `selector { app = "api" }`, or as an attribute,
  `selector = { "app.kubernetes.io/name" = "api" }`, which also allows keys that
  are not valid HCL identifiers. Keys must not be empty.

- `namespace` `(string: "")` - The namespace in which matching allocations are
  searched. Empty means the namespace of the job. When ACLs are enabled, a
  different namespace requires the `read-job` capability in it at job
  registration.

- `scope` `(string: "${node.unique.id}")` - The topology domain within which an
  allocation counts as close. One of `${node.unique.id}`,
  `${node.unique.name}`, `${node.datacenter}`, `${node.class}`, `${node.pool}`,
  `${attr.<name>}` (for example
  `${attr.platform.aws.placement.availability-zone}`) or `${meta.<name>}` (node
  meta, for example `${meta.rack}`). Nodes without the property never satisfy a
  required rule and get no score from a preference.

- `weight` `(int: 50)` - The preference weight, a non-zero value between -100
  and 100. Nodes whose domain contains a matching allocation get the weight
  added to their score (a negative weight turns the preference around). The
  default applies only to preferences; `weight` must not be set when `required`
  is `true`.

- `required` `(bool: false)` - Makes the rule a feasibility filter: only nodes
  whose domain contains at least one matching allocation are eligible. The
  first allocation of a group that its own required `colocate` rule selects may
  be placed anywhere when nothing matches yet. `system` and `sysbatch` jobs may
  only use required rules.

## `colocate` Examples

### Next to another job on the same node

```hcl
colocate {
  selector {
    app = "test-app"
  }
  scope  = "${node.unique.id}"
  weight = 50
}
```

### Same datacenter, another namespace

```hcl
colocate {
  selector {
    app = "api"
  }
  namespace = "web"
  scope     = "${node.datacenter}"
  weight    = 80
}
```

### Only in racks that run the database

```hcl
colocate {
  selector {
    app  = "postgres"
    role = "primary"
  }
  scope    = "${meta.rack}"
  required = true
}
```

## Notes

- The rule applies only when an allocation is placed. Running allocations are
  not moved when the selected allocations move or stop, and in-place updates
  are not affected.
- The rule is not symmetric: the selected job is not attracted to this one
  unless it has its own rule.
- Allocations placed earlier in the same evaluation count, so a rule selecting
  the job itself also acts between its own instances.
