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

| Method | Path                   | Produces           |
| ------ | ---------------------- | ------------------ |
| `GET`  | `/v1/scaling/policies` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries), [consistency modes](/docs/api#consistency-modes) and
[required ACLs](/docs/api#acls).

| Blocking Queries | Consistency Modes | ACL Required                      |
| ---------------- | ----------------- | --------------------------------- |
| `YES`            | `all`             | `namespace:list-scaling-policies` |

### Parameters

- `job` `(string: "")` - Specifies the job ID to filter policies by.

- `type` `(string: "")` - Specifies the type of scaling policy to filter by. `horizontal` is
  the only supported value.

- `engine` `(string: "")` - (Norca) Returns only the policies of an engine:

  - `builtin` (evaluated by the [built-in autoscaler](/docs/features/autoscaler)) or
  - `external`.

  A policy without an `engine` belongs to the
  [`default_engine`](/docs/configuration/autoscaler) of the servers. **Any other
  value returns a `400` error.** An external autoscaler that runs next to the
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

| Method | Path                            | Produces           |
| ------ | ------------------------------- | ------------------ |
| `GET`  | `/v1/scaling/policy/:policy_id` | `application/json` |

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

## Read the status of a scaling policy

This endpoint reads the last evaluation of a scaling policy by the built-in
autoscaler: what its checks read and asked for, and why nothing was done when
nothing was.

| Method | Path                                   | Produces           |
| ------ | -------------------------------------- | ------------------ |
| `GET`  | `/v1/scaling/policy/:policy_id/status` | `application/json` |

| Blocking Queries | Consistency Modes | ACL Required                    |
| ---------------- | ----------------- | ------------------------------- |
| `NO`             | `none`            | `namespace:read-scaling-policy` |

**The status is kept in the memory of the leader, which always answers the
request.** The response is `null` for a policy that has not been evaluated since
the leader was elected, and for a policy of the external engine.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/scaling/policy/5e9f9ef2-5223-6d35-bac1-be0f3cb974ad/status
```

### Sample Response

```json
{
  "Time": 1794477600000000000,
  "Desired": 6,
  "Running": 4,
  "Checks": [
    {
      "Name": "cpu",
      "Value": 25,
      "HasValue": true,
      "Direction": "down",
      "Count": 2
    }
  ],
  "Count": 2,
  "Direction": "down",
  "Outcome": "held",
  "HoldReason": "settling",
  "HoldSince": 1794477540000000000,
  "Message": "4 of 6 run, not settled for 1m0s"
}
```

- `Time` `(int)` - When the policy was evaluated, in Unix nanoseconds.
- `Desired`, `Running` `(int)` - The count that was asked for (the count of the
  task group) and what ran of it. **The checks are measured against `Desired`:**
  the two differ while allocations start, wait for capacity, migrate or are
  being replaced.
- `Checks` `(array)` - The checks that were run: `Name`, the latest `Value`
  read (`HasValue` is false for a check without a measured value), the vote
  `Direction` (`up`, `down`, `none`, or `no data` for a check that was left out
  because its source gave no value) and the `Count` it asks for.
- `Count`, `Direction` `(int, string)` - The result of the checks and where it
  lies from `Desired`.
- `Outcome` `(string)` - `scaled`, `none` (the checks ask for the count the
  group has), `held` or `error`.
- `HoldReason`, `HoldSince`, `Message` - Why an evaluation was held, since when
  without a break, and the detail of a hold or an error.

| `HoldReason` | Meaning |
| --- | --- |
| `schedule` | Outside the schedule of the policy. |
| `not ready` | The job is stopped. |
| `deployment`, `canary`, `multiregion` | A deployment of the job runs, and the policy says `scale_during_deployment = "never"` or the checks ask for fewer; canaries wait for promotion; the region waits for its turn in a multiregion rollout. |
| `cooldown`, `suspended` | The cooldown after a change of the count; suspended for oscillating. |
| `settling` | A scale down is held: the group does not run what was asked for (see [`settle_timeout`](/docs/configuration/autoscaler#autoscaler-parameters)). |
| `no data` | No check has a value to decide on. |
| `quota` | The quota of the namespace has no room for one more. |
| `capacity` | A scale up is held: allocations of the group have waited for capacity for `settle_timeout`, and node scaling says none is coming. |
| `rate limit` | Dropped by the limit of scaling actions; tried again at the next interval. |

A hold for the same reason that lasts
[`hold_warn`](/docs/configuration/autoscaler#autoscaler-parameters) raises a
`ScalingHeld` [event](/docs/api/events).

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
- `ScaleDuringDeployment` `(string)` - `never`, `up_only`, or empty (`up_only`
  for the built-in engine, `never` for the external one).
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
