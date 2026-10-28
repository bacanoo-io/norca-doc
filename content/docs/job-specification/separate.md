---
title: "separate Block"
linkTitle: "separate"
description: "The \"separate\" block places a task group away from the allocations of other jobs (cross-job anti-affinity). Norca addition."
---

**Placement:** `job -> group -> separate`

The `separate` block (Norca) places the allocations of a task group away from
the allocations selected by its `selector`: outside every topology domain
(`scope`) that already contains one. It is either a weighted preference or, with
`required = true`, a hard rule. Its counterpart is the
[`colocate`](/docs/job-specification/colocate) block. See
[Cross-job affinity and anti-affinity](/docs/features/cross-job-affinity) for how
the scheduler evaluates the rules.

```hcl
job "db" {
  meta {
    app = "postgres"
  }

  group "replica" {
    count = 3

    # Never two replicas in the same datacenter (availability zone).
    separate {
      selector {
        app = "postgres"
      }
      scope    = "${node.datacenter}"
      required = true
    }
  }
}
```

The block can be repeated. A task group may have at most 8 `colocate` and
`separate` blocks combined.

## `separate` Parameters

The parameters are the same as those of [`colocate`](/docs/job-specification/colocate#colocate-parameters):

- `selector` `(block or map[string]string: <required>)` - Meta key/value pairs
  that select the allocations to keep away from, matched against the merged
  `meta` of their job and task group.

- `namespace` `(string: "")` - The namespace in which matching allocations are
  searched. Empty means the namespace of the job.

- `scope` `(string: "${node.unique.id}")` - The topology domain:
  `${node.unique.id}`, `${node.unique.name}`, `${node.datacenter}`,
  `${node.class}`, `${node.pool}`, `${attr.<name>}` or `${meta.<name>}`.

- `weight` `(int: 50)` - The preference weight, a non-zero value between -100
  and 100. Nodes whose domain contains a matching allocation get the weight
  subtracted from their score. Must not be set when `required` is `true`.

- `required` `(bool: false)` - Makes the rule a feasibility filter: only nodes
  whose domain contains no matching allocation are eligible. `system` and
  `sysbatch` jobs may only use required rules.

## `separate` Examples

### Spread the instances of a job over datacenters, as a preference

With a selector that matches the job itself, `separate` spreads the job's own
instances. A preference still places the instances when there are more of them
than datacenters (from `example/packs/test-app` with
`separate_scope = "$${node.datacenter}"`):

```hcl
job "test-app" {
  meta {
    app = "test-app"
  }

  group "web" {
    separate {
      selector {
        app = "test-app"
      }
      scope    = "${node.datacenter}"
      required = false
    }
  }
}
```

### Keep away from another team's batch jobs

```hcl
separate {
  selector = { "workload-class" = "batch-heavy" }
  namespace = "analytics"
  scope     = "${node.unique.id}"
  weight    = 100
}
```

## Notes

- With `required = true` and fewer domains than instances, the remaining
  instances cannot be placed. The evaluation is blocked, and
  `norca job status` lists the rule (for example
  `separate {app=postgres} by ${node.datacenter}`) among the filters.
- The rule applies only at placement time and is not symmetric.
