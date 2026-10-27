---
title: "Namespace HTTP API"
linkTitle: "Namespace"
description: "The /namespace endpoints are used to query for and interact with namespaces."
upstream:
  path: "website/content/api-docs/namespaces.mdx"
---

The `/namespace` endpoints are used to query for and interact with namespaces.

## List Namespaces

This endpoint lists all namespaces.

| Method | Path             | Produces           |
| ------ | ---------------- | ------------------ |
| `GET`  | `/v1/namespaces` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required                                                               |
| ---------------- | -------------------------------------------------------------------------- |
| `YES`            | `namespace:*`<br />Any capability on the namespace authorizes the endpoint |

### Parameters

- `prefix` `(string: "")`- Specifies a string to filter namespaces on based on
  an index prefix. This is specified as a query string parameter.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/namespaces
```

```shell
$ curl \
    https://localhost:4646/v1/namespaces?prefix=prod
```

### Sample Response

```json
[
  {
    "Capabilities": null,
    "CreateIndex": 1,
    "Description": "Default shared namespace",
    "Meta": null,
    "ModifyIndex": 1,
    "Name": "default",
    "Quota": ""
  },
  {
    "Capabilities": null,
    "CreateIndex": 17,
    "Description": "Development Staging Namespace",
    "Meta": {
        "type": "dev",
        "contact": "helpdesk@example.com"
    },
    "ModifyIndex": 17,
    "Name": "staging",
    "Quota": ""
  }
]
```

## Read Namespace

This endpoint reads information about a specific namespace.

| Method | Path                       | Produces           |
| ------ | -------------------------- | ------------------ |
| `GET`  | `/v1/namespace/:namespace` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required                                                               |
| ---------------- | -------------------------------------------------------------------------- |
| `YES`            | `namespace:*`<br />Any capability on the namespace authorizes the endpoint |

### Parameters

- `:namespace` `(string: <required>)`- Specifies the namespace to query.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/namespace/staging
```

### Sample Response

```json
{
  "Capabilities": null,
  "CreateIndex": 17,
  "Description": "Development Staging Namespace",
  "Meta": {
    "type": "dev",
    "contact": "helpdesk@example.com"
  },
  "ModifyIndex": 17,
  "Name": "staging",
  "Quota": ""
}
```

## Create or Update Namespace

This endpoint is used to create or update a namespace.

| Method | Path                                              | Produces           |
| ------ | ------------------------------------------------- | ------------------ |
| `POST` | `/v1/namespace/:namespace` <br /> `/v1/namespace` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` |

### Parameters

- `Name` `(string: <required>)`- Specifies the namespace to create or
  update.

- `Description` `(string: "")` - Specifies an optional human-readable
  description of the namespace.

- `Meta` `(object: null)` - Optional object with string keys and values of
  metadata to attach to the namespace. Namespace metadata is not used by Norca
  and is intended for use by operators and third party tools.

- `Quota` `(string: "")` - Specifies the name of a quota specification to
  attach to the namespace. See [resource quotas](/docs/features/quotas).

- `Capabilities` `(Capabilities: <optional>)` - Specifies capabilities allowed
  in the namespace. These values are checked at job submission.

  - `EnabledTaskDrivers` `(array<string>: [])` - List of task drivers allowed
    in the namespace. If empty all task drivers are allowed.

  - `DisabledTaskDrivers` `(array<string>: [])` - List of task drivers disabled
    in the namespace.

### Sample Payload

```json
{
  "Name": "api-prod",
  "Description": "Production API Servers",
  "Meta": {
    "contact": "platform-eng@example.com"
  },
  "Quota": "prod-quota",
  "Capabilities": {
    "DisabledTaskDrivers": ["raw_exec"]
  }
}
```

### Sample Request

```shell
$ curl \
    --request POST \
    --data @namespace.json \
    https://localhost:4646/v1/namespace/api-prod
```

```shell
$ curl \
    --request POST \
    --data @namespace.json \
    https://localhost:4646/v1/namespace
```

## Delete Namespace

This endpoint is used to delete a namespace.

| Method   | Path                       | Produces           |
| -------- | -------------------------- | ------------------ |
| `DELETE` | `/v1/namespace/:namespace` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` |

### Parameters

- `:namespace` `(string: <required>)`- Specifies the namespace to delete.

### Sample Request

```shell
$ curl \
    --request DELETE \
    https://localhost:4646/v1/namespace/api-prod
```
