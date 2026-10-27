---
title: "Custom Objects HTTP API"
linkTitle: "Custom Objects"
description: "The /object endpoints read and write custom objects and their status, finalizers, event log and scale subresources."
---

The `/objects` and `/object` endpoints manage custom objects of the kinds
registered with the [object kinds API](/docs/api/object-kinds). See the
[operator framework](/docs/features/operator-framework) for the concepts.

Objects of a namespaced kind are addressed in a namespace, given with the
`namespace` query parameter (default `default`). Objects of a cluster-scoped kind
have no namespace.

Common behavior of the write endpoints:

- `cas` `(int: <optional>)` - Only write if the stored object has this modify
  index (`0`: only create). On a mismatch the write fails with `409 Conflict`.
  This is specified as a query string parameter.
- `dry_run` `(bool: false)` - Run the defaults, webhooks and validation and
  return the result without writing it. This is specified as a query string
  parameter.
- Writes over a [limit of the kind](/docs/features/operator-framework/ecosystem#limits)
  fail with `429 Too Many Requests`.
- A write rejected by the `managed_by` identity of the object, or by a
  type-bound webhook (failure policy `fail`), fails with `403`.
- Objects larger than 256 KiB in JSON are rejected with `413`.

## List Objects

This endpoint lists the objects of a kind.

| Method | Path                       | Produces           |
| ------ | -------------------------- | ------------------ |
| `GET`  | `/v1/objects/:group/:kind` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | object `read` on the kind |

### Parameters

- `namespace` `(string: "default")` - Specifies the namespace; `*` lists the
  objects of all namespaces the token can read. This is specified as a query
  string parameter.

- `label` `(string: "")` - Selects objects by a label, as `key=value`. Can be
  given several times; objects must have all the labels. This is specified as a
  query string parameter.

- `filter` `(string: "")` - Specifies the [expression](/docs/api#filtering)
  used to filter the results.

- `next_token` `(string: "")` - This endpoint supports paging. The `next_token`
  parameter accepts a string which identifies the next expected object. This
  value can be obtained from the `X-Nomad-NextToken` header from the previous
  response.

- `per_page` `(int: 0)` - Specifies a maximum number of objects to return for
  this request. If omitted, the response is not paginated.

### Sample Request

```shell
$ curl \
    "http://localhost:4646/v1/objects/norca.io/LoadBalancer?label=team=web"
```

### Sample Response

```json
[
  {
    "ID": "6b0e6f2c-5b7e-2a8d-36d1-0f5e1a2b3c4d",
    "Group": "norca.io",
    "Kind": "LoadBalancer",
    "Namespace": "default",
    "Name": "web",
    "Labels": { "team": "web" },
    "ManagedBy": "",
    "Owners": null,
    "Finalizers": ["norca.io/loadbalancer-cleanup"],
    "DeletionTime": 0,
    "DeletionPropagation": "",
    "Generation": 1,
    "KindVersion": 1,
    "Spec": {
      "service": "web",
      "port": 8080,
      "class": "nomad",
      "internal": false,
      "replicas": 1,
      "datacenters": ["*"]
    },
    "Status": {
      "observedGeneration": 1,
      "class": "nomad",
      "addresses": ["10.0.0.5:8080"],
      "conditions": [
        { "type": "Ready", "status": "True", "reason": "Ready", "message": "forwarding to 2 targets" }
      ]
    },
    "CreateTime": 1761580000000000000,
    "ModifyTime": 1761580005000000000,
    "CreateIndex": 72,
    "ModifyIndex": 75
  }
]
```

## Read Object

This endpoint reads an object.

| Method | Path                                 | Produces           |
| ------ | ------------------------------------ | ------------------ |
| `GET`  | `/v1/object/:group/:kind/:name`      | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | object `read` on the kind |

### Sample Request

```shell
$ curl \
    http://localhost:4646/v1/object/norca.io/LoadBalancer/web
```

The response is a single object in the form shown above.

## Create or Update Object

This endpoint creates or updates the spec and the metadata of an object. The
server fills in the schema defaults, runs the type-bound webhooks, validates the
object against the schema and the CEL rules, and increases `Generation` when the
spec changed. The status is kept. `Labels`, `ManagedBy` and `Owners` are
replaced; `Finalizers` in the body are added to the stored ones.

| Method | Path                            | Produces           |
| ------ | ------------------------------- | ------------------ |
| `PUT`  | `/v1/object/:group/:kind/:name` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `write` on the kind; `manage-finalizers` to add finalizers |

### Parameters

- `:group`, `:kind`, `:name` `(string: <required>)` - Identify the object. They
  must match the body (which may leave them empty).
- `namespace`, `cas`, `dry_run` - See above. The namespace can also be given in
  the body.

### Sample Payload

```json
{
  "Namespace": "default",
  "Labels": { "team": "web" },
  "Spec": { "service": "web", "port": 8080 }
}
```

### Sample Request

```shell
$ curl \
    --request PUT \
    --header "X-Nomad-Token: $NOMAD_TOKEN" \
    --data @payload.json \
    http://localhost:4646/v1/object/norca.io/LoadBalancer/web?cas=0
```

The response is the stored object (for a dry run, the object as it would be
stored).

## Delete Object

This endpoint deletes an object. An object with finalizers is only marked for
deletion (`DeletionTime` and `DeletionPropagation` are set) and the marked
object is returned; it disappears when its finalizers are removed.

| Method   | Path                            | Produces           |
| -------- | ------------------------------- | ------------------ |
| `DELETE` | `/v1/object/:group/:kind/:name` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `write` on the kind |

### Parameters

- `propagation` `(string: "background")` - What happens to the objects and jobs
  the object owns: `background`, `foreground` or `orphan`. See
  [Lifecycle](/docs/features/operator-framework/lifecycle#owners-and-garbage-collection).
  This is specified as a query string parameter.
- `namespace`, `cas`, `dry_run` - See above.

### Sample Request

```shell
$ curl \
    --request DELETE \
    --header "X-Nomad-Token: $NOMAD_TOKEN" \
    "http://localhost:4646/v1/object/norca.io/LoadBalancer/web?propagation=foreground"
```

## Update the Status

This endpoint replaces the status of an object. Controllers use it; the spec is
not changed and the generation does not increase. The status is validated
against the schema and the CEL rules (with `request.operation = "status"`).

| Method | Path                                   | Produces           |
| ------ | -------------------------------------- | ------------------ |
| `PUT`  | `/v1/object/:group/:kind/:name/status` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `write-status` on the kind |

### Sample Payload

```json
{
  "Status": {
    "observedGeneration": 1,
    "addresses": ["10.0.0.5:8080"],
    "conditions": [
      { "type": "Ready", "status": "True", "reason": "Ready" }
    ]
  }
}
```

The `namespace`, `cas` and `dry_run` parameters apply. The response is the
stored object.

## Update the Finalizers

This endpoint adds and removes finalizers. Removing the last finalizer of an
object marked for deletion deletes it. Finalizers can't be added to an object
marked for deletion (`409`).

| Method | Path                                       | Produces           |
| ------ | ------------------------------------------ | ------------------ |
| `PUT`  | `/v1/object/:group/:kind/:name/finalizers` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `manage-finalizers` on the kind |

### Sample Payload

```json
{
  "Add": [],
  "Remove": ["norca.io/loadbalancer-cleanup"]
}
```

The `namespace`, `cas` and `dry_run` parameters apply. The response is the
object with the new finalizers; when that removed the last finalizer of an
object marked for deletion, the object is then removed.

## Read the Event Log

This endpoint returns the event log of an object, oldest first.

| Method | Path                                   | Produces           |
| ------ | -------------------------------------- | ------------------ |
| `GET`  | `/v1/object/:group/:kind/:name/events` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | object `read` on the kind |

### Sample Response

```json
[
  {
    "Type": "Normal",
    "Reason": "Ready",
    "Message": "forwarding 10.0.0.5:8080 to 2 targets",
    "Reporter": "...",
    "Meta": null,
    "Count": 3,
    "FirstTime": 1761580005000000000,
    "LastTime": 1761580125000000000,
    "Index": 80
  }
]
```

## Record Events

This endpoint adds events to the log of an object (at most 10 per request). The
server sets `Reporter`, the times and the count; a repetition of the newest
event increases its count. The log keeps the last 20 events.

| Method | Path                                   | Produces           |
| ------ | -------------------------------------- | ------------------ |
| `PUT`  | `/v1/object/:group/:kind/:name/events` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `write-events` on the kind |

### Sample Payload

```json
{
  "Events": [
    { "Type": "Warning", "Reason": "ProvisioningFailed", "Message": "no healthy targets" }
  ]
}
```

`Type` is `Normal` (default) or `Warning`; `Reason` is a short CamelCase word.

## Read the Scale

This endpoint returns the scale subresource of an object of a kind with a
`scale` block.

| Method | Path                                  | Produces           |
| ------ | ------------------------------------- | ------------------ |
| `GET`  | `/v1/object/:group/:kind/:name/scale` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | object `read` on the kind |

### Sample Response

```json
{
  "Group": "db.example.com",
  "Kind": "PostgresCluster",
  "Namespace": "prod",
  "Name": "billing",
  "Replicas": 3,
  "StatusReplicas": 3,
  "SpecPath": "spec.replicas",
  "StatusPath": "status.replicas",
  "Generation": 4,
  "ModifyIndex": 120
}
```

## Set the Scale

This endpoint sets the replica count of an object at the spec path of its kind.
The change is validated like a spec change and recorded as a `Scaled` event.
The `managed_by` identity of the object is not enforced.

| Method | Path                                  | Produces           |
| ------ | ------------------------------------- | ------------------ |
| `PUT`  | `/v1/object/:group/:kind/:name/scale` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `write` on the kind |

### Sample Payload

```json
{
  "Replicas": 5,
  "Message": "quarter end",
  "Meta": { "source": "manual" }
}
```

`Replicas` is required. The `namespace`, `cas` and `dry_run` parameters apply.
The response is the scale in the form shown above.
