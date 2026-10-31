---
title: "Consul KV Operator HTTP API"
linkTitle: "Consul KV"
description: "The /operator/consul-kv endpoint copies the Consul KV from Variables to the system bus."
---

The `/operator/consul-kv` endpoints manage the Consul KV of the
[Consul-compatible API](/docs/configuration/consul_compat) of the clients.

## Migrate the Consul KV

This endpoint copies the keys of the Consul KV kept in Variables (the
`variables` backend) into the `consul-kv` bucket of the
[system bus](/docs/features/system-bus). The keys are the Variables below
`path` in the namespace of the request. Keys already in the bucket are never
overwritten; the Variables are left in place. Keys with flags are skipped.
Only the keys the token may `read` as Variables are copied.

| Method | Path                               | Produces           |
| ------ | ---------------------------------- | ------------------ |
| `POST` | `/v1/operator/consul-kv/migrate`   | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required     |
| ---------------- | ---------------- |
| `NO`             | `operator:write` |

### Parameters

- `namespace` `(string: "default")` - The namespace of the keys. Specified as
  a query string parameter.

- `path` `(string: "consul/kv")` - The Variables path of the `kv` block of
  `consul_compat`. Specified as a query string parameter.

- `dry_run` `(bool: false)` - Report what would be copied without writing.
  Specified as a query string parameter.

### Sample Request

```shell-session
$ curl -X POST -H "X-Nomad-Token: $NORCA_TOKEN" \
    "https://localhost:4646/v1/operator/consul-kv/migrate?namespace=shop"
```

### Sample Response

```json
{
  "Copied": ["app/config", "app/db.url"],
  "Unchanged": ["app/name"],
  "Conflicts": ["app/feature-flags"],
  "Skipped": [
    { "Key": "legacy/flagged", "Reason": "the bus backend does not keep flags" }
  ]
}
```

- `Copied` - Keys created in the bucket (with `dry_run`: that would be).
- `Unchanged` - Keys already in the bucket with the same value.
- `Conflicts` - Keys already in the bucket with another value, left as is.
- `Skipped` - Keys that could not be copied, with the reason.
