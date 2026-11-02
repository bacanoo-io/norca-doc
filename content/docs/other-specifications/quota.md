---
title: "Quota Specification"
description: "The HCL format of Norca quota specifications."
---

Quota specifications limit the resources of the namespaces they are attached to,
per region (see [namespace quotas](/docs/features/quotas)). They are written as
HCL files and submitted with [`norca quota apply`](/docs/commands/quota/apply),
or as JSON with `norca quota apply -json` and the
[quota HTTP API](/docs/api/quotas). `norca quota init` writes an example file.

Like [namespace specifications](/docs/other-specifications/namespace), quota
specifications do not support HCL2 features like functions.

Example quota specification:

```hcl
name        = "default-quota"
description = "Limit the shared default namespace"

# Create a limit for the global region. Additional limits may
# be specified in-order to limit other regions.
limit {
  region = "global"
  region_limit {
    cpu        = 2500
    memory     = 1000
    memory_max = 1000
  }
  variables_limit = 1000
  allocations     = 100
}

# Resources filled in for tasks that do not set them.
task_defaults {
  cpu    = 100
  memory = 256
}

# Maximum resources a single task may request.
task_max {
  cpu    = 1000
  memory = 1000
}

# "schedule" places allocations up to the limit and blocks the rest,
# "submit" also rejects jobs whose total demand exceeds the limit.
enforce = "schedule"
```

A quota is attached to a namespace with the `quota` parameter of the
[namespace specification](/docs/other-specifications/namespace) or with
`norca namespace apply -quota <name> <namespace>`.

## Quota Specification Parameters

- `name` `(string: <required>)` - The name of the quota. It must match
  `^[a-zA-Z0-9-_]{1,128}$` and be unique.

- `description` `(string: "")` - An optional human-readable description, at most
  256 characters.

- `limit` <code>([Limit](#limit-parameters): nil)</code> - The limit of one
  region. May be repeated, at most once per region. A region without a `limit`
  block is not limited.

- `task_defaults` <code>([Task resources](#task_defaults-and-task_max-parameters): nil)</code> -
  Resources filled in at job submission for tasks that do not set them.

- `task_max` <code>([Task resources](#task_defaults-and-task_max-parameters): nil)</code> -
  The maximum resources a single task may request. A job with a task above the
  maximum is rejected at submission.

- `enforce` `(string: "schedule")` - The enforcement mode:
  - `schedule` - Jobs are always accepted. The scheduler places allocations up
    to the limit; the remaining placements wait as a blocked evaluation until
    quota is freed.
  - `submit` - In addition, `norca job plan` and `norca job run` reject a job
    whose total demand (the count multiplied by the resources of every task
    group) would by itself exceed the limit of the region. System and sysbatch
    jobs are not checked.

### `limit` Parameters

- `region` `(string: <required>)` - The region the limit applies to.

- `region_limit` <code>(block: nil)</code> - The limit of the sum of the
  reserved resources of all non-terminal allocations in the namespaces of the
  quota. Only these parameters are allowed:
  - `cpu` `(int: 0)` - CPU in MHz. Reserved `cores` count toward this limit,
    converted to MHz with the CPU data of their node.
  - `memory` `(int: 0)` - Memory in MB, compared with the reserved `memory` of
    the tasks.
  - `memory_max` `(int: 0)` - Memory in MB, compared with the `memory_max` of
    the tasks (their `memory` if `memory_max` is not set).

- `variables_limit` `(int: 0)` - The maximum total size of the Variables of the
  namespaces of the quota, in MB. A Variables write that would exceed it is
  rejected.

- `allocations` `(int: 0)` - (Norca) The maximum number of non-terminal
  allocations.

For every limit, `0` means unlimited and a negative value disallows any usage.
Disk, network and device resources are not supported in `region_limit`.

### `task_defaults` and `task_max` Parameters

- `cpu` `(int: 0)` - CPU in MHz. In `task_defaults` it is only filled in for
  tasks that reserve neither `cpu` nor `cores`.

- `cores` `(int: 0)` - Only in `task_max`: the maximum number of reserved cores.

- `memory` `(int: 0)` - Memory in MB.

- `memory_max` `(int: 0)` - The `memory_max` in MB. In `task_defaults` it is
  only filled in if it is not lower than the memory of the task.

A task resource equal to the built-in default (`cpu = 100`, `memory = 300`) is
treated as not set, because jobs submitted through the HTTP API carry these
defaults. A zero value in `task_max` means no maximum. The values of
`task_defaults` must not be negative and must not exceed `task_max`.

## JSON form

The JSON form uses the field names of the API:

```json
{
  "Name": "default-quota",
  "Description": "Limit the shared default namespace",
  "Limits": [
    {
      "Region": "global",
      "RegionLimit": {
        "CPU": 2500,
        "MemoryMB": 1000,
        "MemoryMaxMB": 1000
      },
      "VariablesLimit": 1000,
      "Allocations": 100
    }
  ],
  "TaskDefaults": {
    "CPU": 100,
    "MemoryMB": 256
  },
  "TaskMax": {
    "CPU": 1000,
    "MemoryMB": 1000
  },
  "Enforce": "schedule"
}
```
