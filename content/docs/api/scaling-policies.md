---
title: "Scaling Policies HTTP API"
linkTitle: "Scaling Policies"
description: "The /scaling/policy endpoints are used to list and view scaling policies."
upstream:
  path: "website/content/api-docs/scaling-policies.mdx"
---

The `/scaling/policies` and `/scaling/policy/` endpoints are used to list and view scaling policies.

## List Scaling Policies

This endpoint returns the scaling policies from all jobs.

| Method | Path                | Produces           |
| ------ | ------------------- | ------------------ |
| `GET`  | `/scaling/policies` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries), [consistency modes](/docs/api#consistency-modes) and
[required ACLs](/docs/api#acls).

| Blocking Queries | Consistency Modes | ACL Required                      |
| ---------------- | ----------------- | --------------------------------- |
| `YES`            | `all`             | `namespace:list-scaling-policies` |

### Parameters

- `job` `(string: "")`- Specifies the job ID to filter policies by.

- `type` `(string: "")` - Specifies the type of scaling policy to filter by. `horizontal` is
  the only supported value.

- `engine` `(string: "")` - (Norca) Returns only the policies of an engine:
  `builtin` (evaluated by the [built-in autoscaler](/docs/features/autoscaler)) or
  `external`. A policy without an `engine` belongs to the
  [`default_engine`](/docs/configuration/autoscaler) of the servers. Any other
  value returns a `400` error. An external autoscaler that runs next to the
  built-in one lists its policies with `engine=external`.

Each entry of the response also has an `Engine` field (Norca): the engine set in
the job, or an empty string if the policy uses the default engine.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/scaling/policies
```

```shell
$ curl \
    https://localhost:4646/v1/scaling/policies?job=example
```

```shell
$ curl \
    https://localhost:4646/v1/scaling/policies?engine=builtin
```

### Sample Response

```json
[
  {
    "ID": "31a53813-24df-b2ad-77dc-1b4bad4e7dca",
    "Enabled": true,
    "Type": "horizontal",
    "Engine": "builtin",
    "Target": {
      "Job": "example",
      "Group": "cache",
      "Namespace": "default"
    },
    "CreateIndex": 1358,
    "ModifyIndex": 1358
  }
]
```

## Read Scaling Policy

This endpoint reads a specific scaling policy.

| Method | Path                         | Produces           |
| ------ | ---------------------------- | ------------------ |
| `GET`  | `/scaling/policy/:policy_id` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries), [consistency modes](/docs/api#consistency-modes) and
[required ACLs](/docs/api#acls).

| Blocking Queries | Consistency Modes | ACL Required                    |
| ---------------- | ----------------- | ------------------------------- |
| `YES`            | `all`             | `namespace:read-scaling-policy` |

### Parameters

- `:policy_id` `(string: <required>)` - Specifies the ID of the scaling policy (as returned
  by the scaling policy list endpoint). This is specified as part of the path.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/scaling/policy/5e9f9ef2-5223-6d35-bac1-be0f3cb974ad
```

### Sample Response

```json
{
  "CreateIndex": 10,
  "Enabled": true,
  "ID": "5e9f9ef2-5223-6d35-bac1-be0f3cb974ad",
  "Type": "horizontal",
  "Max": 10,
  "Min": 0,
  "ModifyIndex": 10,
  "Policy": {
    "engage": true,
    "foo": "bar",
    "howdy": "doody",
    "value": 6.0
  },
  "Target": {
    "Group": "cache",
    "Job": "example",
    "Namespace": "default"
  }
}
```

## Norca extensions

In Norca a scaling policy carries, next to the original `Policy` document, the
typed policy that the servers parsed from it when the job was submitted (see the
[`scaling` block](/docs/job-specification/scaling#norca-typed-policy)). Both are
returned by the read endpoint:

- `Engine` `(string)` - `builtin`, `external`, or empty for the default engine
  of the servers.
- `EvaluationInterval`, `Cooldown`, `CooldownOnScaleUp` `(int)` - Durations in
  nanoseconds; zero means the server default.
- `OnCheckError` `(string)` - `fail`, `ignore`, or empty.
- `ScaleDuringDeployment` `(string)` - `never`, `up_only`, or empty.
- `Checks` `(array)` - One object per check with `Name`, `Source`, `Metric`,
  `Query`, `QueryWindow`, `QueryWindowOffset` (nanoseconds), `QueryInstant`,
  `Group`, `Strategy`, `StrategyConfig` (a map of strings) and `OnError`.

```json
{
  "ID": "5e9f9ef2-5223-6d35-bac1-be0f3cb974ad",
  "Type": "horizontal",
  "Engine": "builtin",
  "Enabled": true,
  "Min": 3,
  "Max": 6,
  "Policy": {
    "evaluation_interval": "30s",
    "cooldown": "2m",
    "check": [
      {
        "cpu": [
          {
            "metric": "nomad.cpu",
            "strategy": "target-value",
            "target": 70
          }
        ]
      }
    ]
  },
  "EvaluationInterval": 30000000000,
  "Cooldown": 120000000000,
  "CooldownOnScaleUp": 0,
  "OnCheckError": "",
  "ScaleDuringDeployment": "",
  "Checks": [
    {
      "Name": "cpu",
      "Source": "",
      "Metric": "nomad.cpu",
      "Query": "",
      "QueryWindow": 0,
      "QueryWindowOffset": 0,
      "QueryInstant": false,
      "Group": "",
      "Strategy": "target-value",
      "StrategyConfig": {
        "target": "70"
      },
      "OnError": ""
    }
  ],
  "Target": {
    "Group": "web",
    "Job": "test-app",
    "Namespace": "apps"
  },
  "CreateIndex": 10,
  "ModifyIndex": 10
}
```
