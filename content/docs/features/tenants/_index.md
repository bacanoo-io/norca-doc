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
  What it adopted is given back as the tenant found it.

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
| `quota.region "<region>"` | no quota | the limits per region: `cpu` (MHz), `memory`, `memory_max` (MB), `allocations`, `variables_mb`. Without a `quota` block the tenant leaves the quota its namespace names alone: none in a namespace it created (unless set by hand), whatever it names in one it took over. A `quota` block removed from a living tenant takes the tenant's quota off the namespace again |
| `quota.description`, `quota.enforce` | `schedule` | as in a [quota](/docs/features/quotas) |
| `roles.<role>` | | a list of [namespace capabilities](/docs/other-specifications/acl-policy) in the namespace |
| `roles.<role> { capabilities, objects, policy }` | | the same, plus the rights on [custom objects](/docs/features/operator-framework) in the namespace and a full ACL policy for what these can't say |
| `network.isolation` | `none` | `namespace`: only the namespace itself and `allow_from_namespaces` may connect to its allocations, on the same node (see [Network isolation](#network-isolation)) |
| `network.allow_from_namespaces` | | the other namespaces that may connect |
| `network.allow_from_cidrs` | | IP prefixes that may connect: the node subnet for the tenant's own allocations on other nodes, the addresses of a load balancer (see [Network isolation](#network-isolation)). Needs `isolation = "namespace"` |
| `network.required` | `true` | `false` places groups also on nodes that can't enforce the isolation (host networking, nodes without nftables), with warnings: the `best_effort` enforcement of a [network rule](/docs/features/network-rules). Needs `isolation = "namespace"` |
| `certificate_dns_suffixes`, `certificate_ip_addresses`, `certificate_issuers` | | what the namespace may ask certificates for (written as its `norca.io/certificate-*` metadata) |
| `dns_suffixes` | | the names [norca-dns](/docs/features/dns-records) may write for the namespace (written as its `norca.io/dns-suffixes` metadata) |
| `adopt` | | resource types the tenant takes over when one of its name exists: `namespace`, `quota`, `acl-policy`, `acl-role`, `network-policy` |
| `release_without_restore` | `false` | release what the tenant took over as it is, instead of writing back what it found: the way out when a resource can't be given back (see [Deleting](#deleting)). It can be set on a tenant that is being deleted |

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

**`allow_from_cidrs` lets traffic from other nodes in.** List the subnet of
the nodes to admit the tenant's own allocations on other nodes and the
proxies of a load balancer, or only the addresses of the load balancer. A
prefix admits whatever arrives with an address in it: with the node subnet,
any allocation on any other node, of any namespace, can connect. Where that
is too wide, protect the services with
[native mTLS and service intentions](/docs/features/native-mtls), which check
the identity of the caller across nodes.

```hcl
network {
  isolation             = "namespace"
  allow_from_namespaces = ["ingress"]
  allow_from_cidrs      = ["10.0.0.0/24"] # the subnet of the nodes
  required              = false           # place host networked groups too
}
```

**The rule is required by default:** a group that can't be isolated, for
example one with host networking, is not placed in the namespace. With
`required = false` it is placed with a warning, and the rule is enforced
where it can be.

## Status

`norca object get norca.io/Tenant team-a` shows:

- `status.namespace` and `status.resources`: what the tenant created or
  adopted, with their types and names (the roles also with their IDs). A
  resource is listed before the tenant creates it; until it is known to
  exist it has `pending: true` and `creating`, a fingerprint of what the
  tenant is creating. A pending entry is a claim on the name, not ownership:
  a resource of that name that turns up and does not hold what the tenant
  was creating was made by somebody else, and is a `Conflict` unless its
  type is in `adopt` (then it is adopted, with its `original` saved). A
  resource the tenant took over has
  `adopted: true` and `original`: what it held when the tenant took it, in
  the fields a tenant writes (the table below). Both stay while the tenant
  lists the resource, also when `adopt` leaves the spec. Both go when the
  resource is deleted by hand and the tenant makes it again: it is then the
  tenant's own, and is deleted with it;
- `status.conflicts`: the resources it found and did not take;
- the conditions:

| Condition | True when |
| --- | --- |
| `Ready` | every resource is as the spec says |
| `Conflict` | a resource of the tenant's name exists that the tenant did not create, or that belongs to a release or to another tenant, or that a release operation is writing at that moment (until a later pass finds it free), or that holds too much to be given back (more than 32 KiB for one resource, 128 KiB for all adopted resources of a tenant); it is left alone, and with the namespace or the quota in conflict nothing else is created |
| `NamespaceNotEmpty` | the tenant is being deleted and its namespace still has jobs, volumes, variables or objects |
| `RestoreFailed` | a resource the tenant took over can't be given back as the tenant found it; the message says what is missing |
| `Degraded` | a write failed; it is tried again |

What `original` holds of an adopted resource:

| Type | Saved |
| --- | --- |
| `namespace` | the description, the metadata, the quota it named |
| `quota` | the description, `enforce`, the limits per region |
| `acl-policy` | the description, the rules |
| `acl-role` | the description, the names of the policies it linked |
| `network-policy` | the description and the whole policy |

The events of the tenant (`norca object events norca.io/Tenant team-a`) say
what was `Created`, `Updated` (set back after a change by hand), `Adopted`,
`Deleted`, `Restored` (an adopted resource given back as the tenant found
it), `Released` (an adopted resource let go as it is, or one that no longer
exists; also the list of what a deleted tenant gives back) and
`RestoreFailed` (giving a resource back failed; it is tried again).

**What somebody else writes meanwhile is never overwritten.** Each write of
the tenant is a check-and-set on what its pass read: a resource is created
only while it still does not exist, and changed only while it is as the pass
read it. When somebody else creates a resource of the tenant's name, or
changes one the tenant created or adopted, between the tenant's read and its
write, the write is refused and that pass shows a write failure: a
`WriteFailed` event, `Degraded`, and `Ready` false. The next pass reads again
and settles: a resource made by somebody else is a `Conflict`, or is adopted
when its type is in `adopt`; a resource the tenant created or adopted is
written from the new read, so what was changed meanwhile in the fields a
tenant does not write (for example the task driver capabilities of a
namespace) is kept. Giving an adopted resource back is written the same way,
so `RestoreFailed` can show for a moment for the same reason; it is tried
again.

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

The same holds for a resource made by hand while the tenant could not
create its own (a creation that kept failing): it is a conflict, or with its
type in `adopt` it is taken over and later given back, not deleted.

> **Taking a resource over is a loan.** The tenant saves what the resource
> holds before it changes it. While the tenant lives, the resource is kept
> to the spec like one the tenant created. When the resource leaves the
> spec, or the tenant is deleted, it is given back as the tenant found it
> (event `Restored`). The tenant never deletes it.

A resource that a release manages is never taken over, and a release can't
take over what a tenant created: `norca pack` refuses it, also with
`-take-ownership`.

**One resource has one owner.** Each pass claims, on the leader, the
resources the tenant wants before it looks at who owns them, and holds the
claims until its status is written; a release operation claims the
resources of its pack the same way (see
[releases](/docs/features/packages/releases#install-upgrade-rollback-uninstall)).
A resource that a release operation is writing while the pass runs is a
`Conflict` for that pass (`... is being written by release "apps/web"`): the
tenant does not take it, keeps it if it lists it already, and a later pass
looks again. A resource the tenant lists that a release owns all the same
is dropped from the tenant's list and is not deleted: it is the release's,
and the pass shows it as a `Conflict` (`... belongs to the release apps/web`).

## Deleting

```shell-session
$ norca object delete norca.io/Tenant team-a
```

The tenant stays (with the condition `NamespaceNotEmpty`, which says what is
left) until its namespace has no jobs, no CSI volumes, no variables and no
objects of namespaced kinds (certificates, load balancers, DNS records,
releases); stop and purge the jobs and delete the rest first. Nothing is
deleted while the tenant waits. Then the servers delete the namespace, its
network policy, the roles, the policies and, last, the quota the namespace
named. The namespace goes first: if its deletion is refused, nothing else of
the tenant is deleted and the tenant waits again, so the namespace keeps its
isolation and the people of the tenant can still empty it. The tenant holds
the finalizer `norca.io/operators` until then; only the servers or a
management token can remove it.

**Only what the tenant created is deleted; what it adopted is given back.**
Each adopted resource (`adopted: true` in `status.resources`) is set back to
its `original` and stays. The resources left in conflict, which the tenant
never took, stay as they are. For an adopted namespace this means:

- the tenant does not wait for it to empty: it is not going to delete it;
- its description and metadata are as before the tenant, so the certificate
  and DNS allow lists the tenant wrote are gone; a namespace that names the
  quota of the tenant names again the quota it named before, or none;
- the network policy, the roles, the policies and the quota the tenant
  created for it are deleted.

A namespace the tenant created is deleted also when it names an adopted
quota; the quota is given back. One event `Released` of the tenant, and a
line in the log of the servers, list what is given back. **The events of the
deleted tenant stay listable** (`norca object events norca.io/Tenant team-a`)
for
[`object_tombstone_gc_threshold`](/docs/configuration/server#object_tombstone_gc_threshold)
(5 minutes by default); the line in the log of the servers stays.

**When a resource can't be given back**, for example because the quota an
adopted namespace named was deleted meanwhile, or a policy an adopted role
linked, the tenant stays, with the condition `RestoreFailed`, which says
what is missing, and tries again. Either put back what is missing, or set
`release_without_restore = true` in the spec of the tenant, which can be
written also while the tenant is being deleted. The adopted resources are
then released as they are (event `Released`), and a quota the tenant
created that such a namespace still names stays with it.

### Handing a namespace to another tenant

Two tenants can't share a namespace, and a second tenant can't adopt it
while the first one lists it. Delete the first tenant: it gives the
namespace back as it found it. Then write the second one with `adopt =
["namespace"]`; it saves what it finds and changes the namespace to its
spec.

What does not change hands by itself: the jobs, volumes and variables of
the namespace stay as they are. The roles and policies the first tenant
created are deleted with it; the ones it had adopted are given back, not
deleted, so tokens of those roles keep working until the roles are removed
by hand.

### Cleaning up by hand what a tenant gave back

If the resources a deleted tenant gave back are not needed, delete them with
a management token, in this order:

```shell-session
$ norca network-policy delete -namespace payments tenant-isolation
$ norca namespace delete payments
$ norca acl role list
$ norca acl role delete <role ID>
$ norca acl policy delete payments-developer
$ norca quota delete payments
```

The namespace has to be empty to be deleted, and a quota can be deleted
only when no namespace names it. After `release_without_restore` a
namespace can still name the quota the tenant created: to keep the
namespace and delete that quota, take the quota off first: `norca namespace
apply -quota "" payments`.

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
    this way took the resources over as they found them: when they are
    deleted, the resources stay, in that state.
- **With ACLs off** the roles are not created (`Ready` with the reason
  `RolesNotCreated`).
- **Jobs of the namespace in another region** are not seen by the wait: the
  deletion of the namespace is refused while they run. The tenant reports
  the error as the event `DeleteFailed` and tries again; its network
  policy, roles and policies stay meanwhile.
- **Something written into the namespace while the tenant is being
  deleted** (a job, a variable, an object) makes the deletion of the
  namespace fail: the event `DeleteFailed` has the reason, nothing else is
  deleted, and the tenant waits with `NamespaceNotEmpty` again.
- **With more than one region and ACLs, the servers of the authoritative
  region need a [`replication_token`](/docs/configuration/acl) too.** To
  delete the namespace of a tenant, the leader asks every other region for
  the jobs of the namespace, with the replication token: the secret of a
  global management token. **Without it the leader does not ask:** its own
  credentials never leave the region. The deletion fails in the
  authoritative region, the namespace is never deleted, and the event
  `DeleteFailed` says to set `replication_token` in the `acl` block of the
  servers of the region, naming the region that could not be asked. The
  same message comes when another region refuses the token.
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
