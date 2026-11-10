---
title: "Command: service apply"
linkTitle: "service apply"
description: "The service apply command registers the external services declared in a file."
---

The `service apply` command (Norca) registers or updates the
[external services](/docs/features/service-discovery/external-services) declared in a file. The file is
kept in version control like any other configuration; **the command is idempotent, so running it again with
the same file changes nothing.**

## Usage

```plaintext
norca service apply [options] [-f <file>]
```

The file is read from `-f`, from the one argument, or from standard input with `-`. It holds one or more
`external_service` blocks (HCL), or with `-json` the JSON form of the API. The whole file is checked by
the servers before anything is registered, so **a file with one invalid block registers nothing.**

```hcl
external_service "orders-db" {
  namespace = "prod"
  address   = "10.20.0.5"
  port      = 5432
  tags      = ["postgres"]

  check {
    type     = "tcp"
    tcp      = "10.20.0.5:5432"
    interval = "10s"
    timeout  = "2s"
  }

  checked_by {
    node_pool   = "edge"
    datacenters = ["dc1"]
  }
}

external_service "billing-db" {
  namespace = "prod"
  type      = "alias"
  target    = "billing.c9xk2.eu-central-1.rds.amazonaws.com"
}
```

The command prints `created`, `updated` or `unchanged` for every block. **It never removes anything**; use
[`norca service deregister`](/docs/commands/service/deregister) for that.

**A service declared in a file stays until it is deregistered**: `deregister_critical_after` defaults to `0`
for it (it is `1h` for a service registered with `service register`). Set it to remove a service whose
checks are critical for too long.

When ACLs are enabled, this command requires a token with the `register-external-service` capability for
the namespaces of the file, and `operator` write for a service without any check.

## General Options

The [general options](/docs/commands/service/info#general-options) of the `service` commands apply,
including `-namespace` (the namespace of the blocks without a `namespace`) and `-region`.

## Apply Options

- `-f=<file>`: The file to apply; `-` reads standard input.

- `-json`: Read the JSON form of the API instead of HCL. The file is an object, or an array of objects,
  with a `Namespace` and the fields of the [API payload](/docs/api/external-services#payload).

## The `external_service` block

The label is the name of the service.

| Attribute | Default | Description |
| --- | --- | --- |
| `id` | the name | ID of the registration, unique in the namespace |
| `namespace` | `-namespace` | Namespace of the service |
| `type` | `"address"` | `"address"`, or `"alias"` for a DNS alias |
| `address` | – | IP address or host name (`address`) |
| `target` | – | Target DNS name (`alias`) |
| `port` | `0` | Port |
| `tags`, `meta` | – | As for other services |
| `datacenter` | the checking node's | Datacenter the service is reported in |
| `deregister_critical_after` | `0` | Duration the service may stay critical before it is deregistered |

`check` blocks (any number) take `id`, `name`, `type` (`ttl`, `http` or `tcp`), `notes`, `ttl`, `http`,
`method`, `header`, `body`, `tls_skip_verify`, `tls_server_name`, `tcp`, `interval`, `timeout` and
`initial_status`, with the meaning of the [API](/docs/api/external-services#payload).

**The `http` and `tcp` checks of a declared service need a `checked_by` block.** The servers choose the client
node that runs them among the ready, eligible nodes that match `node_pool` (empty: every pool) and
`datacenters` (patterns such as `eu-*`; empty: every datacenter), and move them to another node when that
node goes down or stops reporting. A service with only `ttl` checks, or no check, needs no `checked_by`.
