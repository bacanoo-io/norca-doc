---
title: "External Services HTTP API"
linkTitle: "External services"
description: "The /v1/service/external endpoints register, renew and deregister external services of the native catalog."
---

The `/v1/service/external` and `/v1/services/external` endpoints (Norca) manage
[external services](/docs/features/service-discovery/external-services): catalog registrations that are
not tied to an allocation. Once registered, external services are read like any other service, with
[`GET /v1/service/:service_name`](/docs/api/services#read-service).

All endpoints require every server of the region to run Norca. Durations in request bodies are
nanoseconds.

## Register External Service

This endpoint registers an external service, or updates the registration with the same ID. The states of
checks that already exist are kept.

| Method | Path                                 | Produces           |
| ------ | ------------------------------------ | ------------------ |
| `PUT`  | `/v1/service/external/:service_name` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `namespace:register-external-service`; also `operator:write` for static registrations |

A registration without a TTL check that no client node owns is static: it never expires and needs
`operator:write`. A registration with `http` or `tcp` checks must be sent to a **client** agent, whose
node then owns it, runs the checks and removes it when the node goes down; a server-only agent rejects
it.

### Parameters

- `:service_name` `(string: <required>)` - The name of the service, in the path. A `Name` in the body
  must match it.

- `namespace` `(string: "default")` - The namespace of the service.

### Payload

- `ID` `(string: <service_name>)` - The ID of the registration, unique in the namespace.

- `Kind` `(string: "address")` - `address`, or `alias` for a DNS alias. A body with a `Target` and no
  `Address` defaults to `alias`.

- `Address` `(string: "")` - The IP address or host name of an `address` service. Required for that
  kind.

- `Target` `(string: "")` - The DNS name an `alias` points to. Required for that kind; must be a DNS
  name, not an IP address.

- `Port` `(int: 0)` - The port of the service.

- `Tags` `(array<string>: nil)` - Tags of the service.

- `Meta` `(map<string|string>: nil)` - Meta of the service.

- `Datacenter` `(string: "")` - The datacenter the service is reported in. Defaults to the datacenter of
  the owning client node.

- `DeregisterCriticalAfter` `(int: 3600000000000)` - How long the service may stay critical before it is
  deregistered (default 1 hour); `0` keeps it.

- `Checks` `(array<Check>: nil)` - The checks of the service:

  - `ID` `(string: <type>)` - The ID of the check. Defaults to its type, numbered (`ttl:2`) if needed.
  - `Name` `(string: "<service> <type> check")` - The name of the check.
  - `Type` `(string: <required>)` - `ttl`, `http` or `tcp`.
  - `Notes` `(string: "")` - Free text.
  - `TTL` `(int: <required for ttl>)` - The TTL of a `ttl` check, at least one second.
  - `HTTP` `(string: <required for http>)` - The `http://` or `https://` URL of an `http` check.
  - `Method`, `Header`, `Body` - The request of an `http` check (`GET` by default).
  - `TLSSkipVerify`, `TLSServerName` - TLS settings of an `https` check.
  - `TCP` `(string: <required for tcp>)` - The `host:port` of a `tcp` check.
  - `Interval`, `Timeout` `(int: 10s)` - Of `http` and `tcp` checks; the interval is at least one
    second, the timeout at most the interval.
  - `InitialStatus` `(string: "passing")` - `passing`, `warning` or `critical`.

### Sample Payload

```json
{
  "Address": "10.0.5.20",
  "Port": 5432,
  "Tags": ["primary"],
  "Checks": [
    { "Type": "ttl", "TTL": 30000000000 }
  ]
}
```

### Sample Request

```shell
$ curl \
    --request PUT \
    --data @payload.json \
    https://localhost:4646/v1/service/external/legacy-pg
```

### Sample Response

```json
{
  "ID": "legacy-pg",
  "Index": 523
}
```

## Update TTL Checks

This endpoint renews the TTL checks of an external service, or sets their status.

| Method | Path                                   | Produces           |
| ------ | -------------------------------------- | ------------------ |
| `PUT`  | `/v1/service/external/:service_id/ttl` | `application/json` |

`POST` is accepted as well.

| Blocking Queries | ACL Required                          |
| ---------------- | ------------------------------------- |
| `NO`             | `namespace:register-external-service` |

### Parameters

The update is read from the body, or from the query parameters of the same name in lower case:

- `CheckID` (`check`) `(string: "")` - The check to update. By default every TTL check of the service.

- `Status` (`status`) `(string: "passing")` - `passing`, `warning` or `critical`.

- `Output` (`output`) `(string: "")` - The output recorded with a status change.

### Sample Request

```shell
$ curl \
    --request PUT \
    'https://localhost:4646/v1/service/external/legacy-pg/ttl?status=warning&output=replication+lag'
```

## Deregister External Service

This endpoint removes an external service.

| Method   | Path                               | Produces           |
| -------- | ---------------------------------- | ------------------ |
| `DELETE` | `/v1/service/external/:service_id` | `application/json` |

| Blocking Queries | ACL Required                          |
| ---------------- | ------------------------------------- |
| `NO`             | `namespace:register-external-service` |

A `DELETE` of `/v1/service/external/:id` whose ID is not an external service is handled as the
[deletion of a registration](/docs/api/services#delete-service-registration) of a service named
`external`.

### Sample Request

```shell
$ curl \
    --request DELETE \
    https://localhost:4646/v1/service/external/legacy-pg
```

## List External Services

This endpoint lists the external services of a namespace, with their health and checks.

| Method | Path                    | Produces           |
| ------ | ----------------------- | ------------------ |
| `GET`  | `/v1/services/external` | `application/json` |

| Blocking Queries | ACL Required         |
| ---------------- | -------------------- |
| `YES`            | `namespace:read-job` |

### Parameters

- `namespace` `(string: "default")` - The namespace.

- `node_id` `(string: "")` - Only the registrations owned by this client node.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/services/external
```

### Sample Response

```json
[
  {
    "ID": "legacy-pg",
    "ServiceName": "legacy-pg",
    "Namespace": "default",
    "NodeID": "",
    "Datacenter": "",
    "JobID": "",
    "AllocID": "",
    "Tags": ["primary"],
    "Address": "10.0.5.20",
    "Port": 5432,
    "Ready": true,
    "Health": "passing",
    "Checks": [
      { "ID": "ttl", "Name": "legacy-pg ttl check", "Role": "", "Status": "passing", "Output": "" }
    ],
    "HealthUpdatedAt": 1761573120000000000,
    "Meta": null,
    "Discovery": null,
    "External": {
      "Kind": "address",
      "Source": "api",
      "LocalID": "",
      "Checks": [
        {
          "ID": "ttl",
          "Name": "legacy-pg ttl check",
          "Type": "ttl",
          "Notes": "",
          "TTL": 30000000000,
          "HTTP": "",
          "Method": "",
          "Header": null,
          "Body": "",
          "TLSSkipVerify": false,
          "TLSServerName": "",
          "TCP": "",
          "Interval": 0,
          "Timeout": 0,
          "InitialStatus": "passing"
        }
      ],
      "DeregisterCriticalAfter": 3600000000000
    },
    "CreateIndex": 523,
    "ModifyIndex": 523
  }
]
```
