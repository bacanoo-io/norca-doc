---
title: "Admission Policies HTTP API"
linkTitle: "Admission Policies"
description: "The /admission-policies and /admission-policy endpoints manage the CEL admission policies of a region."
---

The `/admission-policies` and `/admission-policy` endpoints are used to manage
the CEL [admission policies](/docs/other-specifications/admission-policy) of a
region (see [dynamic admission control](/docs/features/admission-control)).
Admission policies are stored per region; they are not replicated to other
regions. Webhooks are configured in the
[server configuration](/docs/configuration/admission) and have no API.

## List Admission Policies

This endpoint lists the admission policies.

| Method | Path                      | Produces           |
| ------ | ------------------------- | ------------------ |
| `GET`  | `/v1/admission-policies`  | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required     |
| ---------------- | ---------------- |
| `YES`            | `admission:read` |

### Parameters

- `prefix` `(string: "")` - Specifies a string to filter admission policies on
  based on a name prefix. This is specified as a query string parameter.

- `filter` `(string: "")` - Specifies the [expression](/docs/api#filtering)
  used to filter the results.

- `per_page` `(int: 0)` - Specifies the maximum number of policies to return
  for this request. If omitted, the response is not paginated.

- `next_token` `(string: "")` - This endpoint supports paging. The `next_token`
  parameter accepts a string which identifies the next expected policy. This
  value can be obtained from the `X-Nomad-NextToken` header from the previous
  response.

- `reverse` `(bool: false)` - Returns the policies in reverse name order.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/admission-policies
```

### Sample Response

```json
[
  {
    "Name": "apps-baseline",
    "Description": "Baseline rules for the jobs of the apps namespace",
    "Action": "deny",
    "Match": {
      "Namespaces": ["apps"],
      "Resources": null,
      "VariablePaths": null
    },
    "SchemaFrom": "",
    "Rules": [
      {
        "Expression": "job.TaskGroups.all(g, g.Count <= 10)",
        "Message": "A task group of the apps namespace may have at most 10 instances."
      }
    ],
    "TrustedKeys": null,
    "CreateIndex": 1042,
    "ModifyIndex": 1042
  }
]
```

## Read Admission Policy

This endpoint reads an admission policy.

| Method | Path                           | Produces           |
| ------ | ------------------------------ | ------------------ |
| `GET`  | `/v1/admission-policy/:name`   | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required     |
| ---------------- | ---------------- |
| `YES`            | `admission:read` |

### Parameters

- `:name` `(string: <required>)` - Specifies the name of the admission policy.
  This is specified as part of the path.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/admission-policy/apps-baseline
```

### Sample Response

The response is a single admission policy, in the format of the list response
above. A missing policy returns `404`.

## Create or Update Admission Policy

This endpoint creates or updates an admission policy. The servers compile the
CEL expressions of the rules and reject the policy (`400`) if one of them does
not compile.

| Method         | Path                                                         | Produces           |
| -------------- | ------------------------------------------------------------ | ------------------ |
| `POST` / `PUT` | `/v1/admission-policies` <br /> `/v1/admission-policy/:name` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required      |
| ---------------- | ----------------- |
| `NO`             | `admission:write` |

### Parameters

- `:name` `(string: "")` - With the `/v1/admission-policy/:name` path, the name
  in the body must match the path.

### Sample Payload

```json
{
  "Name": "owner-required",
  "Action": "warn",
  "Match": {
    "Namespaces": ["prod-*"]
  },
  "Rules": [
    {
      "Expression": "has(job.Meta.owner) && job.Meta.owner != ''",
      "Message": "Set meta { owner = \"...\" } on the job."
    }
  ]
}
```

### Sample Request

```shell
$ curl \
    --request POST \
    --data @policy.json \
    https://localhost:4646/v1/admission-policies
```

## Delete Admission Policy

This endpoint deletes an admission policy.

| Method   | Path                         | Produces           |
| -------- | ---------------------------- | ------------------ |
| `DELETE` | `/v1/admission-policy/:name` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required      |
| ---------------- | ----------------- |
| `NO`             | `admission:write` |

### Parameters

- `:name` `(string: <required>)` - Specifies the name of the admission policy.
  This is specified as part of the path.

### Sample Request

```shell
$ curl \
    --request DELETE \
    https://localhost:4646/v1/admission-policy/owner-required
```
