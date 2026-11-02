---
title: "Network Policies - HTTP API"
linkTitle: "Network Policies"
description: "The /network-policy and /admin-network-policy endpoints manage network policies and admin network policies."
---

The `/network-policies`, `/network-policy`, `/admin-network-policies` and
`/admin-network-policy` endpoints (Norca) manage
[network rules](/docs/features/network-rules). Network policies belong to a
namespace; admin network policies are cluster-wide. The HCL file format used by
the CLI is described in the
[network policy specification](/docs/other-specifications/network-policy); the
API uses the JSON form below.

All write endpoints require every server of the region to run Norca 0.1.0 or
later.

## Policy Objects

A network policy:

```json
{
  "Name": "test-app",
  "Namespace": "apps",
  "Description": "test-app: egress only to the cluster network and DNS",
  "Selector": { "app": "test-app" },
  "Ingress": null,
  "Egress": [
    { "Name": "", "Action": "", "Peers": [ { "CIDR": ["10.0.0.0/24"], "Namespace": "", "Selector": null } ], "Ports": null },
    { "Name": "", "Action": "", "Peers": null, "Ports": ["53/udp", "53/tcp"] }
  ],
  "DefaultDeny": null,
  "Enforcement": "required",
  "CreateIndex": 120,
  "ModifyIndex": 120
}
```

An admin network policy has `Priority` and `Namespaces` instead of `Namespace`
and `DefaultDeny`, and its rules must have an `Action` (`allow`, `deny` or
`pass`):

```json
{
  "Name": "no-metadata-service",
  "Description": "Block the cloud metadata service for all workloads",
  "Priority": 10,
  "Namespaces": ["*"],
  "Selector": null,
  "Ingress": null,
  "Egress": [
    { "Name": "metadata", "Action": "deny", "Peers": [ { "CIDR": ["169.254.169.254/32"], "Namespace": "", "Selector": null } ], "Ports": null }
  ],
  "Enforcement": "best_effort",
  "CreateIndex": 118,
  "ModifyIndex": 118
}
```

A peer (`NetworkPolicyPeer`) is either `{"CIDR": [...]}` or
`{"Namespace": "...", "Selector": {...}}` (allocations on the same node). The
fields, defaults and limits are those of the
[specification](/docs/other-specifications/network-policy).

## List Network Policies

This endpoint lists the network policies of a namespace.

| Method | Path                    | Produces           |
| ------ | ----------------------- | ------------------ |
| `GET`  | `/v1/network-policies`  | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required                      |
| ---------------- | --------------------------------- |
| `YES`            | `namespace:read-network-policy`   |

### Parameters

- `namespace` `(string: "default")` - Specifies the namespace. `*` lists the
  policies of every namespace the token can read.

- `prefix` `(string: "")` - Filters the policies by a name prefix.

- `filter` `(string: "")` - Specifies the [expression](/docs/api#filtering)
  used to filter the results.

- `per_page` `(int: 0)` - Specifies a maximum number of policies to return for
  this request.

- `next_token` `(string: "")` - Indicates where to start paging for queries
  that support pagination.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/network-policies?namespace=apps
```

### Sample Response

A list of network policy objects.

## Read Network Policy

| Method | Path                         | Produces           |
| ------ | ---------------------------- | ------------------ |
| `GET`  | `/v1/network-policy/:name`   | `application/json` |

| Blocking Queries | ACL Required                    |
| ---------------- | ------------------------------- |
| `YES`            | `namespace:read-network-policy` |

### Parameters

- `:name` `(string: <required>)` - The name of the policy, in the path.

- `namespace` `(string: "default")` - The namespace of the policy.

Returns `404` if the policy does not exist.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/network-policy/test-app?namespace=apps
```

## Create or Update Network Policy

| Method         | Path                         | Produces |
| -------------- | ---------------------------- | -------- |
| `PUT` / `POST` | `/v1/network-policy/:name`   | none     |
| `PUT` / `POST` | `/v1/network-policies`       | none     |

| Blocking Queries | ACL Required                     |
| ---------------- | -------------------------------- |
| `NO`             | `namespace:write-network-policy` |

### Parameters

- `:name` `(string)` - The name of the policy. It must match `Name` in the
  payload.

- `namespace` `(string: "default")` - The namespace of the policy if the
  payload has no `Namespace`. The namespace must exist.

The payload is a network policy object. `Enforcement` defaults to `required`.

### Sample Request

```shell
$ curl \
    --request PUT \
    --data @netpol.json \
    https://localhost:4646/v1/network-policy/test-app
```

## Delete Network Policy

| Method   | Path                         | Produces |
| -------- | ---------------------------- | -------- |
| `DELETE` | `/v1/network-policy/:name`   | none     |

| Blocking Queries | ACL Required                     |
| ---------------- | -------------------------------- |
| `NO`             | `namespace:write-network-policy` |

### Parameters

- `:name` `(string: <required>)` - The name of the policy, in the path.

- `namespace` `(string: "default")` - The namespace of the policy.

### Sample Request

```shell
$ curl \
    --request DELETE \
    https://localhost:4646/v1/network-policy/test-app?namespace=apps
```

## Read Network Policy Status

This endpoint lists the non-terminal allocations a network policy selects and
whether their node can enforce the rules. Allocations are returned only from
namespaces in which the token has `read-job`.

| Method | Path                               | Produces           |
| ------ | ---------------------------------- | ------------------ |
| `GET`  | `/v1/network-policy/:name/status`  | `application/json` |

| Blocking Queries | ACL Required                    |
| ---------------- | ------------------------------- |
| `YES`            | `namespace:read-network-policy` |

### Parameters

- `:name` `(string: <required>)` - The name of the policy, in the path.

- `namespace` `(string: "default")` - The namespace of the policy.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/network-policy/test-app/status?namespace=apps
```

### Sample Response

```json
[
  {
    "ID": "6f1c2a9e-0b5d-4f3e-9a71-2d8c4e6b1f05",
    "Namespace": "apps",
    "JobID": "test-app",
    "TaskGroup": "web",
    "NodeID": "f4e8a9e5-30d8-3536-1e6f-cda5c869c35e",
    "NodeName": "node-1",
    "NetworkMode": "bridge",
    "Enforceable": true,
    "Reason": ""
  }
]
```

## List Admin Network Policies

This endpoint lists the admin network policies in evaluation order (priority,
then name).

| Method | Path                          | Produces           |
| ------ | ----------------------------- | ------------------ |
| `GET`  | `/v1/admin-network-policies`  | `application/json` |

| Blocking Queries | ACL Required    |
| ---------------- | --------------- |
| `YES`            | `operator:read` |

### Parameters

- `prefix` `(string: "")` - Filters the policies by a name prefix.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/admin-network-policies
```

## Read Admin Network Policy

| Method | Path                               | Produces           |
| ------ | ---------------------------------- | ------------------ |
| `GET`  | `/v1/admin-network-policy/:name`   | `application/json` |

| Blocking Queries | ACL Required    |
| ---------------- | --------------- |
| `YES`            | `operator:read` |

Returns `404` if the policy does not exist.

## Create or Update Admin Network Policy

| Method         | Path                               | Produces |
| -------------- | ---------------------------------- | -------- |
| `PUT` / `POST` | `/v1/admin-network-policy/:name`   | none     |
| `PUT` / `POST` | `/v1/admin-network-policies`       | none     |

| Blocking Queries | ACL Required     |
| ---------------- | ---------------- |
| `NO`             | `operator:write` |

The payload is an admin network policy object; `:name` must match its `Name`.

### Sample Request

```shell
$ curl \
    --request PUT \
    --data @admin-netpol.json \
    https://localhost:4646/v1/admin-network-policy/no-metadata-service
```

## Delete Admin Network Policy

| Method   | Path                               | Produces |
| -------- | ---------------------------------- | -------- |
| `DELETE` | `/v1/admin-network-policy/:name`   | none     |

| Blocking Queries | ACL Required     |
| ---------------- | ---------------- |
| `NO`             | `operator:write` |

## Read Admin Network Policy Status

Lists the non-terminal allocations the admin policy selects, in the same form
as [Read Network Policy Status](#read-network-policy-status).

| Method | Path                                      | Produces           |
| ------ | ----------------------------------------- | ------------------ |
| `GET`  | `/v1/admin-network-policy/:name/status`   | `application/json` |

| Blocking Queries | ACL Required    |
| ---------------- | --------------- |
| `YES`            | `operator:read` |

## Events

Changes are published on the event stream topic `NetworkPolicy` with the types
`NetworkPolicyUpserted`, `NetworkPolicyDeleted`, `AdminNetworkPolicyUpserted`
and `AdminNetworkPolicyDeleted`. See the [events API](/docs/api/events).
