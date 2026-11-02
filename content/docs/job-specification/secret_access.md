---
title: "secret_access Block"
linkTitle: "secret_access"
description: "The \"secret_access\" block grants the workload identities of a group's or task's tasks read access to secret paths of the built-in store (Norca)."
---

**Placement:**

- `job -> group -> secret_access`
- `job -> group -> task -> secret_access`

The `secret_access` block (Norca) grants the workload identities of tasks `read-secret` and `list-secrets`
on the secret paths that match its pattern, in the job's namespace. A block in a group applies to all tasks
of the group, a block in a task to that task only. The block can be repeated.

Unlike [Variables](/docs/concepts/variables), secrets of the built-in store have no implicit task access:
without a grant (or a policy bound to the job that grants `read-secret`), a task that needs a secret fails
at start with a permission error, and the denied read is recorded in the audit trail.

```hcl
group "web" {
  secret_access {
    path = "${job}/*"
  }

  task "server" {
    secret_access {
      path = "shared/certs/${task}"
    }
  }
}
```

## `secret_access` Parameters

- `path` `(string: <required>)` - A secret path pattern. It may contain globs (`*`) and the placeholders
  `${job}`, `${group}` and, in a task, `${task}`. `${job}` is the parent's ID for dispatched and periodic
  children, which inherit the parent's grants. After the placeholders are replaced, the pattern uses
  letters, digits, `-`, `_`, `~`, `/` and `*`, at most 256 characters, without a leading or double `/`.

## Submitter check

A job never grants its tasks access its submitter doesn't have. When the job is registered or planned,
the submitter's ACL token must hold `read-secret` on each pattern as a whole: no deny rule, and no rule at
least as specific that lacks `read-secret`, may overlap it. `write-secret` alone is not enough, since the
grant hands out read access to the current values. Revert and multiregion registration go through the
same check with the caller's token.

The grant is checked by the servers on every read of a task's workload identity, and only while the
allocation is not terminal.

## `secret_access` Examples

### Secrets below the job's name

```hcl
job "billing" {
  group "api" {
    secret_access {
      path = "${job}/*"
    }
    # The tasks may read billing/db, billing/stripe, ...
  }
}
```

### One secret per task

```hcl
group "workers" {
  task "importer" {
    secret_access {
      path = "jobs/${job}/${group}/${task}"
    }
  }
}
```

See [Delivery to tasks](/docs/features/secrets/delivery) and the [`secret`](/docs/job-specification/secret)
block.
