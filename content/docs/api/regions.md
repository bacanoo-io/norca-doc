---
title: "Regions HTTP API"
linkTitle: "Regions"
description: "The /regions endpoints list all known regions."
upstream:
  path: "website/content/api-docs/regions.mdx"
---

The `/regions` endpoints list all known regions.

## List Regions

| Method | Path          | Produces           |
| ------ | ------------- | ------------------ |
| `GET`  | `/v1/regions` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `none`       |

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/regions
```

### Sample Response

```json
["region1", "region2"]
```
