---
title: "consul_compat Block"
linkTitle: "consul_compat"
description: "The consul_compat block of the client configuration runs the Consul-compatible HTTP API on top of the native service catalog."
---

**Placement:** `client -> consul_compat`

The `consul_compat` block (Norca) configures the
[Consul-compatible API](/docs/features/service-discovery/consul-compatible-api) of a client: the catalog,
health, status and agent service endpoints of Consul's HTTP API, served from the native catalog, for tools
that only know Consul. It is off by default. The served endpoints are listed on the
[API reference](/docs/api/consul-compatible).

```hcl
client {
  consul_compat {
    enabled         = true
    bind            = "127.0.0.1:8500"
    datacenter_from = "region"
    namespaces      = ["default"]
    anonymous_token = "<secret ID of a read-only token>"
  }
}
```

## `consul_compat` Parameters

- `enabled` `(bool: false)` - Starts the API.

- `bind` `(string: "127.0.0.1:8500")` - The `host:port` to listen on.

- `datacenter_from` `(string: "region")` - What a Consul datacenter is: `"region"` shows the Norca regions
  as Consul datacenters (`?dc=` forwards to the region), `"datacenter"` shows the Norca datacenters of
  the local region (`?dc=` filters the instances). It also applies to the datacenter label of
  `*.service.consul` names of the [built-in DNS](/docs/configuration/dns).

- `namespaces` `(array<string>: ["default"])` - Norca namespaces shown. The services of the first one
  appear under their name, those of the others as `<namespace>--<name>`.

- `anonymous_token` `(string: "")` - Norca ACL token used for requests that carry no token
  (`X-Consul-Token`, `Authorization: Bearer` or `?token=`). Use a read-only token, for example with
  `read-job` on the shown namespaces and `node { policy = "read" }`.

## Interaction with the `consul` block

The default `bind` is also the default address of the agent's own [`consul`](/docs/configuration/consul)
block. When the `consul` block points at the API of the same agent (the same port, and the same host,
`localhost` for a loopback bind, or any local address for a wildcard bind), the agent turns off
`auto_advertise`, `server_auto_join` and `client_auto_join`, adds `consul` to the client's
fingerprint deny list and logs what it turned off; `norca config validate` prints a warning. Task
templates keep using the `consul` block's address, so consul-template's service functions read the
native catalog through the API. To keep the full Consul integration, point `consul.address` or
`consul_compat.bind` elsewhere.

## `consul_compat` Examples

### Two namespaces

```hcl
client {
  consul_compat {
    enabled    = true
    namespaces = ["default", "apps"]
  }
}
```

The service `api` of namespace `apps` is then `apps--api` in the Consul-compatible API.

### Consul datacenters as Norca datacenters

```hcl
client {
  consul_compat {
    enabled         = true
    datacenter_from = "datacenter"
  }
}
```
