---
title: "Seal Operator HTTP API"
linkTitle: "Seal"
description: "The /operator/seal, /operator/unseal and /operator/keyring/rewrap endpoints show and manage the keyring seal (Norca)."
---

These endpoints (Norca) show and manage the [keyring seal](/docs/features/secrets/seal): the seal status of
the servers, entering unseal shares, recovering a restored secret store, and moving the keyring to another
seal. Shares are always sent in the request body, never in the URL. For the CLI, see
[`norca operator seal-status`](/docs/commands/operator/seal-status),
[`norca operator unseal`](/docs/commands/operator/unseal) and
[`norca operator keyring rewrap`](/docs/commands/operator/keyring-rewrap).

With ACLs enabled, the endpoints need an ACL token with the capabilities listed below; the secret ID
of a client node is not accepted (`403`), see
[client node identity](/docs/concepts/acl#client-node-identity).

## Read Seal Status

Returns the seal configuration of the region and the seal status of every server, or of one server.

| Method | Path                | Produces           |
|--------|---------------------|--------------------|
| `GET`  | `/v1/operator/seal` | `application/json` |

| Blocking Queries | ACL Required    |
|------------------|-----------------|
| `NO`             | `operator:read` |

### Parameters

- `server_id` `(string: "")` - The name or ID of one server.

### Sample Response

```json
{
  "Config": {
    "Seals": [
      { "Type": "shares", "KeyID": "1a2b3c4d-...", "Threshold": 3, "Shares": 5 }
    ],
    "Rewrap": null,
    "LastRewrapID": "6f1c2a90-...",
    "CreateIndex": 12,
    "ModifyIndex": 40
  },
  "Servers": [
    {
      "ID": "b2d1...",
      "Name": "norca-1",
      "Address": "10.0.0.11:4647",
      "Leader": true,
      "Sealed": false,
      "Initialized": true,
      "Seals": ["shares"],
      "ConfiguredSeal": "shares",
      "Threshold": 3,
      "Shares": 5,
      "Progress": 0,
      "KeyIDs": ["..."],
      "SecretCoreInitialized": true,
      "SecretCoreSealed": false,
      "SecretCoreActive": true,
      "SecretCoreSeals": ["shares:1a2b3c4d-..."],
      "SecretCoreRecovery": false,
      "RecoveryProgress": 0,
      "Error": ""
    }
  ]
}
```

`Config` is `null` in a region that uses the implicit `aead` seal. During a rewrap, `Config.Rewrap` holds
the rewrap ID, the target seals (`To`), the servers that are done (`Done`) and sealed (`Sealed`), and the
start time. A server that could not be reached has only its name, ID, address and `Error`. The response
also carries the usual query metadata fields.

## Enter an Unseal Share

Enters one unseal share on a server, or discards the shares entered so far.

| Method          | Path                  | Produces           |
|-----------------|-----------------------|--------------------|
| `POST` or `PUT` | `/v1/operator/unseal` | `application/json` |

| Blocking Queries | ACL Required     |
|------------------|------------------|
| `NO`             | `operator:write` |

### Parameters

- `server_id` `(string: "")` - The name or ID of the server; query parameter. Defaults to the server of
  the agent that receives the request; required when that agent is not a server.
- `Key` `(string)` - One unseal share, as printed by the rewrap (base64).
- `Reset` `(bool: false)` - Discard the shares entered so far.

### Sample Payload

```json
{ "Key": "<one unseal share>" }
```

### Sample Response

```json
{
  "Status": { "Name": "norca-2", "Sealed": true, "Threshold": 3, "Progress": 1, "...": "..." }
}
```

## Recover a Restored Secret Store

Enters one **old** unseal share toward the recovery of a secret store that a full restore brought back
wrapped by a seal the region no longer uses. The leader collects the shares until they unwrap the store's
key, then wraps it with the region's seal.

| Method          | Path                        | Produces           |
|-----------------|-----------------------------|--------------------|
| `POST` or `PUT` | `/v1/operator/seal/recover` | `application/json` |

| Blocking Queries | ACL Required |
|------------------|--------------|
| `NO`             | `operator:write`; a management token for `CoreKey` |

### Parameters

- `Key` `(string)` - One old unseal share (base64).
- `CoreKey` `(bytes)` - Instead of shares: the key of the secret store from the secret store key object of
  a backup. `norca operator backup restore-bootstrap` uses it.
- `Reset` `(bool: false)` - Discard the old shares entered so far.

### Sample Response

```json
{ "Recovered": false, "Progress": 1, "Seals": [] }
```

## Rewrap the Keyring

Starts moving the root keys and the secret store key of the region to another seal, online.

| Method          | Path                           | Produces           |
|-----------------|--------------------------------|--------------------|
| `POST` or `PUT` | `/v1/operator/keyring/rewrap`  | `application/json` |

| Blocking Queries | ACL Required     |
|------------------|------------------|
| `NO`             | `operator:write` |

### Parameters

- `To` `(string: <required>)` - The seal to move to: `shares` or `aead`. Also accepted as the `to` query
  parameter.
- `Shares` `(int: 0)` - Number of shares of a new `shares` seal; `0` uses the leader's configuration or 5.
- `Threshold` `(int: 0)` - Shares needed to unseal; `0` uses the leader's configuration or 3.

### Sample Payload

```json
{ "To": "shares", "Shares": 5, "Threshold": 3 }
```

### Sample Response

```json
{
  "RewrapID": "6f1c2a90-...",
  "Shares": ["<share 1>", "<share 2>", "<share 3>", "<share 4>", "<share 5>"],
  "Config": { "Seals": [], "Rewrap": { "ID": "6f1c2a90-...", "To": [], "Done": [], "Sealed": [] } }
}
```

`Shares` is returned only for a rewrap to `shares`, and only in this response: the shares are stored
nowhere.
