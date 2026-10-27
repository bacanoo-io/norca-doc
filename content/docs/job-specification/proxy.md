---
title: "proxy Block"
linkTitle: "proxy"
description: "The \"proxy\" block allows specifying options for configuring sidecar proxies used in Consul Connect integration"
upstream:
  path: "website/content/docs/job-specification/proxy.mdx"
---

**Placement:** `job -> group -> service -> connect -> sidecar_service -> proxy`

The `proxy` block allows configuring various options for the sidecar proxy
managed by Norca for [Consul
Connect](/docs/integrations/consul-connect/). It is valid only
within the context of a `sidecar_service` block.

```hcl
job "countdash" {
  datacenters = ["dc1"]

  group "api" {
    network {
      mode = "bridge"
    }

    service {
      name = "count-api"
      port = "9001"

      connect {
        sidecar_service {
          proxy {}
        }
      }
    }

    task "web" {
      driver = "docker"

      config {
        image = "hashicorpdev/counter-api:v3"
      }
    }
  }
}
```

## `proxy` Parameters

- `local_service_address` `(string: "127.0.0.1")` - The address the local service binds to. Useful to
  customize in clusters with mixed Connect and non-Connect services.
- `local_service_port` `(int: <varies>)` - The port the local service binds to.
  Usually the same as the parent service's port, it is useful to customize in clusters with mixed
  Connect and non-Connect services.
- `upstreams` <code>([upstreams][]: nil)</code> - Used to configure details of each upstream service that
  this sidecar proxy communicates with.
- `expose` <code>([expose]: nil)</code> - Used to configure expose path configuration for Envoy.
  See Consul's Expose Paths Configuration Reference
  for more information.
- `config` `(map: nil)` - Proxy configuration that is opaque to Norca and
  passed directly to Consul. See Consul Connect documentation
  for details. Keys and values support [runtime variable interpolation][interpolation].

## `proxy` Examples

The following example is a proxy specification that includes upstreams configuration.

```hcl
sidecar_service {
  proxy {
    upstreams {
      destination_name = "count-api"
      local_bind_port  = 8080
    }
  }
}
```

[job]: /docs/job-specification/job/ 'Norca job Job Specification'
[group]: /docs/job-specification/group/ 'Norca group Job Specification'
[task]: /docs/job-specification/task/ 'Norca task Job Specification'
[interpolation]: /docs/runtime/interpolation/ 'Norca interpolation'
[sidecar_service]: /docs/job-specification/sidecar_service/ 'Norca sidecar service Specification'
[upstreams]: /docs/job-specification/upstreams/ 'Norca upstream config Specification'
[expose]: /docs/job-specification/expose/ 'Norca proxy expose configuration'
