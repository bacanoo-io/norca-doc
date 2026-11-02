---
title: "Quotas HTTP API"
linkTitle: "Quotas"
description: "The /quota endpoints are used to query for and interact with quota specifications and their usage."
upstream:
  path: "website/content/api-docs/quotas.mdx"
---

The `/quota` endpoints are used to query for and interact with quota
specifications (see [namespace quotas](/docs/features/quotas)). Quota
specifications are written in the authoritative region and replicated to the
other regions; the usage endpoints return the usage of the region that answers
the request.

The examples below show the fields that quotas use; the `RegionLimit`,
`TaskDefaults` and `TaskMax` objects of a response also contain the other
resource fields of a task (`DiskMB`, `Networks` and so on) with zero values.

## List Quota Specifications

This endpoint lists all quota specifications.

| Method | Path         | Produces           |
| ------ | ------------ | ------------------ |
| `GET`  | `/v1/quotas` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | `quota:read` |

### Parameters

- `prefix` `(string: "")`- Specifies a string to filter quota specifications on
  based on a name prefix. This is specified as a query string parameter.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/quotas
```

```shell
$ curl \
    https://localhost:4646/v1/quotas?prefix=sha
```

### Sample Response

```json
[
  {
    "CreateIndex": 8,
    "Description": "Limit the shared default namespace",
    "Enforce": "schedule",
    "Hash": "SgDCH7L5ZDqNSi2NmJlqdvczt/Q6mjyVwVJC0XjWglQ=",
    "Limits": [
      {
        "Allocations": 100,
        "Hash": "NLOoV2WBU8ieJIrYXXx8NRb5C2xU61pVVWRDLEIMxlU=",
        "Region": "global",
        "RegionLimit": {
          "CPU": 2500,
          "MemoryMB": 2000,
          "MemoryMaxMB": 0
        },
        "VariablesLimit": 1000
      }
    ],
    "ModifyIndex": 56,
    "Name": "shared-quota",
    "TaskDefaults": {
      "CPU": 100,
      "MemoryMB": 256,
      "MemoryMaxMB": 0
    },
    "TaskMax": {
      "CPU": 1000,
      "Cores": 0,
      "MemoryMB": 1000,
      "MemoryMaxMB": 0
    }
  }
]
```

## Read Quota Specification

This endpoint reads information about a specific quota specification.

| Method | Path               | Produces           |
| ------ | ------------------ | ------------------ |
| `GET`  | `/v1/quota/:quota` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | `quota:read` |

### Parameters

- `:quota` `(string: <required>)`- Specifies the quota specification to query
  where the identifier is the quota's name.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/quota/shared-quota
```

### Sample Response

The response is a single quota specification, in the format of the list
response above. A missing quota returns `404`.

## Create or Update Quota Specification

This endpoint is used to create or update a quota specification. The request is
forwarded to the authoritative region.

| Method         | Path                                  | Produces           |
| -------------- | ------------------------------------- | ------------------ |
| `POST` / `PUT` | `/v1/quota/:quota` <br /> `/v1/quota` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required  |
| ---------------- | ------------- |
| `NO`             | `quota:write` |

### Body

The request body contains a valid, JSON quota specification (see the
[JSON form](/docs/other-specifications/quota#json-form) of the specification).
With the `/v1/quota/:quota` path, the name in the body must match the path.

### Sample Payload

```json
{
  "Name": "shared-quota",
  "Description": "Limit the shared default namespace",
  "Limits": [
    {
      "Region": "global",
      "RegionLimit": {
        "CPU": 2500,
        "MemoryMB": 1000
      },
      "Allocations": 100
    }
  ],
  "TaskDefaults": {
    "CPU": 100,
    "MemoryMB": 256
  },
  "Enforce": "schedule"
}
```

### Sample Request

```shell
$ curl \
    --request POST \
    --data @spec.json \
    https://localhost:4646/v1/quota/shared-quota
```

```shell
$ curl \
    --request POST \
    --data @spec.json \
    https://localhost:4646/v1/quota
```

## Delete Quota Specification

This endpoint is used to delete a quota specification. A quota that is still
attached to a namespace cannot be deleted.

| Method   | Path               | Produces           |
| -------- | ------------------ | ------------------ |
| `DELETE` | `/v1/quota/:quota` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required  |
| ---------------- | ------------- |
| `NO`             | `quota:write` |

### Parameters

- `:quota` `(string: <required>)`- Specifies the quota specification to delete
  where the identifier is the quota's name.

### Sample Request

```shell
$ curl \
    --request DELETE \
    https://localhost:4646/v1/quota/shared-quota
```

## List Quota Usages

This endpoint lists the usage of all quotas in the region.

| Method | Path               | Produces           |
| ------ | ------------------ | ------------------ |
| `GET`  | `/v1/quota-usages` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | `quota:read` |

### Parameters

- `prefix` `(string: "")`- Specifies a string to filter quota usages on based on
  a name prefix. This is specified as a query string parameter.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/quota-usages
```

```shell
$ curl \
    https://localhost:4646/v1/quota-usages?prefix=sha
```

### Sample Response

`Used` is keyed by the hash of the limit (the `Hash` of the entry in `Limits`).
The resource fields of each entry hold the amount used instead of the limit;
`VariablesLimit` holds the size of the Variables in MB and `Allocations` the
number of non-terminal allocations.

```json
[
  {
    "Used": {
      "NLOoV2WBU8ieJIrYXXx8NRb5C2xU61pVVWRDLEIMxlU=": {
        "Region": "global",
        "RegionLimit": {
          "CPU": 500,
          "MemoryMB": 256,
          "MemoryMaxMB": 256
        },
        "VariablesLimit": 1,
        "Allocations": 2,
        "Hash": "NLOoV2WBU8ieJIrYXXx8NRb5C2xU61pVVWRDLEIMxlU="
      }
    },
    "Name": "shared-quota",
    "CreateIndex": 8,
    "ModifyIndex": 56
  }
]
```

## Read Quota Usage

This endpoint reads the usage of a specific quota in the region.

| Method | Path                     | Produces           |
| ------ | ------------------------ | ------------------ |
| `GET`  | `/v1/quota/usage/:quota` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | `quota:read` |

### Parameters

- `:quota` `(string: <required>)`- Specifies the quota specification to query
  where the identifier is the quota's name.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/quota/usage/shared-quota
```

### Sample Response

The response is a single usage object, in the format of the list response
above. Pass the `region` query parameter to read the usage of another region.
