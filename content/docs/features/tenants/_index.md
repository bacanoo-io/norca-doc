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
  jobs, volumes, variables or objects, then removes what the tenant created.
  What it adopted stays.

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
| `roles.<role> { capabilities, objects, policy }` | | the same, plus the rights on [custom objects](/docs/features/operator-framework) in the namespace and a full ACL policy for what these can't say |
| `network.isolation` | `none` | `namespace`: only the namespace itself and `allow_from_namespaces` may connect to its allocations, on the same node (see [Network isolation](#network-isolation)) |
| `network.allow_from_namespaces` | | the other namespaces that may connect |
| `certificate_dns_suffixes`, `certificate_ip_addresses`, `certificate_issuers` | | what the namespace may ask certificates for (written as its `norca.io/certificate-*` metadata) |
| `dns_suffixes` | | the names [norca-dns](/docs/features/dns-records) may write for the namespace (written as its `norca.io/dns-suffixes` metadata) |
| `adopt` | | resource types the tenant takes over when one of its name exists: `namespace`, `quota`, `acl-policy`, `acl-role`, `network-policy` |

The names of the tenant and of its roles may hold letters, digits and
dashes only, because the names of the resources are made from them.

A role with rights on objects and a policy:

```hcl
roles {
  operator {
    capabilities = ["submit-job", "alloc-lifecycle"]
    objects = {
      "norca.io/LoadBalancer" = ["read", "write"]
      "norca.io/DNSRecord"    = ["read"]
    }
    policy = <<EOF
node {
  policy = "read"
}
EOF
  }
}
```

**`objects`** maps a kind, written `<group>/<Kind>` (globs as in an
[ACL policy](/docs/other-specifications/acl-policy), for example
`example.com/*`), to a list of object capabilities. Each entry becomes an
`object` block of the rule of the tenant's namespace, so the rights hold in
that namespace only and never reach cluster scoped kinds. A role with
`objects` and no `capabilities` has no namespace capability at all: its
people can work with the objects of the named kinds, and can't read the jobs
or anything else of the namespace.

**`policy`** is taken as written: a policy can grant more than the namespace
of the tenant, which is why writing a tenant is an operator's right (see
[Who may write a tenant](#who-may-write-a-tenant)).

## Network isolation

With `isolation = "namespace"` the tenant writes the network policy
`tenant-isolation`, which lets into the allocations of the namespace only the
allocations of the namespace itself and of `allow_from_namespaces`.

> **Allocations are matched on the same node only.** A
> [network rule](/docs/features/network-rules) knows the allocations of a
> namespace on the node where it is applied; traffic from another node
> arrives through a host port with the address of the sending node, not of
> an allocation. An isolated namespace therefore admits the allocations of
> the allowed namespaces that run on the same node, and the node itself. A
> load balancer on another node, and the tenant's own allocations on other
> nodes, are dropped.

## Status

`norca object get norca.io/Tenant team-a` shows:

- `status.namespace` and `status.resources`: what the tenant created or
  adopted, with their types and names (the roles also with their IDs). A
  resource is listed before the tenant creates it; until it is known to
  exist it has `pending: true`. A resource the tenant took over has
  `adopted: true`; the mark stays while the tenant lists the resource, also
  when `adopt` leaves the spec;
- `status.conflicts`: the resources it found and did not take;
- the conditions:

| Condition | True when |
| --- | --- |
| `Ready` | every resource is as the spec says |
| `Conflict` | a resource of the tenant's name exists that the tenant did not create, or that belongs to a release or to another tenant; it is left alone, and with the namespace or the quota in conflict nothing else is created |
| `NamespaceNotEmpty` | the tenant is being deleted and its namespace still has jobs, volumes, variables or objects |
| `Degraded` | a write failed; it is tried again |

The events of the tenant (`norca object events norca.io/Tenant team-a`) say
what was `Created`, `Updated` (set back after a change by hand), `Adopted`,
`Deleted` and `Released` (an adopted resource the tenant let go, left as it
is).

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

> **An adopted resource outlives the tenant.** While the tenant lives, the
> resource is kept to the spec like one the tenant created. The tenant never
> deletes it: when it leaves the spec it is released as it is (event
> `Released`), and when the tenant is deleted it stays. See
> [Deleting](#deleting) for what is taken off an adopted namespace.

A resource that a release manages is never taken over, and a release can't
take over what a tenant created: `norca pack` refuses it, also with
`-take-ownership`.

## Deleting

```shell-session
$ norca object delete norca.io/Tenant team-a
```

The tenant stays (with the condition `NamespaceNotEmpty`, which says what is
left) until its namespace has no jobs, no CSI volumes, no variables and no
objects of namespaced kinds (certificates, load balancers, DNS records,
releases); stop and purge the jobs and delete the rest first. Nothing is
deleted while the tenant waits. Then the servers delete the network policy,
the namespace, the roles, the policies and, last, the quota the namespace
named: the roles and the policies stay until the namespace is gone, so the
people of the tenant can still empty it.

**Only what the tenant created is deleted.** The resources it adopted
(`adopted: true` in `status.resources`) and the ones left in conflict, which
it never took, stay. For an adopted namespace this means:

- the tenant does not wait for it to empty: it is not going to delete it;
- the network policy, the roles and the policies the tenant created for it
  are deleted;
- the certificate and DNS allow lists the tenant wrote into its metadata
  are removed (`norca.io/certificate-dns-suffixes`,
  `norca.io/certificate-ip-addresses`, `norca.io/certificate-issuers`,
  `norca.io/dns-suffixes`); the description and the other metadata stay;
- it keeps the quota it names, also one the tenant created, which then
  stays as well: the namespace does not lose its limit.

A namespace the tenant created is deleted also when it names an adopted
quota; the quota stays. One event `Released` of the tenant, and a line in
the log of the servers (the events go with the object), list what is left
in place.

### Cleaning up by hand what a tenant left

If the resources a deleted tenant left are not needed, delete them with a
management token, in this order:

```shell-session
$ norca network-policy delete -namespace payments tenant-isolation
$ norca namespace delete payments
$ norca acl role list
$ norca acl role delete <role ID>
$ norca acl policy delete payments-developer
$ norca quota delete payments
```

The namespace has to be empty to be deleted, and a quota can be deleted
only when no namespace names it. To keep the namespace and delete its
quota, take the quota off first: `norca namespace apply -quota "" payments`.

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
    "network-policy"]` to take over what they made. Tenants written again
    this way leave these resources in place when they are deleted.
- **With ACLs off** the roles are not created (`Ready` with the reason
  `RolesNotCreated`).
- **Jobs of the namespace in another region** are not seen by the wait: the
  deletion of the namespace is refused while they run. The tenant reports
  the error as the event `DeleteFailed` and tries again; its roles and
  policies stay meanwhile.
- **With more than one region and ACLs, the servers of the authoritative
  region need a [`replication_token`](/docs/configuration/acl) too.** To
  delete the namespace of a tenant, the leader asks every other region for
  the jobs of the namespace, with the replication token: the secret of a
  global management token. Without it the other region refuses the
  question, the namespace is never deleted, and the event `DeleteFailed`
  says to set `replication_token` in the `acl` block of the servers of the
  region, naming the region that refused.
- **Isolation matches allocations on the same node only**, see
  [Network isolation](#network-isolation).

## See also

- [Example: a team with a load balancer and DNS names](/docs/features/tenants/example):
  a tenant, a service behind a load balancer, a DNS record and the names
  inside the cluster, from start to finish
- [Quotas](/docs/features/quotas)
- [Network rules](/docs/features/network-rules)
- [Certificates](/docs/features/certificates): what the namespace of a tenant
  may ask for
- [Operator framework](/docs/features/operator-framework)
