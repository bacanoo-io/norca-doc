---
title: "Norca Variables"
linkTitle: "Variables"
description: "Learn about the Norca Variables feature"
upstream:
  path: "website/content/docs/concepts/variables.mdx"
---

Most Norca workloads need access to config values or secrets. Norca has a
`template` block to [provide such configuration to tasks](/docs/job-specification/template#norca-variables),
but prior to Nomad 1.4 has left the role of storing that configuration to
external services such as HashiCorp Consul and HashiCorp Vault.

Norca Variables provide the option to store configuration at file-like paths
directly in Norca's state store. You can [access these variables](/docs/job-specification/template#norca-variables) directly from
your task `template`s. The contents of these variables are encrypted
and replicated between servers via raft. Access to variables is controlled by
ACL policies, and tasks have implicit ACL policies that allow them to access
their own variables. You can create, read, update, or delete variables via the
command line, the Nomad API, or in the Norca web UI.

Note that the Variables feature is intended for small pieces of configuration
data needed by workloads. Because writing to the Norca state store uses
resources needed by Norca, it is not well-suited for large or fast-changing
data. For example, do not store batch job results as Variables - these should be
stored in an external database. Variables are also not intended to be a full
replacement for HashiCorp Vault. Unlike Vault, Norca stores the root encryption
key on the servers. See [Key Management][] for details.

## ACL for Variables

Every Variable belongs to a specific Norca namespace. ACL policies can restrict
access to Variables within a namespace on a per-path basis, using a list of
`path` blocks, located under `namespace.variables`. See the [ACL policy
specification] docs for details about the syntax and structure of an ACL policy.

Path definitions may also include wildcard symbols, also called globs, allowing
a single path policy definition to apply to a set of paths within that
namespace. For example, the policy below allows full access to variables at all
paths in the "dev" namespace that are prefixed with "project/" (including child
paths) but only read access to paths prefixed with "system/". Note that the glob
can match an empty string and all other characters. This policy grants read
access to paths prefixed with "system/" but not a path named "system" (without a
trailing slash).

```hcl
namespace "dev" {
  policy       = "write"
  capabilities = ["alloc-node-exec"]

  variables {

    # full access to variables in all "project" paths
    path "project/*" {
      capabilities = ["write", "read", "destroy", "list"]
    }

    # read/list access within a "system/" path belonging to administrators
    path "system/*" {
      capabilities = ["read"]
    }
  }
}
```

The available capabilities for Variables are as follows:

| Capability | Notes                                                                                                                 |
|------------|-----------------------------------------------------------------------------------------------------------------------|
| write      | Create or update Variables at this path. Includes the "list" capability but not the "read" or "destroy" capabilities. |
| read       | Read the decrypted contents of Variables at this path. Also includes the "list" capability                            |
| list       | List the metadata but not contents of Variables at this path.                                                         |
| destroy    | Delete Variables at this path.                                                                                        |

With ACLs enabled, only ACL tokens and workload identities give access to
Variables. The secret
ID of a client node is not an ACL token and is denied, so a script or tool
that reads Variables needs a token with a policy like the one above. See
[client node identity](/docs/concepts/acl#client-node-identity).

## Task Access to Variables

In Nomad 1.4.0 tasks can only access Variables with the [`template`] block. The
[workload identity] for each task grants it automatic read and list access to
Variables found at Norca-owned paths with the prefix `nomad/jobs/`, followed by
the job ID, task group name, and task name. This is equivalent to the following
policy:

```hcl
namespace "$namespace" {
  variables {

    path "nomad/jobs" {
      capabilities = ["read", "list"]
    }

    path "nomad/jobs/$job_id" {
      capabilities = ["read", "list"]
    }

    path "nomad/jobs/$job_id/$task_group" {
      capabilities = ["read", "list"]
    }

    path "nomad/jobs/$job_id/$task_group/$task_name" {
      capabilities = ["read", "list"]
    }
  }
}
```

For example, a task named "redis", in a group named "cache", in a job named
"example", will automatically have access to Variables as if it had the
following policy:

```hcl
namespace "default" {
  variables {

    path "nomad/jobs" {
      capabilities = ["read", "list"]
    }

    path "nomad/jobs/example" {
      capabilities = ["read", "list"]
    }

    path "nomad/jobs/example/cache" {
      capabilities = ["read", "list"]
    }

    path "nomad/jobs/example/cache/redis" {
      capabilities = ["read", "list"]
    }
  }
}
```

You can provide access to additional variables by creating policies associated
with the task's [workload identity][]. For example, to give the task above access
to all variables in the "shared" namespace, you can create the following policy
file:

```hcl
namespace "shared" {
  variables {
    path "*" {
      capabilities = ["read"]
    }
  }
}
```

Then create the policy and associate it with the specific task:

```shell
norca acl policy apply \
   -namespace default -job example -group cache -task redis \
   redis-policy ./policy.hcl
```

Priority of policies and automatic task access to variables is similar to the
[ACL policy namespace rules][]. The most specific rule for a path applies, so a
rule for an exact path in a workload-attached policy overrides the automatic
task access to variables, but a wildcard rule does not.

As an example, consider the job `example` in the namespace `prod`, with a group
`web` and a task named `httpd` with the following policy applied:

```hcl
namespace "*" {
  variables {
    path "nomad/jobs" {
      capabilities = ["list"]
    }

    path "nomad/jobs/*" {
      capabilities = ["deny"]
    }
  }
}
```

The task will have read/list access to its own variables `nomad/jobs/example`,
`nomad/jobs/example/web`, and `nomad/jobs/example/web/httpd` in the namespace
`prod`, because those are more specific than the wildcard rule that denies
access. The task will have list access to `nomad/jobs` in any namespace, because
that path is more specific than the automatic task access to the `nomad/jobs`
variable. And the task will not have access to `nomad/jobs/example` (or below)
in namespaces other than `prod`, because the automatic access rule does not
apply.

See [Workload Associated ACL Policies] for more details.

[Key Management]: /docs/operations/key-management/
[ACL policy specification]: /docs/other-specifications/acl-policy/
[`template`]: /docs/job-specification/template#norca-variables
[workload identity]: /docs/concepts/workload-identity/
[Workload Associated ACL Policies]: /docs/concepts/workload-identity#workload-associated-acl-policies
[ACL policy namespace rules]: /docs/other-specifications/acl-policy#namespace-rules
