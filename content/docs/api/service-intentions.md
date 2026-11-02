---
title: "Service Intentions HTTP API"
linkTitle: "Service intentions"
description: "The /v1/service-intention endpoints manage the service intentions of native mTLS."
---

The `/v1/service-intentions` and `/v1/service-intention` endpoints (Norca) manage
[service intentions](/docs/features/native-mtls/intentions). Intentions are regional: requests are
answered by the servers of the region of the request (the `region` parameter).

An intention has these fields:

| Field | Type | Description |
| --- | --- | --- |
| `Namespace` | string | Namespace of the destination service. Defaults to the namespace of the request. Never `*`. |
| `Destination` | string | Destination service, or `*` |
| `SourceNamespace` | string | Namespace of the source service, or `*`. Defaults to `Namespace`. |
| `Source` | string | Source service, or `*` |
| `Action` | string | `allow` or `deny` |
| `Description` | string | Free text, at most 1024 bytes |
| `CreateIndex`, `ModifyIndex` | int | Raft indexes (read only) |

The key of an intention is (`Namespace`, `SourceNamespace`, `Source`, `Destination`).

## List Intentions

This endpoint lists the intentions of a namespace.

| Method | Path                     | Produces           |
| ------ | ------------------------ | ------------------ |
| `GET`  | `/v1/service-intentions` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | `namespace:read-job`, or a workload identity of the namespace |

### Parameters

- `namespace` `(string: "default")` - The namespace whose intentions are listed. With `*`, the
  intentions of every namespace the caller may read.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/service-intentions?namespace=apps
```

### Sample Response

```json
[
  {
    "Namespace": "apps",
    "Destination": "test-api",
    "SourceNamespace": "apps",
    "Source": "probe",
    "Action": "allow",
    "Description": "probe reads test-api",
    "CreateIndex": 412,
    "ModifyIndex": 412
  }
]
```

## Read Intention

This endpoint reads one intention by its key. It answers `404` when the intention does not exist.

| Method | Path                    | Produces           |
| ------ | ----------------------- | ------------------ |
| `GET`  | `/v1/service-intention` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | `namespace:read-job`, or a workload identity of the namespace |

### Parameters

- `source` `(string: <required>)` - The source service, or `*`.

- `destination` `(string: <required>)` - The destination service, or `*`.

- `source_namespace` `(string: "")` - The source namespace, or `*`. Defaults to the namespace of the
  request.

- `namespace` `(string: "default")` - The namespace of the destination.

### Sample Request

```shell
$ curl \
    'https://localhost:4646/v1/service-intention?namespace=apps&source=probe&destination=test-api'
```

### Sample Response

```json
{
  "Namespace": "apps",
  "Destination": "test-api",
  "SourceNamespace": "apps",
  "Source": "probe",
  "Action": "allow",
  "Description": "probe reads test-api",
  "CreateIndex": 412,
  "ModifyIndex": 412
}
```

## Create or Replace Intention

This endpoint creates an intention, or replaces the intention with the same key.

| Method | Path                     | Produces           |
| ------ | ------------------------ | ------------------ |
| `PUT`  | `/v1/service-intention`  | `application/json` |
| `PUT`  | `/v1/service-intentions` | `application/json` |

`POST` is accepted as well.

| Blocking Queries | ACL Required                |
| ---------------- | --------------------------- |
| `NO`             | `namespace:write-intention` |

The `write-intention` capability is not part of any policy shorthand; grant it explicitly.

### Parameters

The body is an intention (see the fields above); `Source`, `Destination` and `Action` are required.

### Sample Payload

```json
{
  "Namespace": "apps",
  "Source": "probe",
  "Destination": "test-api",
  "Action": "allow",
  "Description": "probe reads test-api"
}
```

### Sample Request

```shell
$ curl \
    --request PUT \
    --data @payload.json \
    https://localhost:4646/v1/service-intention
```

## Delete Intention

This endpoint deletes an intention by its key.

| Method   | Path                    | Produces           |
| -------- | ----------------------- | ------------------ |
| `DELETE` | `/v1/service-intention` | `application/json` |

| Blocking Queries | ACL Required                |
| ---------------- | --------------------------- |
| `NO`             | `namespace:write-intention` |

### Parameters

- `source` `(string: <required>)` - The source service, or `*`.

- `destination` `(string: <required>)` - The destination service, or `*`.

- `source_namespace` `(string: "")` - The source namespace. Defaults to the namespace of the request.

- `namespace` `(string: "default")` - The namespace of the destination.

### Sample Request

```shell
$ curl \
    --request DELETE \
    'https://localhost:4646/v1/service-intention?namespace=apps&source=probe&destination=test-api'
```

## Events

Changes are published on the [event stream](/docs/api/events) topic `ServiceIntention` with the event
types `ServiceIntentionUpserted` and `ServiceIntentionDeleted`; the payload holds the `Intention`.
