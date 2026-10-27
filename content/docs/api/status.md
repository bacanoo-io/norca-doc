---
title: "Status HTTP API"
linkTitle: "Status"
description: "The /status endpoints query the Norca system status."
upstream:
  path: "website/content/api-docs/status.mdx"
---

The `/status` endpoints query the Norca system status.

## Read Leader

This endpoint returns the address of the current leader in the region.

| Method | Path             | Produces           |
| ------ | ---------------- | ------------------ |
| `GET`  | `/status/leader` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `none`       |

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/status/leader
```

### Sample Response

```json
"127.0.0.1:4647"
```

## List Peers

This endpoint returns the set of raft peers in the region.

| Method | Path            | Produces           |
| ------ | --------------- | ------------------ |
| `GET`  | `/status/peers` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `none`       |

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/status/peers
```

### Sample Response

```json
["127.0.0.1:4647"]
```
