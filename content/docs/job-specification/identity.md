---
title: "identity Block"
linkTitle: "identity"
description: "The \"identity\" block allows tasks to use their Norca Workload Identity via an environment variable or file."
upstream:
  path: "website/content/docs/job-specification/identity.mdx"
---

**Placement:** `job -> group -> task -> identity`

The `identity` block allows a task access to its [Workload Identity][] via an
environment variable or file. By default Norca will create an identity for all
workloads, but it is *not* exposed to a task.

The following will expose the Workload Identity as an environment variable and
file to the task:

```hcl
job "docs" {
  group "example" {
    task "api" {

      identity {
        env  = true
        file = true
      }

      # ...
    }
  }
}
```

## `identity` Parameters

- `env` `(bool: false)` - If true the workload identity will be available in the
  task's `NOMAD_TOKEN` environment variable.
- `file` `(bool: false)` - If true the workload identity will be available in
  the task's filesystem via the path `secrets/nomad_token`. If the
  [`task.user`][taskuser] parameter is set, the token file will only be
  readable by that user. Otherwise the file is readable by everyone but is
  protected by parent directory permissions.

[taskuser]: /docs/job-specification/task#user "Norca task Block"
[Workload Identity]: /docs/concepts/workload-identity/ "Norca Workload Identity"
