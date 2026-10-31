---
title: "consul_compat Block"
linkTitle: "consul_compat"
description: "The consul_compat block of the client configuration runs the Consul-compatible HTTP API on top of the native service catalog."
---

**Placement:** `client -> consul_compat`

The `consul_compat` block (Norca) configures the
[Consul-compatible API](/docs/features/service-discovery/consul-compatible-api) of a client: the catalog,
health, status and agent service endpoints of Consul's HTTP API, served from the native catalog, and the
Consul KV, kept in Norca Variables or a NATS JetStream bucket, for tools that only know Consul. It is off
by default. The served endpoints are listed on the
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

- `kv` <code>([kv](#kv-parameters): nil)</code> - Where the Consul KV (`/v1/kv`) lives.

## `kv` Parameters

- `backend` `(string: "auto")` - Where the keys are kept:
  - `"auto"`: in the bucket of the [system bus](/docs/features/system-bus) of the servers
    when they run one, otherwise in Variables. The client decides at the first KV request after it
    learned its servers, and keeps that store.
  - `"bus"`: in the key-value bucket `consul-kv` of the system bus. The servers create it with one
    replica per server, up to three. The client reaches the bucket through the RPC of the servers,
    with the token of the KV request; the servers check the ACL rules of `path` (below). Nodes have
    no direct access to the bucket on the bus. Flags are not supported.
  - `"variables"`: every key in a Norca Variable. To move the keys to the bus, run
    [`norca operator consul-kv migrate`](/docs/commands/operator/consul-kv/migrate).
  - `"nats"`: a JetStream key-value bucket of an external NATS (the `nats` block).
  - `"disabled"`: the KV endpoints answer `501`.

- `namespace` `(string: "")` - Namespace of the keys; empty uses the first of `namespaces`.

- `path` `(string: "consul/kv")` - Variables path the keys live under: the key `app/config` is the
  Variable `consul/kv/app/config`. The ACL rules of this path apply with every backend: reading a key
  needs `read`, listing `list`, writing `write` and deleting `destroy` on
  `<path>/<key>` in `namespace` (characters outside letters, digits, `-` and `_` appear as `~XX`).

- `nats` <code>([nats](#nats-parameters): nil)</code> - The bucket of the `nats` backend.

### `nats` Parameters

- `urls` `(array<string>: [])` - NATS servers, for example `["nats://10.0.0.1:4222"]`; required for
  the `nats` backend. The client connects on the first KV request and reconnects on its own.

- `bucket` `(string: "consul-kv")` - JetStream key-value bucket.

- `create_bucket` `(bool: true)` - Create the bucket (history 1) when it is missing.

- `replicas` `(int: 1)` - Replicas of a created bucket.

- `credentials_file`, `nkey_seed_file`, `user` and `password`, `token` - Authentication, in this
  order of precedence. `password` and `token` are redacted from `/v1/agent/self`.

- `ca_file`, `cert_file`, `key_file` - TLS: the CA of the servers and a client certificate.

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

### Consul KV in a NATS bucket

```hcl
client {
  consul_compat {
    enabled = true
    kv {
      backend = "nats"
      nats {
        urls             = ["nats://10.0.0.1:4222", "nats://10.0.0.2:4222"]
        credentials_file = "/etc/norca.d/nats-kv.creds"
        replicas         = 3
      }
    }
  }
}
```

### Consul datacenters as Norca datacenters

```hcl
client {
  consul_compat {
    enabled         = true
    datacenter_from = "datacenter"
  }
}
```
