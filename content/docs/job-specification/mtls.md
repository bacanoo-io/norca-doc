---
title: "mtls Block"
linkTitle: "mtls"
description: "The mtls block of a service enables Norca's native mTLS: workload certificates, an Envoy sidecar with upstreams, or a cross-region gateway."
---

**Placement:**

- `job -> group -> service -> mtls`
- `job -> group -> task -> service -> mtls` (app mode only)

The `mtls` block (Norca) enables [native mTLS](/docs/features/native-mtls) for a service of the `nomad`
provider. Every task of the group then receives a short-lived workload certificate with a SPIFFE ID and
the DNS names of the group's mtls services, and the service is protected by
[service intentions](/docs/features/native-mtls/intentions) according to its mode.

```hcl
job "web" {
  group "web" {
    network {
      mode = "bridge"
    }

    service {
      name     = "web"
      port     = "8080"
      provider = "nomad"

      mtls {
        mode = "sidecar"

        upstream "api" {
          service    = "api"
          local_port = 9001
        }
      }
    }

    task "web" {
      driver = "docker"
      config {
        image = "example/web:1"
      }
    }
  }
}
```

## `mtls` Parameters

- `mode` `(string: "app")` - How the workload certificate is used:

  - `app` - the application uses the certificate itself (see
    [app mode](/docs/features/native-mtls/app-mode));
  - `sidecar` - the servers inject an Envoy sidecar task that terminates mTLS in front of the service
    port, enforces the intentions and exposes the upstreams on local ports;
  - `gateway` - the service is a cross-region gateway: the servers inject an Envoy task that forwards TLS
    connections by their SNI name to the mtls services of its region.

- `upstream` <code>([upstream](#upstream-parameters): nil)</code> - A service the sidecar exposes on a
  local port. May be repeated; the label is the name of the upstream (letters, digits, `.`, `-` and `_`,
  at most 64 characters, unique within the block). Only allowed with `mode = "sidecar"`.

- `change_mode` `(string: "noop")` - What happens to the running tasks that use the certificate when the
  client has written a renewed certificate or a trust bundle with a new CA (see
  [reacting to renewals](/docs/features/native-mtls/app-mode#reacting-to-renewals)):

  - `noop` - nothing; the application re-reads the files itself;
  - `signal` - send `change_signal` to the task;
  - `restart` - restart the task in place; this does not count against the restart policy.

  `signal` and `restart` are only allowed with `mode = "app"`: in sidecar and gateway mode, Envoy picks
  up renewed certificates and new CAs without a restart. The block of a group service applies to every
  task of the group except the injected Envoy tasks, the block of a task service to its task.

- `change_signal` `(string: "")` - The signal to send with `change_mode = "signal"`, for example
  `"SIGHUP"`; required there and not allowed with other change modes. It is upper-cased and added to the
  implied `${attr.os.signals}` constraint of the tasks.

- `change_on` `(string: "any")` - The changes that trigger `change_mode`: `any` (a renewed or re-issued
  certificate, or a new CA in the trust bundle), `certificate` (a renewed or re-issued certificate only)
  or `bundle` (a new CA in the trust bundle only, for example of a federated region). Only allowed with
  `change_mode = "signal"` or `"restart"`. Removing a retired CA from the bundle never triggers it.

### `upstream` Parameters

- `service` `(string: <required>)` - Name of the destination service.

- `namespace` `(string: "")` - Namespace of the destination service. Defaults to the namespace of the job.

- `region` `(string: "")` - Region of the destination service. Defaults to the region of the client.
  A service of another region is reached through the gateway of that region.

- `gateway` `(string: "mtls-gateway")` - Name of the gateway service in the `default` namespace of
  `region`. Only allowed together with `region`.

- `local_port` `(int: <required>)` - Port the sidecar listens on for this upstream, on `127.0.0.1` in the
  network namespace of the group (1 to 65535). The application connects to `127.0.0.1:<local_port>`. The
  `local_port` values of all sidecar services of a group must differ.

## Requirements

- The service must use `provider = "nomad"`.
- Native mTLS must be enabled on the servers ([`server { mtls { enabled } }`](/docs/configuration/mtls),
  on by default), and every server of the region must run Norca.
- The namespace, the job ID and the name of the group must be valid SPIFFE path segments: letters,
  digits, `.`, `-` and `_`. Dispatched and periodic jobs use the ID of their parent job.
- `sidecar` and `gateway` modes:
  - only on group services, in a group with exactly one `network` block;
  - `sidecar` needs `mode = "bridge"` networking and the application port in `port` (a number or the
    label of a group port);
  - `gateway` needs `bridge` or `host` networking and the label of a port of the group network in
    `port`;
  - the service name must not be interpolated at runtime.

## Behaviour

- Adding or removing `mtls` on a group, and changing the `mtls` block or the port of a sidecar or gateway
  service, are destructive updates. Changing `change_mode`, `change_signal` or `change_on` of an app mode
  service is an in-place update.
- For a `sidecar` service the servers inject a prestart sidecar task `mtls-proxy-<service>` (kind
  `mtls-proxy:<service>`) and a dynamic port `mtls-proxy-<service>`; for a `gateway` service, a task
  `mtls-gateway-<service>` (kind `mtls-gateway:<service>`). Both run the Envoy image chosen by node meta,
  with 100 MHz and 128 MB, and are constrained to Norca clients. A task of the group with the same `kind`
  replaces the injected one.
- The service is registered with the address and port of the sidecar, and every registration of an mtls
  service carries the meta `norca-mtls` with its mode.

## `mtls` Examples

### App mode

```hcl
service {
  name     = "api"
  port     = "https"
  provider = "nomad"

  mtls {}
}
```

### App mode with a restart after renewals

For an application that reads its certificate only when it starts:

```hcl
service {
  name     = "openobserve"
  port     = "http"
  provider = "nomad"

  mtls {
    change_mode = "restart"
  }
}
```

With a signal, only for a renewed certificate:

```hcl
mtls {
  mode          = "app"
  change_mode   = "signal"
  change_signal = "SIGHUP"
  change_on     = "certificate"
}
```

### Upstream in another namespace and region

```hcl
mtls {
  mode = "sidecar"

  upstream "test-api" {
    service    = "test-api"
    namespace  = "apps"
    region     = "eu-1"
    local_port = 9001
  }
}
```

### Gateway

```hcl
group "gateway" {
  network {
    mode = "bridge"
    port "mtls" {
      static = 8443
      to     = 8443
    }
  }

  service {
    name     = "mtls-gateway"
    port     = "mtls"
    provider = "nomad"

    mtls {
      mode = "gateway"
    }
  }
}
```

See [sidecar and gateway](/docs/features/native-mtls/sidecar-and-gateway) for the full description.
