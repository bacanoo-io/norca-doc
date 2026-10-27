---
title: "native_service_discovery Block"
linkTitle: "native_service_discovery"
description: "The native_service_discovery blocks of the client and server configuration set the defaults of health filtering and of the topology overflow rule."
---

**Placement:** `client -> native_service_discovery` and `server -> native_service_discovery`

The `native_service_discovery` blocks (Norca) set defaults of the
[health-based catalog](/docs/features/service-discovery/catalog) and of
[topology-aware routing](/docs/features/service-discovery/topology). The client block and the server
block have different parameters.

```hcl
client {
  native_service_discovery {
    default_healthy_only = true
  }
}

server {
  native_service_discovery {
    default_overflow_fraction = 0.2
  }
}
```

## Client block

- `default_healthy_only` `(bool: false)` - Service lookups made by the workloads of the client (templates
  such as `nomadService`, and the Task API) return only healthy instances, and those of services with
  `discovery { include_not_ready = true }`, unless the request sets the `healthy` parameter. Lookups from
  outside the workloads (the CLI, the HTTP API) are not affected: they filter only with `?healthy=true`.
  The [DNS server](/docs/configuration/dns) always answers with healthy instances, with or without
  this setting.

## Server block

- `default_overflow_fraction` `(float: 0.2)` - The overflow fraction that the servers fill in at job
  registration for [`discovery`](/docs/job-specification/discovery) blocks that leave
  `overflow_fraction` unset. Must be between 0 and 1; `0` disables the overflow rule for those services.

  Each region's servers apply their own setting, so a multiregion job can resolve to different values
  in different regions. The setting is reloaded on `SIGHUP` and applies to registrations from then on:
  stored jobs keep their resolved value until they are submitted again, when `norca job plan` shows the
  change. The agent and `norca config validate` reject values outside 0 to 1.
