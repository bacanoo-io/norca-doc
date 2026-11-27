---
title: "Permissions"
linkTitle: "Permissions"
weight: 14
description: "The ACL rights Rigger needs: releases, the resources of a release, jobs with bound policies, revisions, registries and their credentials, installs and stacks on the servers, operations and their logs, bundles; with example policies for a team and for an operator of the cluster."
---

With ACLs enabled, **Rigger grants nothing of its own: every resource of a release is written with the
caller's token**, through the normal endpoint of its type, with admission and quotas. Someone who can't
write ACL policies can't install a module that contains one. Releases, registries, operations and
revisions are custom objects of the group `rigger.norca.io`, so their rights are
[object capabilities](/docs/other-specifications/acl-policy) of their kind.

## What each operation needs

| Operation | Needs |
| --- | --- |
| `release list`, `release status`, `release history`, `stack status` | object `read` on `rigger.norca.io/Release` in the namespace |
| Read the content of a revision (`/revision/:n`) | object `read` on `rigger.norca.io/Release` and `read-job` in the namespace |
| `install`, upgrade, `release rollback`, `stack apply` (each release) | object `write` on `rigger.norca.io/Release`, **and the right to write every resource of the release**, hook jobs included (below) |
| A plan (`stack plan`, `?plan=true`) | object `write` on `rigger.norca.io/Release`; a resource the token may not write is shown as `Permission denied` |
| `release uninstall`, `stack destroy` | object `write` on `rigger.norca.io/Release`, and the right to delete every resource |
| Run the tests of a release | object `write` on `rigger.norca.io/Release` |
| `--adopt`, taking resources from other releases | object `write` on `rigger.norca.io/Release` in the namespace of every release a resource is taken from |
| `registry list`, `registry status`, `registry search`, a module or stack detail, an icon | object `read` on `rigger.norca.io/Registry` (namespace `*`); for a registry with an `authSecret`, also read on that Variable (but for listing and reading the object) |
| `registry sync`, `select`, `unselect`, writing a registry | object `write` on `rigger.norca.io/Registry`, and read on the Variable of its `authSecret` |
| `install --server` of a registry module | Release `write`, Registry `read`, and read on the Variable of the registry's `authSecret` |
| `install --server` of `builtin/<name>` or of files | Release `write` only |
| `stack plan/apply/status/destroy --server` | Release `write`; for a published stack, or one that takes anything from a registry or a bundle, also Registry `read` and read on the `authSecret` Variable of every private registry it uses |
| `operation cancel` | object `write` on `rigger.norca.io/Release` in the namespace of the stack |
| `operation follow`, the log of an operation | object `read` on `rigger.norca.io/Operation` in the namespace |
| `bundle import --server`, deleting a bundle | object `write` on `rigger.norca.io/Registry` |
| Listing bundles | object `read` on `rigger.norca.io/Registry` |
| A stack's `secrets.hcl` and generated values | `read-secret` and `write-secret` in the namespace of the stack: the secrets of `secrets.hcl` and `rigger/stacks/<stack>/generated` are created in its secret store |

**Without the right to write every resource, an install, upgrade or rollback is refused with `403`
before anything is applied**: no release and no revision is created. There is one exception: a
namespace, quota, ACL policy, object kind, admission policy or external service that the release
**owns already** and that the new revision leaves **unchanged** needs no right, so a team can upgrade a
release that an operator installed with such resources as long as it leaves them as they are.

## The resources of a release

| Resource | Writing it needs |
| --- | --- |
| Namespace | a management token |
| ACL policy | a management token |
| Quota | `quota { policy = "write" }` |
| Variable | `write` on its path (`read` too, when the release adopts it without writing) |
| Object kind | `operator { policy = "write" }` |
| Admission policy | `admission { policy = "write" }` |
| External service | `register-external-service` in its namespace; `operator:write` for a static one; `node` write for one with `checked_by` |
| Custom object | object `write` on its kind in its namespace (`namespace "*"` for cluster-scoped kinds) |
| Job | `submit-job` in its namespace |

**A job with ACL policies bound to it** (the `job_acl` of a policy) needs more than `submit-job` when
the release creates or changes it: the token must hold every policy bound to the job, by name or
through a role, or be a management token. The error names the missing policies. An upgrade that leaves
the job exactly as it is needs none of them.

**The release marks of a job are protected:** registering a job with new or changed `pack.release` or
`pack.release_namespace` meta needs release `write` in the namespace they name, so a job submitted with
`submit-job` alone can't pass for a hook or a job of a release.

## Example policies

A team that installs and upgrades the modules of its namespace, from the registries of the cluster:

```hcl
namespace "shop" {
  policy       = "write"                  # submit-job, read-job, ... for the jobs of the modules
  capabilities = ["read-secret", "write-secret"]   # secrets.hcl and generated values of stacks

  object "rigger.norca.io/Release" {
    capabilities = ["read", "write"]
  }
  object "rigger.norca.io/Operation" {
    capabilities = ["read"]
  }

  variables {
    path "*" {
      capabilities = ["read", "write", "list"]
    }
  }
}

namespace "*" {
  object "rigger.norca.io/Registry" {
    capabilities = ["read"]
  }
}
```

An operator of the cluster who keeps the registries and syncs them adds `write` on
`rigger.norca.io/Registry`, and read on the Variables the `authSecret` of each private registry names.
Modules that create namespaces or ACL policies (the operator modules of the
[Norca registry](/docs/rigger/norca-registry)) need a management token.

## Admission

Beyond ACLs, an [admission policy](/docs/features/admission-control) with `resources = ["release"]`
decides which releases are admitted in its namespaces: by their signatures (`trusted_keys`), and by CEL
rules over `release.pack.*`, for example `release.pack.serverRendered` to admit only modules the servers
fetched and evaluated themselves. See
[signatures in protected namespaces](/docs/rigger/releases#signatures-in-protected-namespaces).
