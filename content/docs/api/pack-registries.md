---
title: "Pack Registries HTTP API"
linkTitle: "Pack registries"
description: "The /pack-registry and /packs endpoints manage the cluster pack registries and read their catalog; /release/:name/plan-pack and deploy-pack render a pack of a registry on the servers and plan or install it."
---

The [cluster pack registries](/docs/features/packages/catalog) are custom objects of the built-in,
cluster-scoped kind `packs.norca.io/Registry` of a region. The leader fetches them into its pack cache
and indexes their packs; these endpoints manage them, read the catalog and the install form of a pack,
and install packs rendered by the leader. The web UI uses them under **Packages**. All endpoints take
the `region` query parameter. Writes, pack details and renders are forwarded to the leader; any agent
can serve them.

Registries are authorized against the rules of the `namespace "*"` block:

```hcl
namespace "*" {
  object "packs.norca.io/Registry" {
    capabilities = ["read", "write"]
  }
}
```

Reading also works with `read` or `write` on `packs.norca.io/Release` in any namespace. Installing a
pack needs what [installing a release](/docs/api/releases#install-or-upgrade-release) needs: object
`write` on `packs.norca.io/Release` in the namespace of the release, and the permissions for every
resource of the pack, which is applied with the caller's token.

Spec and status of a registry use the camelCase keys below; the pack entries use PascalCase.

## List registries

| Method | Path                    | Produces           |
| ------ | ----------------------- | ------------------ |
| `GET`  | `/v1/pack-registries`   | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | registry `read` |

### Sample response

```json
[
  {
    "ID": "7c1f...",
    "Name": "norca",
    "Spec": {
      "type": "git",
      "source": "https://github.com/bacanoo-io/norca-registry",
      "defaultRef": "v0.1.0",
      "syncInterval": "6h"
    },
    "Status": {
      "phase": "Ready",
      "message": "Synchronized 9 pack(s) with Norca 0.1.0",
      "lastSyncedAt": "2026-10-29T08:00:00Z",
      "lastGoodSyncAt": "2026-10-29T08:00:00Z",
      "syncGeneration": 4,
      "packCount": 9,
      "packs": [
        {
          "Registry": "norca",
          "Name": "postgres",
          "Version": "0.3.0",
          "Description": "PostgreSQL ...",
          "Category": "database",
          "Digest": "sha256:...",
          "Signed": false,
          "Requires": {"norca": ">= 0.1.0", "features": ["releases"]},
          "Compatible": true,
          "HasSchema": true
        }
      ]
    },
    "CreateTime": 1793260800000000000,
    "ModifyTime": 1793260800000000000,
    "CreateIndex": 120,
    "ModifyIndex": 188
  }
]
```

## Read registry

| Method | Path                       | Produces           |
| ------ | -------------------------- | ------------------ |
| `GET`  | `/v1/pack-registry/:name`  | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | registry `read` |

The response is one registry as in [list registries](#list-registries), or `404`.

## Create or update registry

This endpoint creates or updates a registry and syncs it before it returns.

| Method         | Path                                             | Produces           |
| -------------- | ------------------------------------------------ | ------------------ |
| `POST` / `PUT` | `/v1/pack-registry`, `/v1/pack-registry/:name`   | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | registry `write` |

### Parameters

- `Name` `(string: <required>)` - The registry name: lowercase letters, digits and dashes. With
  `/v1/pack-registry/:name`, the name of the path.

- `Spec.type` `(string: <required>)` - `git`, `oci`, `dir` (a directory on the servers) or `bundle`
  (an offline bundle on the servers).

- `Spec.source` `(string: <required>)` - A git URL, `oci://host/repository`, a server path, or
  `builtin` (type `dir`: the packs that ship with Norca).

- `Spec.defaultRef` `(string: "latest")` - The tag or branch to fetch.

- `Spec.syncInterval` `(duration: "")` - Sync periodically on the leader, for example `15m` or `24h`;
  at least `1m`. Empty or `0s` syncs on request only.

- `Spec.trustedKeys` `(array: nil)` - Public keys (PEM) that sign the packs; with keys, packs that
  aren't signed by one of them can't be installed.

### Sample payload

```json
{
  "Name": "norca",
  "Spec": {
    "type": "git",
    "source": "https://github.com/bacanoo-io/norca-registry",
    "defaultRef": "v0.1.0",
    "syncInterval": "6h"
  }
}
```

### Response

The registry, with the status of the sync. A source the servers can't fetch is saved with
`Status.phase` `Error` and the error in `Status.message`; a failed sync of an existing registry keeps
the packs of its last good sync.

## Sync registry

| Method | Path                            | Produces           |
| ------ | ------------------------------- | ------------------ |
| `POST` | `/v1/pack-registry/:name/sync`  | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | registry `write` |

The response is the registry after the sync.

## Delete registry

This endpoint removes a registry and its cache. Releases installed from it keep running.

| Method   | Path                       | Produces           |
| -------- | -------------------------- | ------------------ |
| `DELETE` | `/v1/pack-registry/:name`  | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | registry `write` |

## List packs

This endpoint lists the catalog: the packs of all registries, one entry per pack version, with the
compatibility evaluated against the servers (`Compatible`, `MissingFeatures`).

| Method | Path        | Produces           |
| ------ | ----------- | ------------------ |
| `GET`  | `/v1/packs` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | registry `read` |

### Parameters

- `registry` `(string: "")` - Only the packs of this registry.

## Read pack

This endpoint returns a pack of a registry with its versions, its README and its install form.

| Method | Path                         | Produces           |
| ------ | ---------------------------- | ------------------ |
| `GET`  | `/v1/pack/:registry/:pack`   | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | registry `read` |

### Parameters

- `version` `(string: "")` - The pack version; the newest by default.

### Response

- `Pack` - The catalog entry of the version.
- `Versions` - The versions of the pack in the registry.
- `Readme` - The README of the pack.
- `UIFormSchema` - A JSON Schema of the variables with `x-ui-*` keys: `x-ui-tabs` (`id`, `label`,
  `icon`, `order`), and per property `x-ui-tab`, `x-ui-group`, `x-ui-order`, `x-ui-widget`,
  `x-ui-unit`, `x-ui-presets`, `x-ui-enum-labels`, `x-ui-show-if`, `x-ui-secret-path`,
  `x-ui-secret-item`, synthesized from the pack's `variables.hcl` and `metadata.hcl`
  ([form and constraints](/docs/features/packages/writing-packs#form-and-constraints)).

## Plan or install a pack

These endpoints render a pack of a registry on the leader and plan it (`plan-pack`) or apply it as a
server-rendered revision of the release (`deploy-pack`), in the namespace of the `namespace` query
parameter.

| Method         | Path                                                        | Produces           |
| -------------- | ----------------------------------------------------------- | ------------------ |
| `PUT` / `POST` | `/v1/release/:name/plan-pack`, `/v1/release/:name/deploy-pack` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `write` on `packs.norca.io/Release`, plus the permissions for every resource |

### Parameters

- `:name` `(string: <required>)` - The release name, in the path.

- `Registry`, `Pack` `(string: <required>)` - The registry and the pack.

- `Version` `(string: "")` - The pack version; the newest by default.

- `Values` `(map: nil)` - The variable values. Values of variables with a `secret` block are moved to
  their Variable item and never stored.

- `Secrets` `(array: nil)` - Secret Variables items (`Path`, `Items`; the namespace of the release by
  default), as in [install or upgrade](/docs/api/releases#install-or-upgrade-release).

- `Description` `(string: "")` - Description of the revision.

- `Atomic`, `Wait`, `Timeout`, `TakeOwnership`, `MaxHistory` - As in
  [install or upgrade](/docs/api/releases#install-or-upgrade-release).

### Sample payload

```json
{
  "Registry": "builtin",
  "Pack": "redis",
  "Values": {"mode": "replica", "count": 2, "auth_enabled": true},
  "Secrets": [{"Path": "nomad/jobs/redis", "Items": {"password": "s3cret-value"}}]
}
```

### Response

The response of [install or upgrade](/docs/api/releases#install-or-upgrade-release): `Release`,
`Revision`, `Changes` and `Warnings`. A pack whose values break its constraints or rules is rejected
with `400` and the failed checks.
