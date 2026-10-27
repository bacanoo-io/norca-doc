---
title: "dns Block"
linkTitle: "dns"
description: "The dns block of the client configuration runs the built-in DNS server that answers from the native service catalog."
---

**Placement:** `client -> dns`

The `dns` block (Norca) configures the [built-in DNS server](/docs/features/service-discovery/dns) of a
client. The server answers `<service>.service.nomad` names (and optionally `*.service.consul` names) with
the healthy instances of the native catalog, over UDP and TCP. It is off by default.

```hcl
client {
  dns {
    enabled       = true
    bind          = "127.0.0.1:8600"
    domain        = "nomad"
    consul_compat = true
    recursors     = ["10.0.0.2"]
    ttl           = "5s"
    namespaces    = ["default", "prod"]
  }
}
```

## `dns` Parameters

- `enabled` `(bool: false)` - Starts the DNS server.

- `bind` `(string: "127.0.0.1:8600")` - The `host:port` to listen on, over UDP and TCP.

- `domain` `(string: "nomad")` - The DNS domain of the native catalog. Leading and trailing dots are
  ignored.

- `consul_compat` `(bool: false)` - Also answers `<service>.service[.<datacenter>].consul` names. The
  datacenter label is a region, or a datacenter of the local region with
  [`consul_compat { datacenter_from = "datacenter" }`](/docs/configuration/consul_compat). Cannot be used
  with `domain = "consul"`.

- `recursors` `(array<string>: [])` - Nameservers (`host` or `host:port`, port 53 by default) that
  queries outside the served domains are forwarded to, when the query asks for recursion. Without
  recursors such queries are refused.

- `ttl` `(string: "5s")` - TTL of the answers, and the minimum TTL of the SOA record (the negative cache
  TTL). Must be a non-negative duration.

- `namespaces` `(array<string>: ["default"])` - Namespaces the server answers for. The first one is used
  for names without a namespace; names of other namespaces are refused.

- `token` `(string: "")` - ACL token used to read the catalog. Defaults to the identity of the node,
  which can read the services of every namespace of its own region (the `namespaces` setting limits
  what is answered). With ACLs enabled, names of other regions and the
  [native mTLS](/docs/features/native-mtls/sidecar-and-gateway#cross-region-gateway) sidecars of the
  client that reach other regions need a token that is valid in every region, for example a global token
  with `read-job` on the namespaces involved.

## `dns` Examples

### Three namespaces, no recursion

```hcl
client {
  dns {
    enabled    = true
    namespaces = ["default", "apps", "observability"]
  }
}
```

### A catalog token for a federation

```hcl
client {
  dns {
    enabled = true
    token   = "<secret ID of a global token with read-job>"
  }
}
```
