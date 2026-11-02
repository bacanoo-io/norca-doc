---
title: "Service HTTP API"
linkTitle: "Services"
description: "The /service endpoints are used to query and interact with Norca services."
upstream:
  path: "website/content/api-docs/services.mdx"
---

The `/service` endpoints are used to query and interact with Norca services.

## List Services

This endpoint lists all the currently available Norca services.

| Method | Path           | Produces           |
| ------ | -------------- | ------------------ |
| `GET`  | `/v1/services` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required         |
| ---------------- | -------------------- |
| `YES`            | `namespace:read-job` |

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/services
```

```shell
$ curl \
    https://localhost:4646/v1/services?namespace=*
```

### Sample Response

```json
[
  {
    "Namespace": "default",
    "Services": [
      {
        "ServiceName": "example-cache-redis",
        "Tags": [
          "cache",
          "db"
        ]
      }
    ]
  }
]
```

## Read Service

This endpoint reads a specific service.

| Method | Path                     | Produces           |
| ------ | ------------------------ | ------------------ |
| `GET`  | `/service/:service_name` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries), [consistency modes](/docs/api#consistency-modes) and
[required ACLs](/docs/api#acls).

| Blocking Queries | Consistency Modes | ACL Required         |
| ---------------- | ----------------- | -------------------- |
| `YES`            | `all`             | `namespace:read-job` |

### Parameters

- `:service_name` `(string: <required>)` - Specifies the service name. This is
  specified as part of the path.

- `namespace` `(string: "default")` - Specifies the target namespace. This
  parameter is used before any `filter` expression is applied.

- `next_token` `(string: "")` - This endpoint supports paging. The `next_token`
  parameter accepts a string which identifies the next expected service. This
  value can be obtained from the `X-Nomad-NextToken` header from the previous
  response.

- `per_page` `(int: 0)` - Specifies a maximum number of services to return for
  this request. If omitted, the response is not paginated. The value of the
  `X-Nomad-NextToken` header of the last response can be used as the `next_token`
  of the next request to fetch additional pages.

- `filter` `(string: "")` - Specifies the [expression](/docs/api#filtering)
  used to filter the results. Consider using pagination or a query parameter to
  reduce resource used to serve the request.

- `choose` `(string: "")` - Specifies the number of services to return and a hash
  key. Must be in the form `<number>|<key>`. Norca uses [rendezvous hashing][hash] to deliver
  consistent results for a given key, and stable results when the number of services
  changes.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/service/example-cache-redis
```

### Sample Response

```json
[
  {
    "Address": "127.0.0.1",
    "AllocID": "177160af-26f6-619f-9c9f-5e46d1104395",
    "CreateIndex": 14,
    "Datacenter": "dc1",
    "ID": "_nomad-task-177160af-26f6-619f-9c9f-5e46d1104395-redis-example-cache-redis-db",
    "JobID": "example",
    "ModifyIndex": 24,
    "Namespace": "default",
    "NodeID": "7406e90b-de16-d118-80fe-60d0f2730cb3",
    "Port": 29702,
    "ServiceName": "example-cache-redis",
    "Tags": [
      "db",
      "cache"
    ]
  },
  {
    "Address": "127.0.0.1",
    "AllocID": "ba731da0-6df9-9858-ef23-806e9758a899",
    "CreateIndex": 35,
    "Datacenter": "dc1",
    "ID": "_nomad-task-ba731da0-6df9-9858-ef23-806e9758a899-redis-example-cache-redis-db",
    "JobID": "example",
    "ModifyIndex": 35,
    "Namespace": "default",
    "NodeID": "7406e90b-de16-d118-80fe-60d0f2730cb3",
    "Port": 27232,
    "ServiceName": "example-cache-redis",
    "Tags": [
      "db",
      "cache"
    ]
  }
]
```

## Delete Service Registration

This endpoint is used to delete an individual service registration.

| Method   | Path                                    | Produces           |
| -------- | --------------------------------------- | ------------------ |
| `DELETE` | `/v1/service/:service_name/:service_id` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required           |
| ---------------- | ---------------------- |
| `NO`             | `namespace:submit-job` |

Client nodes remove the registrations of the allocations they run with their
secret ID instead of an ACL token. With ACLs enabled, a node secret ID can
remove only registrations of its own node; any other registration is denied
with `403`.

### Parameters

- `:service_name` `(string: <required>)` - Specifies the service name. This is
  specified as part of the path.

- `:service_id` `(string: <required>)` - Specifies the service ID. This is
  specified as part of the path.

### Sample Request

```shell
$ curl \
    --request DELETE \
    https://localhost:4646/v1/service/example-cache-redis/_nomad-task-ba731da0-6df9-9858-ef23-806e9758a899-redis-example-cache-redis-db
```

## Norca extensions

Norca adds health, topology and external services to the native catalog (see
[service discovery](/docs/features/service-discovery)).

### Additional parameters of Read Service

- `healthy` `(bool: <see below>)` - With `true`, only healthy instances are returned (and those of
  services with `discovery { include_not_ready = true }`); with `false`, every instance. Without the
  parameter, requests from the workloads of a client (templates and the Task API) follow the client's
  [`native_service_discovery { default_healthy_only }`](/docs/configuration/native_service_discovery),
  and all other requests return every instance.

- `near` `(string: "")` - `self` (or `_agent`) selects and orders the instances by the
  [topology preference](/docs/features/service-discovery/topology) of the service relative to the client
  agent that receives the request, and fails over to the regions of the service's `failover` list when the
  local region has no instance left. `none` turns this off. Requests from the workloads of a client are
  topology-aware by default; other requests only with `near=self`, which needs a client agent.

### Additional fields of service registrations

| Field | Description |
| --- | --- |
| `Ready` | Whether the instance can receive traffic (startup and readiness checks passed) |
| `Health` | Aggregate health: `passing`, `warning` or `critical`; empty for registrations written before the health-based catalog |
| `Checks` | The checks of the instance: `ID` (external services only), `Name`, `Role`, `Status`, `Output` |
| `HealthUpdatedAt` | Time of the last recorded health change, in Unix nanoseconds |
| `Meta` | Meta of the service |
| `Discovery` | The `discovery` block of the service: `Prefer`, `MinLocal`, `OverflowFraction`, `Failover`, `IncludeNotReady` |
| `External` | Set for [external services](/docs/api/external-services): `Kind`, `Source`, `LocalID`, `Checks`, `DeregisterCriticalAfter` |

### Sample Request

```shell
$ curl \
    'https://localhost:4646/v1/service/test-app?namespace=apps&healthy=true&near=self'
```

### Sample Response

```json
[
  {
    "ID": "_nomad-task-8f1e2c4a-1b2c-3d4e-5f60-718293a4b5c6-group-web-test-app-http",
    "ServiceName": "test-app",
    "Namespace": "apps",
    "NodeID": "4b1c7d2e-9a8b-4c3d-8e7f-6a5b4c3d2e1f",
    "Datacenter": "dc1",
    "JobID": "test-app",
    "AllocID": "8f1e2c4a-1b2c-3d4e-5f60-718293a4b5c6",
    "Tags": [],
    "Address": "10.0.0.11",
    "Port": 24512,
    "Ready": true,
    "Health": "passing",
    "Checks": [
      { "ID": "", "Name": "ready", "Role": "readiness", "Status": "passing", "Output": "HTTP GET http://10.0.0.11:24512/ready: 200 OK" }
    ],
    "HealthUpdatedAt": 1761573120000000000,
    "Meta": null,
    "Discovery": {
      "Prefer": "datacenter",
      "MinLocal": 2,
      "OverflowFraction": 0.2,
      "Failover": null,
      "IncludeNotReady": false
    },
    "External": null,
    "CreateIndex": 310,
    "ModifyIndex": 318
  }
]
```

External services are managed with the [external services API](/docs/api/external-services); their
registrations are read with this endpoint like any other.

[hash]: https://en.wikipedia.org/wiki/Rendezvous_hashing
