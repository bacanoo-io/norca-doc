---
title: "Secrets HTTP API"
linkTitle: "Secrets"
description: "The /secrets and /secret endpoints list, read, write, delete and destroy the secrets of the built-in secret store (Norca)."
---

The `/secrets` and `/secret` endpoints (Norca) manage the secrets of the
[built-in secret store](/docs/features/secrets). Values are only returned by an explicit value read, which
is executed by the leader and audited; listings and metadata never contain values, only a keyed value
hash. For the CLI, see [`norca secret`](/docs/commands/secret).

All endpoints act on the namespace given with the `namespace` query parameter (default `default`). Paths
use letters, digits, `-`, `_`, `~` and `/`. While the store is sealed, requests fail with status 503
(`server is sealed`).

With ACLs enabled, every endpoint needs an ACL token or a workload identity with the capabilities
listed below. The secret ID of a client node is not accepted (`403`); see
[client node identity](/docs/concepts/acl#client-node-identity).

## List Secrets

Lists the metadata of the secrets whose path starts with a prefix.

| Method | Path          | Produces           |
|--------|---------------|--------------------|
| `GET`  | `/v1/secrets` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `YES` | `namespace:list-secrets` on the listed paths; secrets the token may not list are left out |

### Parameters

- `prefix` `(string: "")` - Only secrets whose path starts with the prefix.
- `namespace` `(string: "default")` - The namespace; `*` lists all namespaces the token may list.
- `filter` `(string: "")` - A [filter expression](/docs/api#filtering).
- `per_page` `(int: 0)`, `next_token` `(string: "")` - Pagination; the next token is returned in the
  `X-Nomad-NextToken` header.

### Sample Request

```shell
$ curl -H "X-Nomad-Token: $NORCA_TOKEN" \
    "https://localhost:4646/v1/secrets?namespace=apps&prefix=app/"
```

### Sample Response

```json
[
  {
    "Namespace": "apps",
    "Path": "app/db",
    "Description": "Database login",
    "Owner": "team-a",
    "Labels": null,
    "ExpiresAt": null,
    "RotateEvery": 0,
    "CurrentVersion": 2,
    "Deleted": false,
    "Destroyed": false,
    "ValueHash": "hmac-sha256:5f0c...",
    "CreateIndex": 1702,
    "ModifyIndex": 1873,
    "CreateTime": 1761411764000000000,
    "ModifyTime": 1761470042000000000
  }
]
```

## Read Secret Metadata

Reads the metadata and the retained versions of a secret, never its values.

| Method | Path                         | Produces           |
|--------|------------------------------|--------------------|
| `GET`  | `/v1/secret/:path?metadata`  | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `YES` | `namespace:list-secrets` on the path |

### Sample Response

```json
{
  "Namespace": "apps",
  "Path": "app/db",
  "Description": "Database login",
  "Owner": "team-a",
  "Labels": null,
  "ExpiresAt": null,
  "RotateEvery": 0,
  "MaxVersions": 10,
  "CurrentVersion": 2,
  "Deleted": false,
  "Destroyed": false,
  "ItemKeys": ["password", "username"],
  "ValueHash": "hmac-sha256:5f0c...",
  "Versions": [
    { "Version": 1, "CreateTime": 1761411764000000000, "Deleted": false, "Destroyed": false, "ValueHash": "hmac-sha256:a91e..." },
    { "Version": 2, "CreateTime": 1761470042000000000, "Deleted": false, "Destroyed": false, "ValueHash": "hmac-sha256:5f0c..." }
  ],
  "CreateIndex": 1702,
  "ModifyIndex": 1873,
  "CreateTime": 1761411764000000000,
  "ModifyTime": 1761470042000000000
}
```

A missing secret returns 404 with `secret not found`.

## Read a Secret Value

Reads the items of a version of a secret. The read runs on the leader and produces an audit record.

| Method | Path               | Produces           |
|--------|--------------------|--------------------|
| `GET`  | `/v1/secret/:path` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `NO` | `namespace:read-secret` on the path |

### Parameters

- `version` `(int: 0)` - The version; `0` or omitted reads the current version.

### Sample Response

```json
{
  "Secret": { "Namespace": "apps", "Path": "app/db", "CurrentVersion": 2, "...": "metadata as above" },
  "Version": 2,
  "Items": {
    "password": "s3cr3t-value",
    "username": "app"
  }
}
```

## Write a Secret

Writes a new version of a secret and/or its metadata. With `Items`, a new version is written. With only
`Meta`, the metadata of an existing secret is replaced and no version is written. Without `Meta`, an
existing secret keeps its metadata and a new one gets the defaults.

| Method | Path               | Produces           |
|--------|--------------------|--------------------|
| `PUT`  | `/v1/secret/:path` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `NO` | `namespace:write-secret` on the path |

### Parameters

- `cas` `(int: <unset>)` - Check-and-set: write only if the secret's modify index is this value; `0`
  writes only if the secret does not exist. A mismatch fails with status 409. Query parameter.
- `Items` `(map[string]string)` - The items of the new version: at most 64 KiB in total; keys use letters,
  digits, `_`, `.` and `-`.
- `Meta` `(object)` - `Description`, `Owner`, `Labels`, `ExpiresAt` (RFC 3339), `RotateEvery`
  (nanoseconds), `MaxVersions` (1–100, default 10).

### Sample Payload

```json
{
  "Items": { "username": "app", "password": "s3cr3t-value" },
  "Meta": { "Description": "Database login", "Owner": "team-a", "MaxVersions": 10 }
}
```

### Sample Request

```shell
$ curl -X PUT -H "X-Nomad-Token: $NORCA_TOKEN" --data @payload.json \
    "https://localhost:4646/v1/secret/app/db?namespace=apps&cas=0"
```

### Sample Response

```json
{
  "Secret": { "Namespace": "apps", "Path": "app/db", "CurrentVersion": 1, "...": "metadata" }
}
```

## Delete Versions

Soft deletes versions of a secret; without `versions`, the current version.

| Method   | Path               | Produces           |
|----------|--------------------|--------------------|
| `DELETE` | `/v1/secret/:path` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `NO` | `namespace:write-secret` on the path |

### Parameters

- `versions` `(string: "")` - Comma separated versions.
- `cas` `(int: <unset>)` - Apply only if the secret's modify index is this value.

## Undelete Versions

Restores soft deleted versions; without `versions`, the current version.

| Method | Path                        | Produces           |
|--------|-----------------------------|--------------------|
| `POST` | `/v1/secret/:path/undelete` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `NO` | `namespace:write-secret` on the path |

Parameters: `versions` and `cas`, as for [Delete Versions](#delete-versions).

## Destroy Versions or a Secret

Destroys versions permanently; without `versions`, the whole secret with all of its versions and its
metadata, and the response's `Secret` is `null`.

| Method | Path                       | Produces           |
|--------|----------------------------|--------------------|
| `POST` | `/v1/secret/:path/destroy` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `NO` | `namespace:destroy-secret` on the path |

Parameters: `versions` and `cas`, as for [Delete Versions](#delete-versions).

### Sample Request

```shell
$ curl -X POST -H "X-Nomad-Token: $NORCA_TOKEN" \
    "https://localhost:4646/v1/secret/app/db/destroy?namespace=apps&versions=1"
```

## Events

The [event stream](/docs/api/events) carries two topics of the store:

| Topic | Types | Payload | ACL |
| --- | --- | --- | --- |
| `Secret` | `SecretUpserted`, `SecretDeleted` | `Secret`: the metadata and value hash, never values | `list-secrets` on the path |
| `SecretAccess` | `SecretAccessed` | The audit record: time, region, namespace, path, version(s), operation, result, accessor, server, provider | `operator:read` |
