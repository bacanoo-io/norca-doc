---
title: "discovery Block"
linkTitle: "discovery"
description: "The discovery block of a service sets the topology preference, overflow rule and regional failover of lookups, and whether instances that are not ready are discoverable."
---

**Placement:**

- `job -> group -> service -> discovery`
- `job -> group -> task -> service -> discovery`

The `discovery` block (Norca) tells the consumers of the native catalog how to choose among the
instances of a service of the `nomad` provider: the built-in DNS, templates and the Task API, the HTTP
API with `near=self`, the Consul-compatible API with `near=_agent` and native mTLS upstreams. See
[topology-aware routing](/docs/features/service-discovery/topology) for how the tiers are built. The
settings are copied into every registration of the service.

```hcl
service {
  name     = "api"
  port     = "http"
  provider = "nomad"

  discovery {
    prefer            = "zone"
    min_local         = 2
    overflow_fraction = 0.3
    failover          = ["eu-gcp", "us-hetzner"]
    include_not_ready = false
  }
}
```

## `discovery` Parameters

- `prefer` `(string: "none")` - Topology preference relative to the caller:

  - `none` - no preference: every eligible instance of the region;
  - `zone` - the instances in the caller's zone (and datacenter), then those of its datacenter, then the
    rest of the region;
  - `datacenter` - the instances in the caller's datacenter, then the rest of the region;
  - `region` - like `none`; it makes the use of `failover` alone explicit.

- `min_local` `(int: 0)` - Number of eligible instances a tier must hold before the next tier is left
  out. Values below 1 act as 1. Must not be negative.

- `overflow_fraction` `(float: <server default>)` - Fraction of all eligible instances of the region a
  tier must hold before the next tier is left out, between 0 and 1; `0` disables the rule. When unset,
  the servers fill in their
  [`default_overflow_fraction`](/docs/configuration/native_service_discovery#server-block) (0.2 unless
  configured) when the job is registered, so the stored job carries a concrete value.

- `failover` `(array<string>: [])` - Regions queried in order when the caller's region has no eligible
  instance. The caller's own region is skipped, so the same list can be used in every region. Entries must
  not be empty or repeated.

- `include_not_ready` `(bool: false)` - Makes instances discoverable even when they are not healthy or
  not yet ready, for stateful clusters whose members must find each other before they are ready.

## Requirements

- The service must use `provider = "nomad"`.
- The zone of each node comes from the client's [`topology`](/docs/configuration/topology)
  configuration (by default the node meta `zone`).

## `discovery` Examples

### Stay in the zone while two instances are healthy there

```hcl
discovery {
  prefer    = "zone"
  min_local = 2
}
```

### Regional failover only

```hcl
discovery {
  prefer   = "region"
  failover = ["eu-1", "eu-2"]
}
```

### A cluster whose members discover each other at startup

```hcl
service {
  name     = "nats-cluster"
  port     = "cluster"
  provider = "nomad"

  discovery {
    include_not_ready = true
  }
}
```
