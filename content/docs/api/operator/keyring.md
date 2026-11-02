---
title: "Keyring Operator HTTP API"
linkTitle: "Keyring"
description: "The /operator/keyring endpoints provide tools for Norca operators to interact with the root keyring."
upstream:
  path: "website/content/api-docs/operator/keyring.mdx"
---

The `/operator/keyring` endpoints manage encryption root keys used for storing
variables and signing workload identities, including examining active encryption
keys, rotating keys, or removing unused keys.

See the [Key Management] documentation for information how these capabilities
are used. For instructions on how to use the CLI to perform these operations
manually, please see the documentation for the [`norca operator root keyring`]
commands.

With ACLs enabled, the endpoints need a management token; the secret ID of a
client node is not accepted (`403`), see
[client node identity](/docs/concepts/acl#client-node-identity).

## List Keys

This endpoint retrieves a list of root keys known to the cluster. Note that only
key metadata is returned and the key material is never made available via the
HTTP API.

| Method | Path                        | Produces           |
|--------|-----------------------------|--------------------|
| `GET`  | `/v1/operator/keyring/keys` | `application/json` |

The table below shows this endpoint's support for [blocking queries] and
[required ACLs].

| Blocking Queries | ACL Required |
|------------------|--------------|
| `YES`            | `management` |

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/operator/keyring/keys
```

### Sample Response

```json
[
  {
    "Algorithm": "aes256-gcm",
    "CreateIndex": 13,
    "CreateTime": 1662665630638648800,
    "KeyID": "26cbda57-e01e-188d-5f39-b6e3fca95a5b",
    "ModifyIndex": 13,
    "State": "active"
  },
  {
    "Algorithm": "aes256-gcm",
    "CreateIndex": 6,
    "CreateTime": 1662665528857979100,
    "KeyID": "64b96f4b-f167-f2dd-9148-7867f7e420e3",
    "ModifyIndex": 12,
    "State": "inactive"
  },
  {
    "Algorithm": "aes256-gcm",
    "CreateIndex": 12,
    "CreateTime": 1662665624108063000,
    "KeyID": "f9725e52-9b49-5b55-a8eb-083e23db4a3e",
    "ModifyIndex": 13,
    "State": "inactive"
  }
]
```

## Rotate Key

This endpoint forces the server to rotate the active root key.

| Method | Path                          | Produces           |
|--------|-------------------------------|--------------------|
| `PUT`  | `/v1/operator/keyring/rotate` | `application/json` |

The table below shows this endpoint's support for [blocking queries] and
[required ACLs].

| Blocking Queries | ACL Required |
|------------------|--------------|
| `NO`             | `management` |

### Parameters

- `full` `(bool: false)` - Decrypt all existing variables and re-encrypt with
  the new key. This API request will immediately return and the re-encryption
  process will run asynchronously on the leader.

### Sample Request

```shell
$ curl \
    -XPUT \
    https://localhost:4646/v1/operator/keyring/rotate
```

### Sample Response

```json
{
  "Index": 13,
  "Key": {
    "Algorithm": "aes256-gcm",
    "CreateIndex": 0,
    "CreateTime": 1662665630638648800,
    "KeyID": "26cbda57-e01e-188d-5f39-b6e3fca95a5b",
    "ModifyIndex": 0,
    "State": "active"
  }
}
```

## Delete Key

This endpoint deletes a root key in the `inactive` state.

| Method   | Path                               | Produces           |
|----------|------------------------------------|--------------------|
| `DELETE` | `/v1/operator/keyring/key/:key_id` | `application/json` |

The table below shows this endpoint's support for [blocking queries] and
[required ACLs].

| Blocking Queries | ACL Required |
|------------------|--------------|
| `NO`             | `management` |

### Sample Request

```shell
$ curl \
    -XDELETE \
    https://localhost:4646/v1/operator/keyring/key/68237d9-1770-4d34-9c41-1f220107fc10
```

### Sample Response

```json
{
  "Index": 16
}
```

## Norca extensions

`POST /v1/operator/keyring/rewrap` moves the root keys and the key of the secret store to another keyring
seal, and `POST /v1/operator/keyring/restore` restores keys from a backup. The rewrap is described with the
other seal endpoints in the [Seal Operator HTTP API](/docs/api/operator/seal#rewrap-the-keyring).

[Key Management]: /docs/operations/key-management/
[`norca operator root keyring`]: /docs/commands/operator/root/keyring-rotate/
[blocking queries]: /docs/api#blocking-queries
[required ACLs]: /docs/api#acls
