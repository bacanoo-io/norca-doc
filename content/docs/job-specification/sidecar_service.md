---
title: "sidecar_service Block"
linkTitle: "sidecar_service"
description: "The \"sidecar_service\" block allows specifying options for configuring sidecar proxies used in Consul Connect integration"
upstream:
  path: "website/content/docs/job-specification/sidecar_service.mdx"
---

**Placement:** `job -> group -> service -> connect -> sidecar_service`

The `sidecar_service` block allows configuring various options for the sidecar
proxy managed by Norca for [Consul
Connect](/docs/integrations/consul-connect/) integration. It is
valid only within the context of a connect block.

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
        sidecar_service {}
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

## `sidecar_service` Parameters

- `disable_default_tcp_check` `(bool: false)` - disable the default TCP health
  check.

- `meta` <code>(map&lt;string|string&gt;: nil)</code> - Specifies arbitrary KV metadata pairs.

- `port` `(string: )` - Port label for sidecar service.

- `proxy` <code>([proxy][]: nil)</code> - This is used to configure the
  sidecar proxy service.

- `tags` <code>(array&lt;string&gt;: nil)</code> - Custom Consul service tags
  for the sidecar service.

## `sidecar_service` Examples

The following example is a minimal `sidecar_service` block with defaults

```hcl
  connect {
    sidecar_service {}
  }
```

The following example includes specifying upstreams and meta.

```hcl
   sidecar_service {
     proxy {
       upstreams {
         destination_name = "count-api"
         local_bind_port = 8080
       }
     }
     meta {
       "test-key" = "test-value"
     }
   }

```

[job]: /docs/job-specification/job/ 'Norca job Job Specification'
[group]: /docs/job-specification/group/ 'Norca group Job Specification'
[task]: /docs/job-specification/task/ 'Norca task Job Specification'
[interpolation]: /docs/runtime/interpolation/ 'Norca interpolation'
[sidecar_service]: /docs/job-specification/sidecar_service/ 'Norca sidecar service Specification'
[proxy]: /docs/job-specification/proxy/ 'Norca sidecar proxy config Specification'
