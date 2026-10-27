---
title: "Network Policy Specification"
linkTitle: "Network Policy"
description: "The file format of Norca network policies and admin network policies."
---

Norca network policies and admin network policies (see
[network rules](/docs/features/network-rules)) are written as HCL files and
submitted with [`norca network-policy apply`](/docs/commands/network-policy/apply)
(with `-admin` for admin policies). The files are plain HCL without functions
or variables. With `-json`, the command reads the
[API JSON form](/docs/api/network-policies) instead.

Example network policy:

```hcl
name        = "db-only-from-api"
namespace   = "prod"
description = "PostgreSQL: only the API connects, only HTTPS out"

selector {
  app = "postgres"
}

ingress {
  name = "from-api"
  from {
    selector {
      app = "api"
    }
  }
  ports = ["5432/tcp"]
}

egress {
  to {
    cidr = ["10.20.0.0/16"]
  }
  ports = ["443/tcp"]
}

enforcement = "required"   # or "best_effort"
```

Example admin network policy:

```hcl
name       = "no-metadata-service"
priority   = 10
namespaces = ["*"]

egress {
  name   = "metadata"
  action = "deny"    # "allow", "deny" or "pass"
  to {
    cidr = ["169.254.169.254/32"]
  }
}
```

## Network Policy Parameters

- `name` `(string: <required>)` - The name of the policy. Must match
  `[a-zA-Z0-9-_]{1,128}` and be unique in the namespace (or among the admin
  policies).

- `namespace` `(string: "")` - The namespace of a network policy. Empty means
  the namespace given with `-namespace` (or `NOMAD_NAMESPACE`); the namespace
  must exist. Not valid in admin policies.

- `description` `(string: "")` - A human-readable description, up to 1024
  characters.

- `selector` <code>(block: &lt;optional&gt;)</code> - String attributes that
  select allocations: every key must appear with the same value in the merged
  `meta` of the allocation's job and task group (task group values override job
  values). Without a selector, the policy selects every allocation of its
  namespace (or, for admin policies, of the matching namespaces). Up to 32
  keys.

- `ingress` <code>([Rule](#rule-parameters): &lt;optional&gt;)</code> - An
  allowed (or, in admin policies, decided) incoming traffic rule. Can be
  repeated, up to 64 rules. Ingress rules use `from` blocks.

- `egress` <code>([Rule](#rule-parameters): &lt;optional&gt;)</code> - An
  outgoing traffic rule. Can be repeated, up to 64 rules. Egress rules use `to`
  blocks.

- `default_deny` `(array<string>: [])` - Directions (`"ingress"`, `"egress"`)
  that a network policy isolates even without rules in them, for example
  `default_deny = ["ingress"]` to deny all incoming traffic of the selected
  allocations. Not valid in admin policies (use a `deny` rule).

- `enforcement` `(string: "required")` - `"required"`: the selected allocations
  are only placed on nodes that can enforce the rules (attribute
  `norca.network_policy.nftables = true`, bridge or CNI network mode), and an
  allocation fails if its rules cannot be applied. `"best_effort"`: allocations
  are placed anyway; job registration warns about task groups whose network
  mode cannot enforce the rules, and the client emits a
  `Network Policy Not Enforced` task event when applying them fails.

A network policy needs at least one `ingress` or `egress` rule or a
`default_deny` direction.

### Admin-only parameters

- `priority` `(int: 0)` - Evaluation order of admin policies, from 0 to 1000.
  Lower priorities are evaluated first; policies with the same priority are
  ordered by name.

- `namespaces` `(array<string>: [])` - The namespaces the admin policy applies
  to, as names or glob patterns (`"*"`, `"team-*"`). Empty means every
  namespace.

An admin policy needs at least one `ingress` or `egress` rule.

## Rule Parameters

- `name` `(string: "")` - An optional name, `[a-zA-Z0-9-_]{1,128}`, unique per
  direction in the policy. It appears as the `rule` label of the drop counter
  metric `nomad.client.allocs.network_policy.dropped` and in
  `norca network-policy status`.

- `action` `(string)` - Admin policies only, required there: `"allow"` accepts
  the traffic, `"deny"` drops it (and counts it), `"pass"` hands the decision
  over to the namespace policies. Both `allow` and `deny` are final. In network
  policies `action` must be empty or `"allow"`.

- `from` (ingress) / `to` (egress) <code>([Peer](#peer-parameters): &lt;optional&gt;)</code> -
  The sources or destinations of the traffic. Can be repeated, up to 64 peers.
  Without peers, the rule matches any address.

- `ports` `(array<string>: [])` - Up to 64 port specifications; without ports,
  the rule matches any port and protocol. Forms:
  - `"5432/tcp"`, `"53/udp"`, `"9000/sctp"` - a port and protocol;
  - `"8000-8100/udp"` - a port range;
  - `"53"` - a port without protocol means TCP;
  - `"db/tcp"` - a port label of the allocation (ingress only), resolved to the
    port inside the allocation, the `to` side of the port mapping.

  Ingress ports are always the ports inside the allocation's network namespace.

Traffic matches a rule if it matches one of its peers and one of its ports.

## Peer Parameters

A peer is either an address block or a set of allocations on the same node:

- `cidr` `(array<string>: [])` - IPv4 or IPv6 prefixes, up to 256. Cannot be
  combined with `namespace` or `selector`.

- `namespace` `(string: "")` - The namespace of peer allocations. Empty means
  the namespace of the policy (for admin policies: every namespace); `"*"`
  means every namespace.

- `selector` <code>(block: &lt;optional&gt;)</code> - Selects peer allocations
  by their merged job and task group `meta`. Empty selects every allocation of
  the namespace.

Allocation peers match only allocations running on the same node. Traffic
from other nodes arrives through host ports with the address of the sending
node (or external client) as source, so it is matched with `cidr`.

## Always allowed

Regardless of the policies, the rule set accepts loopback traffic, replies to
allowed connections (`established,related`), IPv6 neighbor discovery and, for
ingress, traffic from the node itself (the gateway of the allocation network),
so health checks run by the client keep working.
