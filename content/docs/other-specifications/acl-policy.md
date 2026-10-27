---
title: "ACL Policy Specification"
description: "Learn about Norca's ACL policy specification."
upstream:
  path: "website/content/docs/other-specifications/acl-policy.mdx"
---

The [ACL concepts](/docs/concepts/acl) page describes Norca's Access Control
List (ACL) system. This document is a detailed reference of the expected
policy structure and available options.

ACL policies are written using [HashiCorp Configuration Language
(HCL)][hcl]. The HCL interpreter can also parse JSON to facilitate
machine-generated configuration. A detailed syntax specification for HCL can be
found at [HCL Native Syntax Specification][hcl_syntax_spec].

All content of an ACL policy is case-sensitive.

An ACL policy contains one or more **rules**. Each rule block contains a
combination of `policy` and `capabilities` fields. The specific values permitted
are described for each rule definition below. An example structure of an ACL
policy is as follows:

```hcl
# this is a namespace rule for the "foo" namespace
namespace "foo" {
  policy = "write"                # this is a policy field
  capabilities = ["alloc-exec"]  # this is a capabilities list

  # this block controls access to variables in this namespace
  variables {
    path "project/*" {
      capabilities = ["read", "write"]
    }
  }
}

# this is a namespace rule, with a wildcard label
namespace "*" {
  policy = "read"
}

node {
  policy = "read"
}

agent {
  policy = "read"
}

operator {
  policy = "read"
}

quota {
  policy = "read"
}

# this is a host_volume rule, with a wildcard label
host_volume "*" {
  policy = "read"
}

plugin {
  policy = "write"
}
```

## Namespace Rules

Namespace rules are defined with a `namespace` block. An ACL policy can include
zero, one, or more namespace rules.

Namespace rules control access to APIs in Norca that are namespaced:
[Jobs][api_jobs], [Allocations][api_allocations],
[Deployments][api_deployments], [Evaluations][api_evaluations], [Scaling
Policies][api_scaling_policies], [Services][api_services], and [CSI
Volumes][api_volumes]. Namespace rules also filter items related to the above
APIs from the [Event Stream][api_events] and [Search][api_search] APIs.

Each namespace rule is labeled with the namespace name it applies to. If no
namespace label is specified, the rule will apply to the "default"
namespace. You may use wildcard globs (`"*"`) in the namespace label, to apply a
rule to multiple namespaces.

Only one namespace rule can apply. When an action is checked against the ACL
Policy, the namespace rule is selected by first checking for an _exact match_,
before falling back to a glob-based lookup. When looking up the namespace by
glob, the matching rule with the greatest number of matched characters will be
chosen.

For example the following policy will evaluate to deny for `production-web`,
because it is 9 characters different from the `"*-web"` rule, but 13 characters
different from the `"*"` rule.

```hcl
namespace "*-web" {
  policy = "deny"
}

namespace "*" {
  policy = "write"
}
```

Each namespace rule can include a coarse-grained `policy` field, a fine-grained
`capabilities` field, a `variables` block, or all three.

The `policy` field for namespace rules can have one of the following values:
- `read`: allow the resource to be read but not modified
- `write`: allow the resource to be read and modified
- `deny`: do not allow the resource to be read or modified. Deny takes
  precedence when multiple policies are associated with a token.

In addition to the coarse-grained `policy`, you can provide a fine-grained list
of `capabilities`. This includes:

- `deny` - When multiple policies are associated with a token, deny will take
  precedence and prevent any capabilities.
- `list-jobs` - Allows listing the jobs and seeing coarse grain status.
- `parse-job` - Allows parsing a job from HCL to JSON.
- `read-job` - Allows inspecting a job and seeing fine grain status.
- `submit-job` - Allows jobs to be submitted, updated, or stopped.
- `dispatch-job` - Allows jobs to be dispatched
- `read-logs` - Allows the logs associated with a job to be viewed.
- `read-fs` - Allows the filesystem of allocations associated to be viewed.
- `alloc-exec` - Allows an operator to connect and run commands in running
  allocations.
- `alloc-node-exec` - Allows an operator to connect and run commands in
  allocations running without filesystem isolation, for example, raw_exec jobs.
- `alloc-lifecycle` - Allows an operator to stop individual allocations
  manually.
- `csi-register-plugin` - Allows jobs to be submitted that register themselves
  as CSI plugins.
- `csi-write-volume` - Allows CSI volumes to be registered or deregistered.
- `csi-read-volume` - Allows inspecting a CSI volume and seeing fine grain
  status.
- `csi-list-volume` - Allows listing CSI volumes and seeing coarse grain status.
- `csi-mount-volume` - Allows jobs to be submitted that claim a CSI volume.
- `list-scaling-policies` - Allows listing scaling policies.
- `read-scaling-policy` - Allows inspecting a scaling policy.
- `read-job-scaling` - Allows inspecting the current scaling of a job.
- `scale-job`: Allows scaling a job up or down.
- `sentinel-override` - Accepted so that existing policies keep loading; it has
  no effect.
- `register-external-service` (Norca) - Allows registering, renewing and
  deregistering [external services](/docs/features/service-discovery/external-services).
  It is not part of any policy shorthand and must be granted explicitly.
- `write-intention` (Norca) - Allows creating, updating and deleting the
  [service intentions](/docs/features/native-mtls/intentions) of the namespace.
  It is not part of any policy shorthand and must be granted explicitly; reading
  intentions requires `read-job`.
- `read-network-policy`, `write-network-policy` (Norca) - Allow reading and
  managing the [network policies](/docs/features/network-rules) of the namespace;
  see [Network policies](#network-policies-norca) below.
- `list-secrets`, `read-secret`, `write-secret`, `destroy-secret` (Norca) - The
  capabilities of the [built-in secret store](/docs/features/secrets); see
  [Secrets](#secrets) below.

The coarse-grained policy permissions are shorthand for the following fine-
grained namespace capabilities:

<!-- markdownlint-disable -->

| Policy  | Capabilities                                                                                                                                                                                                                                                    |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deny`  | deny                                                                                                                                                                                                                                                            |
| `read`  | list-jobs<br />parse-job<br />read-job<br />csi-list-volume<br />csi-read-volume<br />list-scaling-policies<br />read-scaling-policy<br />read-job-scaling                                                                                                      |
| `write` | list-jobs<br />parse-job<br />read-job<br />submit-job<br />dispatch-job<br />read-logs<br />read-fs<br />alloc-exec<br />alloc-lifecycle<br />csi-write-volume<br />csi-mount-volume<br />list-scaling-policies<br />read-scaling-policy<br />read-job-scaling<br />scale-job |
| `scale` | list-scaling-policies<br />read-scaling-policy<br />read-job-scaling<br />scale-job                                                                                                                                                                             |

<!-- markdownlint-enable -->

If you provide both a `policy` and `capabilities` list, the capabilities are
merged. For example, the policy below adds the `submit-job` capability to the `read`
policy disposition, which provides the `list-job` and `read-job` capabilities:

```hcl
# Allow reading jobs and submitting jobs, without allowing access
# to view log output or inspect the filesystem
namespace "default" {
  policy       = "read"
  capabilities = ["submit-job"]
}
```

A similar policy could also be expressed as:

```hcl
# Allow reading jobs and submitting jobs, without allowing access
# to view log output or inspect the filesystem
namespace "default" {
  capabilities = ["submit-job","list-jobs","read-job"]
}
```

### Network policies (Norca)

The namespace capabilities `read-network-policy` and `write-network-policy`
control the [network policies](/docs/features/network-rules) of the namespace.
`read-network-policy` is included in the `read` and `write` policies;
`write-network-policy` must be granted explicitly, either in `capabilities` or
with a `network_policy` block, whose `policy` is `read` or `write`:

```hcl
namespace "prod" {
  policy = "read"

  network_policy {
    policy = "write"
  }
}
```

Admin network policies are cluster-wide and need the `operator` rule: `read`
to list and show them, `write` to apply and delete them.

### Custom objects (Norca)

`object` blocks in the `namespace` rule control access to the
[custom objects](/docs/features/operator-framework/object-kinds#permissions) of
an object kind. The block label is the kind reference `<group>/<Kind>`; both
parts may contain globs (`norca.io/*`, `*`). When several blocks match, the most
specific one applies. Each block has a `policy` (`deny`, `read` or `write`), a
list of `capabilities`, or both:

| Capability | Notes |
|------------|-------|
| read | Read, list and watch objects; read their event log and scale. |
| write | Create, update and delete objects (spec and metadata); set the scale. |
| write-status | Write the status of objects. |
| write-events | Write the event log of objects. |
| manage-finalizers | Add and remove finalizers. |
| deny | No permissions on objects of the kind. |

`policy = "read"` grants `read`, and `policy = "write"` grants `read` and
`write`. Objects of cluster-scoped kinds are authorized with the `object` blocks
of the `namespace "*"` rule. Registering and changing object kinds needs the
`operator` rule with `write`.

```hcl
namespace "prod" {
  object "db.example.com/PostgresCluster" {
    capabilities = ["read", "write"]
  }
}

namespace "*" {
  object "db.example.com/*" {
    capabilities = ["read", "write", "write-status", "write-events", "manage-finalizers"]
  }
}
```

### Variables

The `variables` block in the `namespace` rule controls access to
[Variables][]. The variables block is optional, but you can specify only one
variables block per namespace rule.

A `variables` block includes one or more `path` blocks. Each `path` block is
labeled with the path it applies to. You may use wildcard globs (`"*"`) in the
path label, to apply the block to multiple paths in the namespace.

Each path has a list of `capabilities`. The available capabilities for Variables
are as follows:

| Capability | Notes                                                                                                                 |
|------------|-----------------------------------------------------------------------------------------------------------------------|
| write      | Create or update Variables at this path. Includes the "list" capability but not the "read" or "destroy" capabilities. |
| read       | Read the decrypted contents of Variables at this path. Also includes the "list" capability                            |
| list       | List the metadata but not contents of Variables at this path.                                                         |
| destroy    | Delete Variables at this path.                                                                                        |
| deny       | No permissions at this path. Deny takes precedence over other capabilities.                                           |

For example, the policy below allows full access to variables at all paths in
the "dev" namespace that are prefixed with "project/", but only read access to
paths prefixed with "system/". Note that the glob can match an empty string but
all other characters are strictly matched. This policy grants read access to
paths prefixed with "system/" but not a path named "system" (without a trailing
slash). This policy does not grant any other coarse-grained policy or
fine-grained capabilities.

```hcl
namespace "dev" {

  variables {

    # full access to secrets in all "project" paths
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

### Secrets

(Norca) Four namespace capabilities control the secrets of the
[built-in secret store](/docs/features/secrets). None of them is included in
the `read`, `write` or `scale` policies. They can be granted for the whole
namespace in `capabilities`, or for secret paths in `secret` blocks, whose label
is a path that may contain globs, with a list of `capabilities`.

| Capability       | Notes                                                                     |
|------------------|---------------------------------------------------------------------------|
| `list-secrets`   | List secret paths and read their metadata, never values.                  |
| `read-secret`    | Read secret values. Includes `list-secrets`.                              |
| `write-secret`   | Create and update secrets and metadata, soft delete and undelete versions. |
| `destroy-secret` | Destroy versions and whole secrets permanently.                           |
| `deny`           | No permissions at this path. Deny takes precedence.                       |

```hcl
namespace "prod" {
  capabilities = ["list-secrets"]

  secret "db/*" {
    capabilities = ["read-secret"]
  }

  secret "admin/*" {
    capabilities = ["deny"]
  }
}
```

Tasks have no implicit access to secrets. A task reads a secret through a
[`secret_access`](/docs/job-specification/secret_access) grant of its job, or a
policy bound to its job. Submitting a job with `secret_access` requires
`read-secret` on each granted pattern.

## Node rules

The `node` rule controls access to the [Node API][api_node] such as listing
nodes or triggering a node drain. The node rule is optional, but you can specify
only one node rule per ACL Policy.

```hcl
node {
  policy = "read"
}
```

The `policy` field for the node rule can have one of the following values:
- `read`: allow the resource to be read but not modified
- `write`: allow the resource to be read and modified
- `deny`: do not allow the resource to be read or modified. Deny takes
  precedence when multiple policies are associated with a token.

## Node Pools rules

Node pool rules are defined with a `node_pool` block. An ACL policy can
include zero, one, or more node pool rules.

Node pool rule controls access to the [Node Pools API][api_node_pool] such as
create, update, and list node pools.

Each node pool rule is labeled with the node pool name it applies to. You may
use wildcard globs (`"*"`) in the label to apply a rule to multiple node pools.

Similarly to [namespace rules](#namespace-rules) only one `node_pool` rule can
be applied. First an _exact match_ is tried before falling back to a glob-based
lookup, where the rule with the greatest number of matched characters is
chosen.

Each node pool rule can include a coarse-grained `policy` field and a
fine-grained `capabilities` field.

The `policy` field for node pool rules can have one of the following values.

- `read` allows node pools to be listed and read but not modified.
- `write` allows node pools to be read, create, updated, and deleted.
- `deny` forbids node pools to be read or modified. Deny takes precedence when
  multiple policies are associated with a token.

In addition to the coarse-grained `policy`, you can provide a fine-grained list
of `capabilities`.

- `deny` forbids node pools to be read or modified. Deny takes precedence when
  multiple policies are associated with a token.
- `delete` allows node pools to be deleted.
- `read` allows node pools to be listed and read.
- `write` allows node pools to be created and updated.

The coarse-grained policy permissions are shorthand for the following
fine-grained capabilities.

| Policy  | Capabilities              |
| ------- | ------------------------- |
| `deny`  | `deny`                    |
| `read`  | `read`                    |
| `write` | `delete`, `read`, `write` |

If you provide both a `policy` and `capabilities` list the capabilities are
merged. For example, the policy below adds the `write` capability to the `read`
policy, thus allowing `read` and `write` permission but no `delete`.

```hcl
node_pool "dev-*" {
  policy       = "read"
  capabilities = ["write"]
}
```

## Agent rules

The `agent` rule controls access to the [Agent API][api_agent] such as join and
leave. The agent rule is optional, but you can specify only one agent rule per
ACL Policy.

```hcl
agent {
  policy = "read"
}
```

The `policy` field for the agent rule can have one of the following values:
- `read`: allow the resource to be read but not modified
- `write`: allow the resource to be read and modified
- `deny`: do not allow the resource to be read or modified. Deny takes
  precedence when multiple policies are associated with a token.

## Operator rules

The `operator` rule controls access to the [Operator API][api_operator] such
raft or scheduler configuration. The operator rule is optional, but you can
specify only one operator rule per ACL Policy.

```hcl
operator {
  policy = "read"
}
```

The `policy` field for the operator rule can have one of the following values:
- `read`: allow the resource to be read but not modified
- `write`: allow the resource to be read and modified
- `deny`: do not allow the resource to be read or modified. Deny takes
  precedence when multiple policies are associated with a token.

In the example above, the token could be used to query the operator endpoints
for diagnostic purposes but not make any changes.

## Quota rules

The `quota` rule controls access to the [Quota API](/docs/api/quotas) such as quota
creation and deletion. The quota rule is optional, but you can specify only one
quota rule per ACL Policy.

```hcl
quota {
  policy = "read"
}
```

The `policy` field for the quota rule can have one of the following values:
- `read`: allow the resource to be read but not modified
- `write`: allow the resource to be read and modified
- `deny`: do not allow the resource to be read or modified. Deny takes
  precedence when multiple policies are associated with a token.

## Backup rules

(Norca) The `backup` rule controls access to the
[backups](/docs/features/backup-restore) of the region. The backup rule is
optional, but you can specify only one backup rule per ACL Policy.

```hcl
backup {
  policy = "read"
}
```

The `policy` field for the backup rule can have one of the following values:
- `read`: list, inspect, browse and compare backups (without Variables
  values), list restores, and subscribe to the `Backup` event topic. A
  selective restore needs `read` and the normal write permissions of the
  restored objects.
- `write`: the above, plus manual backups, pinning, labeling, deleting
  backups and download URLs.
- `deny`: do not allow the resource to be read or modified. Deny takes
  precedence when multiple policies are associated with a token.

Full restores, their approval and the keyring restore need a management token.

## Host Volume rules

The `host_volume` rule controls access to mounting and accessing [host
volumes][host_volumes]. An ACL Policy can include zero, one, or more host volume
rules.

```hcl
host_volume "*" {
  policy = "write"
}

host_volume "prod-*" {
  policy = "deny"
}

host_volume "prod-ca-certificates" {
  policy = "read"
}
```

Host volume rules are labeled with the volume names that they apply to. As with
namespaces, you may use wildcards to reuse the same configuration across a set
of volumes.

The `policy` field for host volume rules can have one of the following values:
- `read`: allow the resource to be read but not modified
- `write`: allow the resource to be read and modified
- `deny`: do not allow the resource to be read or modified. Deny takes
  precedence when multiple policies are associated with a token.

In addition to the coarse grained policy, host volume rules can include a list
of fine-grained `capabilities`. These include:

- `deny` - Do not allow a user to mount a volume in any way.
- `mount-readonly` - Only allow the user to mount the volume as `readonly`
- `mount-readwrite` - Allow the user to mount the volume as `readonly` or
  `readwrite` if the `host_volume` configuration allows it.

The coarse-grained policy permissions are shorthand for the fine grained
capabilities:

<!-- markdownlint-disable -->

| Policy  | Capabilities                        |
|---------|-------------------------------------|
| `deny`  | deny                                |
| `read`  | mount-readonly                      |
| `write` | mount-readonly<br />mount-readwrite |

<!-- markdownlint-enable -->

When both the policy short hand and a capabilities list are provided, the
capabilities are merged.

> [!WARNING]
> Host Volume policies are applied when attempting to _use_ a volume.
> Regardless of this configuration, users with access to the Node API will be able
> to list available volumes using the `norca node status` command or API call. .

## Plugin rules

The `plugin` rule controls access to [CSI plugins][api_plugins], such as listing
plugins or getting plugin status. The plugin rule is optional, but you can
specify only one plugin rule per ACL policy.

```hcl
plugin {
  policy = "read"
}
```

The `policy` field for the plugin rule can have one of the following values:
- `read`: allow the resource to be read but not modified
- `list`: allow the resource to be listed, but not inspected in detail
- `write`: allow the resource to be read and modified
- `deny`: do not allow the resource to be read or modified. Deny takes
  precedence when multiple policies are associated with a token.

## Configuring ACLs for the web UI

The Norca web UI uses the API endpoints `/v1/agent` and `/v1/node` for nearly
every page. ACL policies for users who will use the Norca UI should include the
following rules.

```hcl
node {
  policy = "read"
}

agent {
  policy = "read"
}
```

[hcl]: https://github.com/hashicorp/hcl
[hcl_syntax_spec]: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
[api_jobs]: /docs/api/jobs/
[api_allocations]: /docs/api/allocations/
[api_deployments]: /docs/api/deployments/
[api_evaluations]: /docs/api/evaluations/
[api_scaling_policies]: /docs/api/scaling-policies/
[api_services]: /docs/api/services/
[api_volumes]: /docs/api/volumes/
[api_events]: /docs/api/events/
[api_search]: /docs/api/search/
[api_agent]: /docs/api/agent/
[api_node]: /docs/api/nodes/
[api_node_pool]: /docs/api/node-pools/
[api_operator]: /docs/api/operator/
[host_volumes]: /docs/configuration/client#host_volume-block
[api_plugins]: /docs/api/plugins/
[Variables]: /docs/concepts/variables/
