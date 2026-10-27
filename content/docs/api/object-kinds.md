---
title: "Object Kinds HTTP API"
linkTitle: "Object Kinds"
description: "The /object-kind endpoints register, read and delete the kinds (types) of custom objects."
---

The `/object-kind` endpoints register, read and delete object kinds: the types of
the custom objects of the [operator framework](/docs/features/operator-framework).
The objects themselves are managed with the [objects API](/docs/api/objects).

Kinds are cluster-wide; the `namespace` parameter does not apply. Writes are
rejected until all servers of the region run a Norca version that supports
custom objects.

## List Object Kinds

This endpoint lists the object kinds the token may read.

| Method | Path               | Produces           |
| ------ | ------------------ | ------------------ |
| `GET`  | `/v1/object-kinds` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | `operator:read`, or any object capability on the kind (kinds the token can't read are left out) |

### Parameters

- `prefix` `(string: "")` - Specifies a prefix of the `group/Kind` reference to
  filter on. This is specified as a query string parameter.

- `next_token` `(string: "")` - This endpoint supports paging. The `next_token`
  parameter accepts a string which identifies the next expected kind. This value
  can be obtained from the `X-Nomad-NextToken` header from the previous
  response.

- `per_page` `(int: 0)` - Specifies a maximum number of kinds to return for this
  request. If omitted, the response is not paginated.

### Sample Request

```shell
$ curl \
    http://localhost:4646/v1/object-kinds?prefix=norca.io/
```

### Sample Response

```json
[
  {
    "Group": "norca.io",
    "Kind": "LoadBalancer",
    "Description": "Load balancer forwarding to the healthy instances of a Nomad service",
    "Namespaced": true,
    "Schema": "{\"type\": \"object\", ...}",
    "Rules": [
      {
        "Expression": "!has(oldSelf) || self.spec.internal == oldSelf.spec.internal",
        "Message": "internal can't be changed; delete and recreate the load balancer."
      }
    ],
    "Columns": [
      { "Name": "Service", "Path": "spec.service" },
      { "Name": "Ready", "Path": "status.conditions[?type=='Ready'].status" }
    ],
    "Scale": null,
    "Replicated": false,
    "Version": 1,
    "Migration": null,
    "Webhooks": null,
    "Limits": null,
    "CreateIndex": 61,
    "ModifyIndex": 61
  }
]
```

## Read Object Kind

This endpoint reads an object kind.

| Method | Path                           | Produces           |
| ------ | ------------------------------ | ------------------ |
| `GET`  | `/v1/object-kind/:group/:kind` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | `operator:read`, or any object capability on the kind |

### Parameters

- `:group` `(string: <required>)` - Specifies the group of the kind, for example
  `norca.io`. This is specified as part of the path.

- `:kind` `(string: <required>)` - Specifies the name of the kind, for example
  `LoadBalancer`. This is specified as part of the path.

### Sample Request

```shell
$ curl \
    http://localhost:4646/v1/object-kind/norca.io/LoadBalancer
```

The response is a single kind in the form shown above. A kind with webhooks
lists them with their configuration and approval:

```json
{
  "Webhooks": [
    {
      "Name": "validate",
      "Mode": "validate",
      "URL": "https://lb-webhook.internal:8443/validate",
      "CACert": "-----BEGIN CERTIFICATE-----\n...",
      "TLSServerName": "",
      "Timeout": 5000000000,
      "FailurePolicy": "fail",
      "Operations": ["create", "update"],
      "Approval": {
        "Digest": "...",
        "ApprovedBy": "...",
        "ApproveTime": 1761580000000000000
      }
    }
  ]
}
```

## Create or Update Object Kind

This endpoint creates or updates an object kind. The servers fill in the
defaults (`Version` 1; webhook `Mode` `validate`, `FailurePolicy` `fail`,
`Timeout` 5s, `Operations` create and update), compile the schema, the rules
and the migration, and check the stored objects of the kind against the new
definition.

| Method | Path                           | Produces           |
| ------ | ------------------------------ | ------------------ |
| `PUT`  | `/v1/object-kind/:group/:kind` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `operator:write` |

### Parameters

- `:group`, `:kind` `(string: <required>)` - Identify the kind. They must match
  `Group` and `Kind` of the body (which may be left empty).

- `dry_run` `(bool: false)` - Validate and compile the kind without writing it.
  This is specified as a query string parameter.

The body is the kind in the JSON form above. Unlike in the HCL format, an
omitted `Namespaced` is `false` (cluster-scoped). `Approval` fields in the body are
ignored: a write with a management token (or with ACLs disabled) approves the
webhooks, other writes keep the approvals of unchanged webhooks and leave the
others pending.

### Errors

- `400` - the kind is invalid (name, schema, rules, columns, scale, webhooks,
  limits, migration), the version is lower than the stored one, or
  `Replicated` is `true`.
- `409` - stored objects would be invalid under the new definition, or the
  scope (`Namespaced`) changes while objects exist.

### Sample Request

```shell
$ curl \
    --request PUT \
    --header "X-Nomad-Token: $NOMAD_TOKEN" \
    --data @loadbalancer.kind.json \
    http://localhost:4646/v1/object-kind/norca.io/LoadBalancer
```

The response is the stored kind.

## Plan Object Kind Change

This endpoint runs a dry run of a kind write and reports what it would do to
the stored objects. `norca object-kind apply -dry-run` uses it.

| Method | Path                                | Produces           |
| ------ | ----------------------------------- | ------------------ |
| `PUT`  | `/v1/object-kind/:group/:kind/plan` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `operator:write` |

The body is the kind, as for a write.

### Sample Response

```json
{
  "ObjectKind": { "Group": "db.example.com", "Kind": "PostgresCluster", "Version": 2 },
  "Migration": {
    "FromVersion": 1,
    "ToVersion": 2,
    "Objects": 12,
    "Pending": 12,
    "Changed": 12,
    "Failed": 1,
    "Failures": [
      { "Namespace": "prod", "Name": "billing", "Error": "..." }
    ],
    "Samples": [
      {
        "Namespace": "prod",
        "Name": "orders",
        "SpecBefore": { "size": "100GiB" },
        "SpecAfter": { "storage": "100GiB" },
        "StatusBefore": null,
        "StatusAfter": null
      }
    ]
  },
  "Warnings": null
}
```

`Objects` is the number of stored objects checked, `Pending` the number at an
older schema version, `Changed` the number the migration changes, and `Failed`
the number that would be invalid. At most 20 failures and 3 samples are
returned. `Migration` is `null` when the write does not require checking the
stored objects.

## Approve or Revoke a Webhook

These endpoints approve a type-bound webhook of a kind, or revoke its approval.
`norca object-kind webhook approve` and `revoke` use them.

| Method | Path                                                 | Produces           |
| ------ | ---------------------------------------------------- | ------------------ |
| `PUT`  | `/v1/object-kind/:group/:kind/webhook/:name/approve` | `application/json` |
| `PUT`  | `/v1/object-kind/:group/:kind/webhook/:name/revoke`  | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` |

### Sample Request

```shell
$ curl \
    --request PUT \
    --header "X-Nomad-Token: $NOMAD_TOKEN" \
    http://localhost:4646/v1/object-kind/norca.io/LoadBalancer/webhook/validate/approve
```

The response is the updated kind.

## Delete Object Kind

This endpoint deletes an object kind. A kind that still has objects can't be
deleted (`409`).

| Method   | Path                           | Produces           |
| -------- | ------------------------------ | ------------------ |
| `DELETE` | `/v1/object-kind/:group/:kind` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `operator:write` |

### Sample Request

```shell
$ curl \
    --request DELETE \
    --header "X-Nomad-Token: $NOMAD_TOKEN" \
    http://localhost:4646/v1/object-kind/norca.io/LoadBalancer
```
