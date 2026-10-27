---
title: "topology Block"
linkTitle: "topology"
description: "The topology block of the client configuration sets the topology zone of the node."
---

**Placement:** `client -> topology`

The `topology` block (Norca) sets the topology zone of a client node. The client writes the zone into
every service registration it makes, and uses it as the caller's zone in
[topology-aware lookups](/docs/features/service-discovery/topology).

```hcl
client {
  topology {
    zone = "${attr.platform.aws.placement.availability-zone}"
  }
}
```

## `topology` Parameters

- `zone` `(string: "${meta.zone}")` - The zone of the node: a literal value, or a reference resolved
  against the node, one of `${attr.<name>}` (a node attribute), `${meta.<name>}` (node meta) or
  `${node.datacenter}`. A reference that does not resolve gives an empty zone.

## `topology` Examples

### The default: node meta

Without a `topology` block the zone is the node meta `zone`:

```hcl
client {
  meta {
    zone = "zone-a"
  }
}
```

### A fixed zone

```hcl
client {
  topology {
    zone = "fsn1-dc14"
  }
}
```
