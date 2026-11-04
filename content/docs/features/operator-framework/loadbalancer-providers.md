---
title: "Load balancer providers"
linkTitle: "Load balancer providers"
weight: 5
description: "How the LoadBalancer operator finds the providers that create load balancers: external applications register a LoadBalancerClass object and implement a small HTTP API."
---

## What and why

A `service` with an [`expose { load_balancer { ... } }`](/docs/job-specification/service)
block asks for a load balancer in front of it. Norca does not create load
balancers. The sample **LoadBalancer operator** turns the request into a
`norca.io/LoadBalancer` object, and a **provider**, an external application,
creates the real load balancer at a cloud or on hardware. The `class` of the
request says which provider.

Providers are not built into the operator. A provider **registers itself** with
a `norca.io/LoadBalancerClass` object when it starts, and the operator
calls its HTTP API. This way a new cloud needs a new application, not a new
operator, and the operator always knows which classes exist and what they
support.

The built-in `nomad` class (a TCP proxy that runs as a Norca job) needs no
registration.

## How it works

```
job:  service { expose { load_balancer { class = "hcloud-lb" ... } } }
        │  the servers write the block to the norca_lb_* service meta
        ▼
LoadBalancer object (norca.io/LoadBalancer)      created by the operator
        │  class → LoadBalancerClass "hcloud-lb"
        ▼
LoadBalancerClass object (norca.io/LoadBalancerClass)   written by the provider
        │  PUT / DELETE on the provider API
        ▼
provider application → the cloud API
```

1. The provider starts, writes its `LoadBalancerClass` and then reports a
   heartbeat in the status every minute or so.
2. The operator reads the registrations when it reconciles a `LoadBalancer`.
   For a class that is not built in it checks the registration, calls the
   provider with the spec and the healthy instances of the service (the
   targets), and writes what the provider answers (addresses, readiness) to the
   status of the `LoadBalancer`.
3. When the targets change, the operator calls the provider again. When the
   `LoadBalancer` is deleted, it calls `DELETE` before its finalizer is
   removed, so the cloud load balancer is gone before the object is.

Registered providers need `-objects=native` (the `LoadBalancer` objects must
have the cleanup finalizer); the Variables storage knows only the built-in
classes.

## The LoadBalancerClass object

`norca.io/LoadBalancerClass` is a cluster-scoped kind (the files are
`loadbalancerclass.kind.hcl` and `loadbalancerclass.schema.json` in the
[operator example](https://github.com/bacanoo-io/norca/tree/main/norca/controller/examples/loadbalancer)).
Register it once with `norca object-kind apply loadbalancerclass.kind.hcl`. The
name of the object is the class.

```hcl
kind = "norca.io/LoadBalancerClass"
name = "hcloud-lb"

spec {
  endpoint      = "https://lb-hetzner.service.eu.norca:8443"
  tokenVariable = "lb-provider/hcloud/token"

  capabilities {
    internal = true
    ports    = "1-65535"
  }

  parameters {
    location = "fsn1"
    type     = "lb11"
  }
}
```

| Field | Description |
| --- | --- |
| `spec.endpoint` | Base URL of the provider API. Must be `https`; `http` only with the operator flag `-class-allow-http`, for development. A certificate of a private CA (for example the CA of the cluster) is trusted with the operator flag `-class-ca-file`. |
| `spec.tokenVariable` | Path of the Variable whose item `token` is sent as `Authorization: Bearer <token>`. The token is never part of the object. Optional. |
| `spec.capabilities.internal` | The provider can create load balancers that are not reachable from the internet. Default `false`. |
| `spec.capabilities.ports` | Frontend ports the provider supports, such as `80,443,8000-8100`. Empty means any port. |
| `spec.parameters` | Provider specific settings; sent with every call. |
| `status.lastHeartbeat` | RFC 3339 time. The provider updates it while it runs. |
| `status.version` | Version of the provider. Informational. |

A class **without** a heartbeat is a static registration and always available.
One whose heartbeat is older than the operator flag `-class-ttl` (default three
minutes) is unavailable.

## What the operator reports

The state of a `LoadBalancer` whose class cannot be used shows in its `Ready`
condition (`norca object get norca.io/LoadBalancer <name>`) and in its event
log. These states are checked again by themselves, so a provider that starts
later, comes back, or changes its capabilities is picked up without touching
the `LoadBalancer`:

| Reason | Meaning |
| --- | --- |
| `UnknownClass` | No built-in provider and no `LoadBalancerClass` of that name. The message lists the known classes. |
| `InvalidClass` | The registration is invalid, for example an `http` endpoint. |
| `ProviderUnavailable` | The heartbeat is older than `-class-ttl`. Existing load balancers are not deleted. |
| `Unsupported` | The class does not support the request: `internal = true` without `capabilities.internal`, or a port outside `capabilities.ports`. |

If a call to the provider fails, the operator records a `ProvisioningFailed`
event and retries with backoff.

## The provider API

The operator calls two endpoints. Both are idempotent.

```
PUT    {endpoint}/v1/loadbalancers/{namespace}/{name}
DELETE {endpoint}/v1/loadbalancers/{namespace}/{name}
```

`PUT` creates or updates the load balancer and returns its state. The request
body:

```json
{
  "name": "api-public",
  "namespace": "default",
  "service": "api",
  "port": 443,
  "internal": false,
  "targets": [
    { "address": "10.0.0.1", "port": 8001, "allocID": "a1b2c3d4" },
    { "address": "10.0.0.2", "port": 8001, "allocID": "e5f6a7b8" }
  ],
  "parameters": { "location": "fsn1", "type": "lb11" }
}
```

`targets` are the healthy instances of the service and may be empty. A `2xx`
answer carries:

```json
{
  "ready": true,
  "addresses": ["203.0.113.10:443"],
  "resource": "hcloud/lb/12345",
  "message": ""
}
```

`ready` says that the load balancer serves traffic; while it is `false`, the
`message` explains why and the operator asks again shortly. `addresses` and
`resource` appear in the status of the `LoadBalancer`. Any other status code is
an error and is retried.

`DELETE` removes everything the provider created for the load balancer. It
answers `2xx`, or `404` if there is nothing to delete. If it fails, the
finalizer keeps the `LoadBalancer` object, and the operator tries again.

## Running a provider

A provider is an ordinary application. Three things matter in a real
deployment, and the example provider shows each of them.

**The registered port is not the port it listens on.** A provider that runs in
a container, behind a port mapping or behind a proxy listens on one address and
is reached on another. The operator calls what the provider **registered**
(`spec.endpoint`); the provider has to answer on what it listens on and to
register the address and port of the **host**. In a task of a Norca job these
are in the environment: `NORCA_PORT_<label>` is the port inside the container
(the `to` of a mapped port), `NORCA_HOST_IP_<label>` and
`NORCA_HOST_PORT_<label>` the address and port of the host. The example
provider expands them in its configuration file
(`"listen": "0.0.0.0:${NORCA_PORT_api}"`,
`"advertise_url": "http://${NORCA_HOST_IP_api}:${NORCA_HOST_PORT_api}"`), and a
class can have its own full `endpoint`. In the `template` block of a job file
the dollar sign is doubled (`$${NORCA_PORT_api}`), because HCL would interpolate
it.

**The provider reaches the Norca API over the network, or on the task API
socket.** The usual way is a container in bridge mode that opens its own ports
(Norca publishes them) and talks to the API over HTTPS with the CA of the
cluster (`NORCA_CACERT`) and the workload identity of the job as its token
(`identity { env = true }` sets `NORCA_TOKEN`), with the ACL policy bound to the
job. Use the address of a server other than the node the container runs on,
unless the firewall of that node lets the bridge in. A job can also use the
task API socket (`NORCA_ADDR=unix://${NORCA_SECRETS_DIR}/api.sock`), which needs
no address, CA or token handling.

**The firewall must allow the ports.** The provider API port, and for a provider
that serves the traffic itself the frontend ports of the load balancers.

**Run the operator and the providers outside scaled pools.** A provider is
needed at the moment a load balancer is created, changed or removed. Put the
operator and the providers in a pool whose nodes nothing scales or drains
automatically, two instances on different nodes; see
[where to run a controller](/docs/features/operator-framework/controllers#where-to-run-a-controller).

### The example provider

[`norca-loadbalancer`](https://github.com/bacanoo-io/norca-loadbalancer) is an
example of such an application: provider types that register themselves behind
one interface, each in its own package with its own ID; declared parameters
with defaults, secrets (`env:NAME`, `file:/path`) and **dynamic** parameters
that can be changed in the `LoadBalancerClass` object without a restart; one
process serving any number of classes; and a registrar that writes the
`LoadBalancerClass` objects, keeps their heartbeat, registers a class again if
its object disappears, and works on the task API socket as well as over the
network. It has three types:

| Type | What it does |
| --- | --- |
| `tcpproxy` | TCP load balancers inside the process: round robin, failover to the next target. Needs no other software. |
| `nginx` | TCP load balancers as nginx stream servers on the machine, with a rollback when nginx rejects a change. |
| `mock` | Keeps the load balancers in memory; its `ready` and `latency` parameters are dynamic, to simulate an outage. |

It also has a `Dockerfile` (a static binary on `FROM scratch`). A cloud
provider is a new package next to these; the README of the repository describes
the interface.

The whole chain is tested in the lab (`norca-lab`, `.\run-tests.ps1 -Cases ...`)
with ACLs on, as jobs with their workload identity:

| Case | The provider runs as |
| --- | --- |
| `loadbalancer` | a raw_exec job; it listens on 18444 and registers 18443 (an `iptables` redirect stands in for a port mapping) |
| `loadbalancer-docker` | a Docker container in bridge mode with a real port mapping (host 18443, container 8443), on the task API socket |
| `loadbalancer-docker-net` | the same container without the socket: over HTTPS with the CA and the workload identity token |
| `loadbalancer-docker-tls` | the same with an **https provider**: its certificate is signed by the CA of the cluster, and the operator runs with `-class-ca-file` and without `-class-allow-http`; the certificate is not trusted without that CA |

They check a wrong token that is retried, traffic through the load balancer from
another node with round robin, targets that follow the service, an unknown and
an unsupported class, a dynamic parameter changed in the registration, a
provider that stops (the heartbeat) and comes back, and the removal of a
service.

## Permissions

- The **operator** reads the registrations: `read` on `norca.io/LoadBalancerClass`
  in the namespace `"*"` of its ACL policy (the kind is cluster-scoped), and
  `read` on the token Variables (`-class-token-namespace`, default `default`).
  `loadbalancer-policy.hcl` in the example has the rules.
- A **provider** needs `read`, `write` and `write-status` on
  `norca.io/LoadBalancerClass`, and nothing else. Who may write the kind
  decides who can receive calls (and the tokens) for a class, so grant it only
  to the provider's identity.

## Limits and status

- The operator caches the list of registrations for a few seconds; a change
  takes effect with the next reconcile, which for a `LoadBalancer` that is not
  ready is within 15 seconds and otherwise within a minute.
- If the registration of a class is removed while `LoadBalancer` objects use
  it, deleting those objects waits until the class is registered again, because
  the provider cannot be told to remove the load balancer. Remove the finalizer
  by hand only if the cloud load balancer is already gone.
- Changing the `class` of a `LoadBalancer` removes what the previous provider
  created, if that class is still registered; otherwise it is left behind and
  logged.
- The provider API has no status call: the answer of `PUT` is the state, and
  the operator calls it again periodically. Two providers for one class are not
  supported; the name of the object is unique.
- A MetalLB-like provider for bare metal and the cloud providers (Hetzner,
  Scaleway, AWS, Google) are separate applications and are not part of Norca;
  the example provider above has none of them.
- An https provider needs a certificate that the operator trusts: one signed by a CA the system
  trusts, or by a private CA given with `-class-ca-file` (the file is read when the operator
  starts; a change needs a restart). The certificate must be valid for the host or the IP
  address in `spec.endpoint`. The operator does not present a client certificate to the provider;
  it sends the bearer token of the class.
