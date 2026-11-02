---
title: "Secret Engines HTTP API"
linkTitle: "Secret engines"
description: "The /secret-engines, /secret-engine, /secret-leases and /secret-lease endpoints manage the dynamic secrets engines of the built-in secret store and their leases (Norca)."
---

The `/secret-engine{s}` and `/secret-lease{s}` endpoints (Norca) manage the
[dynamic secrets engines](/docs/features/secrets/dynamic) of the built-in secret store and the leases of
the credentials they create. Neither an engine nor a lease contains a credential: an engine names the
service of its operator, a lease holds the operator's reference of its credential. Credentials are created for tasks only, by their client
over the server RPC (`SecretLease.Create`, `Renew`, `Revoke` with the task's workload identity); there is
no HTTP endpoint that returns one. For the CLI, see [`norca secret engine`](/docs/commands/secret/engine)
and [`norca secret lease`](/docs/commands/secret/lease).

All endpoints act on the namespace given with the `namespace` query parameter (default `default`).
Writes and revocations are executed by the leader and audited (operations
`engine-write`, `engine-delete`, `lease-revoke` on the `SecretAccess` topic). While the
secret store is sealed, writes fail with status 503.

## List Engines

| Method | Path                 | Produces           |
|--------|----------------------|--------------------|
| `GET`  | `/v1/secret-engines` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `YES` | `namespace:read-secret-engine` |

### Parameters

- `prefix` `(string: "")` - Only engines whose name starts with the prefix.
- `namespace` `(string: "default")` - The namespace; `*` lists the engines of all namespaces the token
  may read.
- `per_page` `(int: 0)`, `next_token` `(string: "")` - Pagination.

### Sample Response

```json
[
  {
    "Namespace": "apps",
    "Name": "postgres",
    "Type": "operator",
    "Description": "Orders database",
    "Roles": ["app"],
    "CreateIndex": 120,
    "ModifyIndex": 120,
    "CreateTime": 1793462400000000000,
    "ModifyTime": 1793462400000000000
  }
]
```

## Read an Engine

| Method | Path                       | Produces           |
|--------|----------------------------|--------------------|
| `GET`  | `/v1/secret-engine/:name`  | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `YES` | `namespace:read-secret-engine` |

Returns 404 if there is no engine of that name.

### Sample Response

```json
{
  "Namespace": "apps",
  "Name": "postgres",
  "Type": "operator",
  "Description": "Orders database",
  "Operator": {
    "Service": "postgres-operator"
  },
  "Roles": [
    {
      "Name": "app",
      "TTL": 3600000000000,
      "MaxTTL": 86400000000000,
      "Config": { "database": "orders" },
      "Params": ["schema"]
    }
  ],
  "CreateIndex": 120,
  "ModifyIndex": 131,
  "CreateTime": 1793462400000000000,
  "ModifyTime": 1793466000000000000
}
```

## Create or Update an Engine

| Method | Path                      | Produces           |
|--------|---------------------------|--------------------|
| `PUT`  | `/v1/secret-engine/:name` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `NO` | `namespace:write-secret-engine` |

The operator may start after its engine: the write doesn't call it. The type of an existing engine can't be
changed. An invalid configuration fails with 400.

### Parameters

- `cas` `(int: <optional>)` - Write only if the engine's modify index is the given one; `0` creates an
  engine that must not exist yet. A mismatch fails with 409.

### Payload

- `Name` `(string)` - The engine name (letters, digits, `-`, `_`; at most 64). Must match the path.
- `Type` `(string: <required>)` - `operator`.
- `Description` `(string: "")`.
- `Operator` `(object: <required>)`:
  - `Service` `(string: <required>)` - The service of the operator in the native catalog.
  - `Namespace` `(string: "")` - The namespace of the service; by default that of the engine.
- `Roles` - At least one; each with:
  - `Name` `(string: <required>)`.
  - `TTL` `(duration: 1h)` - The lease duration; a renewal extends the lease by it. At least 1s.
  - `MaxTTL` `(duration: 24h, or TTL if longer)` - The longest life of a credential; at least `TTL`.
  - `Config` `(map[string]string: nil)` - Passed to the operator. It must hold nothing secret.
  - `Params` `([]string: nil)` - The keys of the `params` a job may send.

Durations are nanoseconds in JSON.

### Sample Request

```shell
$ curl -X PUT -H "X-Nomad-Token: $NORCA_TOKEN" -d @postgres.json \
    "https://localhost:4646/v1/secret-engine/postgres?namespace=apps&cas=0"
```

### Sample Response

```json
{
  "Engine": { "Namespace": "apps", "Name": "postgres", "...": "..." }
}
```

## Delete an Engine

| Method   | Path                      | Produces           |
|----------|---------------------------|--------------------|
| `DELETE` | `/v1/secret-engine/:name` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `NO` | `namespace:write-secret-engine` |

Fails with 409 while the engine has live leases (revoke them first). The ended leases are removed with
the engine. `cas` makes the delete conditional.

## Revoke the Leases of an Engine

| Method | Path                             | Produces           |
|--------|----------------------------------|--------------------|
| `POST` | `/v1/secret-engine/:name/revoke` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `NO` | `namespace:write-secret-engine` |

Revokes every live lease of the engine (reason `operator`) and returns their IDs:
`{"Revoked": ["2b0f4f8e-..."]}`. The leader then pushes the revocations to the backend.

## Leases

### List Leases

| Method | Path                | Produces           |
|--------|---------------------|--------------------|
| `GET`  | `/v1/secret-leases` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `YES` | `namespace:read-secret-engine` |

Parameters: `engine` (only the leases of this engine), `namespace` (`*` for all namespaces the token may
read), `prefix` (a lease ID prefix), `per_page`, `next_token`. Revoked leases are listed until their
credential has expired.

```json
[
  {
    "ID": "2b0f4f8e-7c1d-4d55-9a8e-3f7d1e2c9b10",
    "Namespace": "apps",
    "Engine": "postgres",
    "EngineType": "operator",
    "Role": "app",
    "SecretName": "db",
    "AllocID": "5b1c9a3e-...",
    "JobID": "worker",
    "TaskGroup": "worker",
    "Task": "worker",
    "NodeID": "f1e2d3c4-...",
    "TTL": 3600000000000,
    "MaxTTL": 86400000000000,
    "IssueTime": 1793462460000000000,
    "ExpireTime": 1793467860000000000,
    "MaxExpireTime": 1793548860000000000,
    "RenewTime": 1793464260000000000,
    "Renewals": 1,
    "Revoked": false,
    "BackendRef": "v-app-2b0f4f8e",
    "CreateIndex": 140,
    "ModifyIndex": 152
  }
]
```

### Read a Lease

| Method | Path                    | Produces           |
|--------|-------------------------|--------------------|
| `GET`  | `/v1/secret-lease/:id`  | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `YES` | `namespace:read-secret-engine` of the lease's namespace |

### Revoke a Lease

| Method | Path                          | Produces           |
|--------|-------------------------------|--------------------|
| `POST` | `/v1/secret-lease/:id/revoke` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `NO` | `namespace:write-secret-engine` of the lease's namespace (or the workload identity of the lease's task) |

Revokes the lease (reason `operator`; `allocation-stopped` when its task revokes it) and returns
`{"Revoked": ["<id>"]}`; an already revoked lease returns an empty list. A task that still runs gets a
new credential from its client.

## Events

The `Secret` topic of the [event stream](/docs/api/events) carries `SecretEngineUpserted` and
`SecretEngineDeleted` (key: the engine name; payload `{"Engine": {...}}`) and `SecretLeaseCreated`,
`SecretLeaseRenewed`, `SecretLeaseRevoked` and `SecretLeaseDeleted` (key: the lease ID, filter key: the
engine; payload `{"Lease": {...}}`). They are visible with `read-secret-engine` in their namespace.

## Internal RPCs

`SecretLease.Create`, `SecretLease.Renew` and `SecretLease.Revoke` are called by the clients with the
task's workload identity (also when ACLs are disabled, the token is verified as a workload identity).
`Create` requires a `secret` block of the task naming the engine and the role, and `read-secret` on
`engines/<engine>/creds/<role>`; it returns the credential to the client only.
