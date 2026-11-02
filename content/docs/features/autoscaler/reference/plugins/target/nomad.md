---
title: "Task group and custom object targets"
linkTitle: "Task group"
description: "The built-in autoscaler scales the count of a task group, or the scale of a custom object."
upstream:
  path: "website/content/tools/autoscaling/plugins/target/nomad.mdx"
---

## Task group target

The task group target indicates that the scalable resource is the task group
that holds the `scaling` block. It is the default and needs no configuration:
Norca fills in the namespace, the job and the group when the job is submitted.

A `target` block is only needed to enable a dry run:

```hcl
scaling {
  min = 1
  max = 10

  policy {
    target "nomad-target" {
      dry-run = "true"
    }

    check "cpu" {
      metric   = "nomad.cpu"
      strategy = "target-value"
      target   = 70
    }
  }
}
```

A scaling action changes the `count` of the group through the internal
`Job.Scale` path, as `norca job scale` does: Norca records a scaling event and
creates an evaluation. The existing ACL check of that path is applied with the
autoscaler's own identity, which only has the permission to scale jobs.

The target is read from the state store at every evaluation. The evaluation is
skipped when the job is stopped or missing, or when a deployment of the job is
active and the policy does not allow scaling during deployments.

## Custom object target

A policy can scale a [custom object](/docs/features/operator-framework) instead
of its task group, if the object kind has a
[scale subresource](/docs/features/operator-framework/object-kinds#scale-subresource):

```hcl
group "postgres" {
  scaling {
    engine = "builtin"
    min    = 1
    max    = 7

    policy {
      target "custom-object" {
        kind      = "db.example.com/PostgresCluster"
        name      = "billing"
        namespace = "prod"
      }

      check "cpu" {
        metric   = "nomad.cpu"
        strategy = "target-value"
        target   = 70
      }
    }
  }
}
```

- `kind` `(string: <required>)` - The `group/Kind` reference of the object kind.

- `name` `(string: <required>)` - The name of the object.

- `namespace` `(string: <job namespace>)` - The namespace of the object.
  Ignored for cluster-scoped kinds.

The checks are evaluated on the task group of the policy (typically a group that
the object's controller derives from the object), and the decision is written to
the scale subresource of the object; the controller then derives the group count
from the object. The cooldown and the oscillation protection are derived from
the event log of the object, where every change of the scale is recorded. A
scale up is capped by the namespace quota with the task group as the size of one
replica. Only one `target` block is allowed in a policy.

## Not applicable to Norca

The external autoscaler accepts `Namespace`, `Job` and `Group` in the target
block and an agent level `target` block with `driver = "nomad-target"`. In Norca
the target of a task group policy is always its own group, and the server
configuration has no `target` block.
