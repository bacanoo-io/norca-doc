---
title: "Workload Identity"
description: "Learn about Norca's workload identity feature"
upstream:
  path: "website/content/docs/concepts/workload-identity.mdx"
---

Every workload running in Norca is given an identity. When an [allocation][] is
accepted by the [plan applier][], the leader generates a Workload Identity for
each task in the allocation. This workload identity is a [JSON Web Token
(JWT)][] that has been signed by the leader's keyring. The workload identity
includes the following identity claims:

```json
{
  "nomad_namespace": "default",
  "nomad_job_id": "example",
  "nomad_allocation_id": "5c6328f7-48c5-4d03-bada-91ef2e904d0d",
  "nomad_task": "web"
}
```

## Using Workload Identity

While Norca always creates and uses workload identities internally, **the JWT is
not exposed to tasks by default.**

To expose Workload Identity to tasks, add an [`identity`][identity-block] block
to your jobspec:

```hcl
task "example" {

  identity {
    # Expose Workload Identity in NORCA_TOKEN env var
    env = true

    # Expose Workload Identity in ${NORCA_SECRETS_DIR}/norca_token file
    file = true
  }

}
```

## Default Workload ACL Policy

By default, a Workload Identity has access to an implicit ACL policy. This policy
grants access to Norca Variables associated with the job, group, and task, as
described in [Task Access to Variables][]. The implicit policy also allows
access to list or read the Norca service registrations of the workload's own
namespace, as with the [List Services API][] or [Read Service API][]. **The
services of other namespaces need `read-job` there from the workload's
associated policies.**

## Workload Associated ACL Policies

You can associate additional ACL policies with workload identities by passing
the `-job`, `-group`, and `-task` flags to `norca acl policy apply`. When Norca
resolves a workload identity claim, it will automatically include policies that
match. **If no matching policies exist, the workload identity does not have any
additional capabilities.** The `bus` and `cdc` rules of these policies apply
when the task connects to the
[system bus](/docs/features/system-bus#consuming-the-events) with its identity,
and when it reads the changes of the region
([change data capture](/docs/features/change-data-capture)).

For example, to allow a workload access to secrets from the namespace "shared",
you can create the following policy file:

```hcl
namespace "shared" {
  variables {
    path "*" {
      capabilities = ["read"]
    }
  }
}
```

{{< tabs >}}
{{< tab name="Task" >}}

You can then apply this policy to a specific task:

```shell
norca acl policy apply \
   -namespace default -job example -group cache -task redis \
   redis-policy ./policy.hcl
```

{{< /tab >}}
{{< tab name="Group" >}}

You can also apply this policy to all tasks in the group by omitting the `-task`
flag:

```shell
norca acl policy apply \
   -namespace default -job example -group cache \
   redis-policy ./policy.hcl
```

{{< /tab >}}
{{< tab name="Job" >}}

And you can apply this policy to all groups in the job by omitting both the
`-group` and `-task` flag:

```shell
norca acl policy apply \
   -namespace default -job example \
   redis-policy ./policy.hcl
```

{{< /tab >}}
{{< /tabs >}}

A policy applied with `-job` matches **the exact job ID**: a policy for the job
`example` is not granted to a job `example-2` or `ex`. It is granted to every
allocation of the job, whoever registered the job.

## Changing a Job with Associated Policies

**A registration that changes a job with associated policies needs a token
that holds every one of them**, whatever group or task they name: each
policy named in the token, or in one of its roles. A management token may
always change the job. Otherwise the registration is refused with `403` and
an error that names the policies the token doesn't hold. The rule covers
every way a job is registered:

- `norca job run` and the [register API](/docs/api/jobs#create-job), with any
  change: tasks, meta, datacenters, node pool, constraints, or `Stop`;
- [`norca job revert`](/docs/commands/job/revert);
- a release install, upgrade or rollback
  ([release permissions](/docs/features/packages/releases#permissions));
- a selective [backup restore](/docs/commands/operator/backup/restore) of
  the job, which registers it with the caller's token.

**Registering the job exactly as it is needs none of the policies.** A team
may therefore upgrade a release that an operator installed, as long as the
upgrade leaves the job unchanged. A workload identity holds the policies
associated with its own job, group and task, so a task may register its job
again when every policy associated with the job applies to it.

The first registration of a job ID that already has associated policies
needs them too: applying a policy with `-job` before the job exists doesn't
hand the policy to whoever registers that ID first. A registration that
changes a child of a parameterized or periodic job is checked against the
policies associated with the parent. `norca job stop`,
`norca job scale` and `norca job plan` need only their usual capabilities.

[allocation]: /docs/glossary#allocation
[identity-block]: /docs/job-specification/identity/
[plan applier]: /docs/concepts/scheduling/scheduling/
[JSON Web Token (JWT)]: https://datatracker.ietf.org/doc/html/rfc7519
[Task Access to Variables]: /docs/concepts/variables#task-access-to-variables
[List Services API]: /docs/api/services#list-services
[Read Service API]: /docs/api/services#read-service
