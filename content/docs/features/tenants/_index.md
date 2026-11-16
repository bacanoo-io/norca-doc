---
title: "Tenants"
linkTitle: "Tenants"
description: "One object for a team: its namespace, quota, ACL policies and roles, network isolation and the names it may ask certificates for, kept by the servers."
weight: 50
---

## What and why

**A `Tenant` object is everything a team gets in one place.** You write the
object once; the servers create and keep its namespace, the quota of the
namespace, an ACL policy and an ACL role for each role of the team, the
network rule that isolates the namespace, and the names the namespace may ask
[certificates](/docs/features/certificates) for.

- **Built in.** The operator runs in the servers, on the leader. Nothing has
  to be installed, and it upgrades with the servers.
- **Kept as written.** A change made by hand to a resource of the tenant, for
  example the description of its namespace or the rules of one of its
  policies, is set back, and the tenant records it as an event.
- **Never takes what is not its own.** A namespace, quota, policy or role of
  the same name that exists already is left alone unless the tenant is told
  to adopt it; a resource of a [release](/docs/features/packages) is never
  taken.
- **Deleted in order.** Deleting a tenant waits until its namespace has no
  jobs and no volumes, then removes what the tenant created.

`Tenant` is a kind of the group `norca.io`, registered by the servers. It is
cluster scoped: a tenant is not inside a namespace, it makes one. It is a
[custom object](/docs/features/operator-framework): written with
[`norca object apply`](/docs/commands/object/apply), read with
`norca object get`, listed in the web UI.

How a tenant works together with a load balancer, DNS records and the names
of services inside the cluster is shown step by step in the
[example](/docs/features/tenants/example).

## An example

```hcl
kind = "norca.io/Tenant"
name = "team-a"

spec {
  namespace {
    description = "Team A"
    meta = {
      cost-center = "4711"
    }
  }

  quota {
    region "global" {
      cpu    = 8000
      memory = 16384
    }
  }

  roles {
    developer = ["submit-job", "read-logs", "alloc-exec", "read-secret"]
    viewer    = ["read-job"]
  }

  network {
    isolation             = "namespace"
    allow_from_namespaces = ["ingress"]
  }

  certificate_dns_suffixes = ["team-a.example.com"]
  certificate_issuers      = ["letsencrypt"]
  dns_suffixes             = ["team-a.example.com"]
}
```

```shell-session
$ norca object apply team-a.hcl
$ norca object get norca.io/Tenant team-a
```

The tenant above makes:

| Resource | Name | What it holds |
| --- | --- | --- |
| Namespace | `team-a` (the tenant's name, or `namespace.name`) | the description and meta, the quota, the certificate metadata |
| Quota | `team-a` | the limits of each region block |
| ACL policy and ACL role | `team-a-developer`, `team-a-viewer` | one policy per role, and a role that links it |
| Network policy | `tenant-isolation` in the namespace | traffic in from the namespace itself and from `ingress` only |

Give a person a role by linking their token to it:

```shell-session
$ norca acl token create -name="alice" -role-name="team-a-developer"
```

## The spec

| Field | Default | Meaning |
| --- | --- | --- |
| `namespace.name` | the tenant's name | the namespace; it can't be changed later, and two tenants can't share one |
| `namespace.description`, `namespace.meta` | | written to the namespace |
| `quota.region "<region>"` | no quota | the limits per region: `cpu` (MHz), `memory`, `memory_max` (MB), `allocations`, `variables_mb` |
| `quota.description`, `quota.enforce` | `schedule` | as in a [quota](/docs/features/quotas) |
| `roles.<role>` | | a list of [namespace capabilities](/docs/other-specifications/acl-policy) in the namespace |
| `roles.<role> { capabilities, policy }` | | the same, plus a full ACL policy for what capabilities can't say |
| `network.isolation` | `none` | `namespace`: only the namespace itself and `allow_from_namespaces` may connect to its allocations |
| `network.allow_from_namespaces` | | the other namespaces that may connect |
| `certificate_dns_suffixes`, `certificate_ip_addresses`, `certificate_issuers` | | what the namespace may ask certificates for (written as its `norca.io/certificate-*` metadata) |
| `dns_suffixes` | | the names [norca-dns](/docs/features/dns-records) may write for the namespace (written as its `norca.io/dns-suffixes` metadata) |
| `adopt` | | resource types the tenant takes over when one of its name exists: `namespace`, `quota`, `acl-policy`, `acl-role`, `network-policy` |

The names of the tenant and of its roles may hold letters, digits and
dashes only, because the names of the resources are made from them.

A role with a policy:

```hcl
roles {
  operator {
    capabilities = ["submit-job", "alloc-lifecycle"]
    policy       = <<EOF
node {
  policy = "read"
}
EOF
  }
}
```

The policy is taken as written: a policy can grant more than the namespace of
the tenant, which is why writing a tenant is an operator's right (see
[Who may write a tenant](#who-may-write-a-tenant)).

## Status

`norca object get norca.io/Tenant team-a` shows:

- `status.namespace` and `status.resources`: what the tenant created, with
  their types and names (the roles also with their IDs);
- `status.conflicts`: the resources it found and did not take;
- the conditions:

| Condition | True when |
| --- | --- |
| `Ready` | every resource is as the spec says |
| `Conflict` | a resource of the tenant's name exists that the tenant did not create, or that belongs to a release or to another tenant; it is left alone, and with the namespace in conflict nothing else is created |
| `NamespaceNotEmpty` | the tenant is being deleted and its namespace still has jobs or volumes |
| `Degraded` | a write failed; it is tried again |

The events of the tenant (`norca object events norca.io/Tenant team-a`) say
what was `Created`, `Updated` (set back after a change by hand), `Adopted`
and `Deleted`.

## Taking over what exists

A namespace (or quota, policy, role, network policy) with the name a tenant
wants that the tenant did not create is a conflict. To let the tenant take it
over and change it to the spec, name its type in `adopt`:

```hcl
spec {
  namespace {
    name = "payments"
  }
  adopt = ["namespace"]
}
```

A resource that a release manages is never taken over, and a release can't
take over what a tenant created: `norca pack` refuses it, also with
`-take-ownership`.

## Deleting

```shell-session
$ norca object delete norca.io/Tenant team-a
```

The tenant stays (with the condition `NamespaceNotEmpty`) until its namespace
has no jobs and no CSI volumes; stop and purge them first. Then the servers
delete the network policy, the roles, the policies, the namespace and, last,
the quota the namespace named. Resources the tenant did not create stay.

## Who may write a tenant

A tenant makes ACL policies and roles with the rights of the servers, so
**writing one is as strong as a management token.** It takes the right to
write objects of the kind `norca.io/Tenant`, which only a management token
has unless an operator of the cluster grants it knowingly. `Tenant` is
cluster scoped, so the rule is an `object` block of the `namespace "*"` rule:

```hcl
namespace "*" {
  object "norca.io/Tenant" {
    capabilities = ["read", "write"]
  }
}
```

The status of a tenant is written by the servers only.

## Limits

- **Tenants are written in the authoritative region.** Namespaces, ACL
  policies and roles are replicated from there; a tenant written in another
  region is refused. With more than one region this means:
  - the network policy `tenant-isolation` is created in the authoritative
    region only (network policies are regional): the namespace of a tenant is
    isolated there, not in the other regions;
  - the `Tenant` objects live in the authoritative region only: while it is
    cut off they can't be read or changed elsewhere (the namespaces, quotas,
    policies and roles they made keep working in every region), and if it is
    lost, they are lost with it. Write them again in the new authoritative
    region with `adopt = ["namespace", "quota", "acl-policy", "acl-role",
    "network-policy"]` to take over what they made.
- **With ACLs off** the roles are not created (`Ready` with the reason
  `RolesNotCreated`).
- **A namespace with Variables or secrets** may refuse to be deleted; the
  tenant reports the error as an event and tries again.

## See also

- [Example: a team with a load balancer and DNS names](/docs/features/tenants/example):
  a tenant, a service behind a load balancer, a DNS record and the names
  inside the cluster, from start to finish
- [Quotas](/docs/features/quotas)
- [Network rules](/docs/features/network-rules)
- [Certificates](/docs/features/certificates): what the namespace of a tenant
  may ask for
- [Operator framework](/docs/features/operator-framework)
