---
title: "job Block"
linkTitle: "job"
description: "The \"job\" block is the top-most configuration option in the job specification. A job is a declarative specification of tasks that Norca should run."
upstream:
  path: "website/content/docs/job-specification/job.mdx"
---

**Placement:** `job`

The `job` block is the top-most configuration option in the job specification.
A job is a declarative specification of tasks that Norca should run. Jobs have
one or more task groups, which are themselves collections of one or more tasks.
Job names are unique per region or namespace.

```hcl
job "docs" {
  constraint {
    # ...
  }

  datacenters = ["us-east-1"]

  node_pool = "prod"

  group "example" {
    # ...
  }

  meta {
    my-key = "my-value"
  }

  parameterized {
    # ...
  }

  periodic {
    # ...
  }

  priority = 100

  region = "north-america"

  task "docs" {
    # ...
  }

  update {
    # ...
  }
}
```

## `job` Parameters

- `all_at_once` `(bool: false)` - Controls whether the scheduler can make
  partial placements if optimistic scheduling resulted in an oversubscribed
  node. This does not control whether all allocations for the job, where all
  would be the desired count for each task group, must be placed atomically.
  This should only be used for special circumstances.

- `constraint` <code>([Constraint][constraint]: nil)</code> -
  This can be provided multiple times to define additional constraints. See the
  [Norca constraint reference][constraint] for more
  details.

- `affinity` <code>([Affinity][affinity]: nil)</code> -
  This can be provided multiple times to define preferred placement criteria. See the
  [Norca affinity reference][affinity] for more
  details.

- `spread` <code>([Spread][spread]: nil)</code> - This can be provided multiple times
  to define criteria for spreading allocations across a node attribute or metadata.
  See the [Norca spread reference][spread] for more details.

- `datacenters` `(array<string>: ["*"])` - A list of datacenters in the region
  which are eligible for task placement. This field allows wildcard globbing
  through the use of `*` for multi-character matching. The default value is
  `["*"]`, which allows the job to be placed in any available datacenter.

- `node_pool` `(string: <optional>)` - Specifies the node pool to place the job
  in. The node pool must exist when the job is registered. Defaults to `"default"`.

- `group` <code>([Group][group]: &lt;required&gt;)</code> - Specifies the start of a
  group of tasks. This can be provided multiple times to define additional
  groups. Group names must be unique within the job file.

- `meta` <code>([Meta][]: nil)</code> - Specifies a key-value map that annotates
  with user-defined metadata.

- `name` `(string: <optional>)` - Specifies a name for the job, which otherwise
  defaults to the job ID.

- `migrate` <code>([Migrate][]: nil)</code> - Specifies the groups strategy for
  migrating off of draining nodes. If omitted, a default migration strategy is
  applied. Only service jobs with a count greater than 1 support migrate blocks.

- `namespace` `(string: "default")` - The namespace in which to execute the job.

- `parameterized` <code>([Parameterized][parameterized]: nil)</code> - Specifies
  the job as a parameterized job such that it can be dispatched against.

- `periodic` <code>([Periodic][]: nil)</code> - Allows the job to be scheduled
  at fixed times, dates or intervals.

- `priority` `(int: 50)` - Specifies the job priority which is used to
  prioritize scheduling and access to resources.
  Must be between 1 and [`job_max_priority`] inclusively,
  with a larger value corresponding to a higher priority.
  If value 0 is provided this will fallback to [`job_default_priority`].
  Priority only has an effect when job preemption is enabled.
  It does not have an effect on which of multiple pending jobs is run first.

- `region` `(string: "global")` - The region in which to execute the job.

- `reschedule` <code>([Reschedule][]: nil)</code> - Allows to specify a
  rescheduling strategy. Norca will then attempt to schedule the task on another
  node if any of its allocation statuses become "failed".

- `secrets` <code>([secrets](/docs/job-specification/secrets): nil)</code> - (Norca)
  Sets the default secret provider of the job's secret lookups.

- `type` `(string: "service")` - Specifies the [Norca scheduler][scheduler] to
  use. Norca provides the `service`, `system`, `batch`, and `sysbatch` (new in
  Nomad 1.2) schedulers.

- `update` <code>([Update][update]: nil)</code> - Specifies the task's update
  strategy. When omitted, a default update strategy is applied.

- `vault` <code>([Vault][]: nil)</code> - Specifies the set of Vault policies
  required by all tasks in this job.

- `vault_token` `(string: "")` - Specifies the Vault token that proves the
  submitter of the job has access to the specified policies in the
  [`vault`][vault] block. This field is only used to transfer the token and is
  not stored after job submission.

  > [!CAUTION]
  > It is **strongly discouraged** to place the token as a configuration
  > parameter like this, since the token could be checked into source control
  > accidentally. Users should set the `VAULT_TOKEN` environment variable when
  > running the job instead.

- `consul_token` `(string: "")` - Specifies the Consul token that proves the
  submitter of the job has access to the Service Identity policies associated
  with the job's Consul Connect enabled services. This field is only used to
  transfer the token and is not stored after job submission.

  > [!CAUTION]
  > It is **strongly discouraged** to place the token as a configuration
  > parameter like this, since the token could be checked into source control
  > accidentally. Users should set the `CONSUL_HTTP_TOKEN` environment variable when
  > running the job instead.

## `job` Examples

The following examples only show the `job` blocks. Remember that the
`job` block is only valid in the placements listed above.

### Docker Container

This example job starts a Docker container which runs as a service. Even though
the type is not specified as "service", that is the default job type.

```hcl
job "docs" {
  group "example" {
    task "server" {
      driver = "docker"
      config {
        image = "hashicorp/http-echo"
        args  = ["-text", "hello"]
      }

      resources {
        memory = 128
      }
    }
  }
}
```

### Batch Job

This example job executes the `uptime` command on 10 Norca clients in the fleet,
restricting the eligible nodes to Linux machines.

```hcl
job "docs" {
  type = "batch"

  constraint {
    attribute = "${attr.kernel.name}"
    value     = "linux"
  }

  group "example" {
    count = 10
    task "uptime" {
      driver = "exec"
      config {
        command = "uptime"
      }
    }
  }
}
```

### Consuming Secrets

This example shows a job which retrieves secrets from Vault and writes those
secrets to a file on disk, which the application then consumes. Norca handles
all interactions with Vault.

```hcl
job "docs" {
  group "example" {
    task "cat" {
      driver = "exec"

      config {
        command = "cat"
        args    = ["local/secrets.txt"]
      }

      template {
        data        = "{{ secret \"secret/data\" }}"
        destination = "local/secrets.txt"
      }

      vault {
        policies = ["secret-readonly"]
      }
    }
  }
}
```

When submitting this job, you would run:

```shell
$ VAULT_TOKEN="..." norca job run example.nomad.hcl
```

[affinity]: /docs/job-specification/affinity/ 'Norca affinity Job Specification'
[constraint]: /docs/job-specification/constraint/ 'Norca constraint Job Specification'
[group]: /docs/job-specification/group/ 'Norca group Job Specification'
[meta]: /docs/job-specification/meta/ 'Norca meta Job Specification'
[migrate]: /docs/job-specification/migrate/ 'Norca migrate Job Specification'
[parameterized]: /docs/job-specification/parameterized/ 'Norca parameterized Job Specification'
[periodic]: /docs/job-specification/periodic/ 'Norca periodic Job Specification'
[reschedule]: /docs/job-specification/reschedule/ 'Norca reschedule Job Specification'
[scheduler]: /docs/concepts/schedulers/ 'Norca Scheduler Types'
[spread]: /docs/job-specification/spread/ 'Norca spread Job Specification'
[task]: /docs/job-specification/task/ 'Norca task Job Specification'
[update]: /docs/job-specification/update/ 'Norca update Job Specification'
[vault]: /docs/job-specification/vault/ 'Norca vault Job Specification'
[`job_max_priority`]: /docs/configuration/server#job_max_priority
[`job_default_priority`]: /docs/configuration/server#job_default_priority
