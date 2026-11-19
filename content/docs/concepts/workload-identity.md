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

## Children of Parameterized and Periodic Jobs

The allocations of a child job, an instance of a parameterized job made by
[`norca job dispatch`](/docs/commands/job/dispatch) or a launch of a periodic
job, **get the policies associated with the parent**, the group- and
task-scoped ones included, and their workload identity names the parent as its
job.

Dispatching needs only `dispatch-job` in the namespace (forcing a periodic
launch `dispatch-job` or `submit-job`), not the parent's policies. The caller
chooses the dispatch payload and the values of the meta keys the parent
declares; everything else of the child comes from the parent. **Treat the
payload and the meta of a parameterized job with associated policies as
untrusted input** in its tasks, and give `dispatch-job` in its namespace only
to those who may start it. An [admission policy](/docs/features/admission-control)
can narrow dispatch further: its rules see the child job with
`request.operation == "dispatch"`.

A job that is both parameterized and periodic is an exception: dispatching it
makes a periodic child, and the launches of that child have the child as their
parent. **These launches get none of the policies associated with the
parameterized job**, and their workload identity names the dispatched child.

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

## Exec into a Job with Associated Policies

A command started with [`norca alloc exec`](/docs/commands/alloc/exec) runs
with the task's environment and file system, so it can read the task's
workload identity (`NORCA_TOKEN`, `secrets/norca_token`) and act with the
associated policies. **Exec into an allocation of a job with associated
policies (the parent's for a child job) therefore needs a token that holds
every one of them**, by name or through one of its roles, or a management
token, on top of `alloc-exec` (and `alloc-node-exec` for a driver without file
system isolation). Otherwise the exec is refused with `403` and an error that
names the policies the token doesn't hold.

Only the servers know the associated policies and the roles of a token, so
the client asks them before every exec with a token that isn't a management
token, whether the request came to the client directly or through a server.
**When the client can't reach a server, such an exec is refused, whatever
the job**; a management token still works.

[allocation]: /docs/glossary#allocation
[identity-block]: /docs/job-specification/identity/
[plan applier]: /docs/concepts/scheduling/scheduling/
[JSON Web Token (JWT)]: https://datatracker.ietf.org/doc/html/rfc7519
[Task Access to Variables]: /docs/concepts/variables#task-access-to-variables
[List Services API]: /docs/api/services#list-services
[Read Service API]: /docs/api/services#read-service
