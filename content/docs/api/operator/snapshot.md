---
title: "Snapshot Operator HTTP API"
linkTitle: "Snapshot"
description: "The /operator/snapshot endpoints save and restore Norca's server state for disaster recovery."
upstream:
  path: "website/content/api-docs/operator/snapshot.mdx"
---

## Generate Snapshot

This endpoint generates and returns an atomic, point-in-time snapshot of the
Norca server state for disaster recovery. Snapshots include all state managed by Norca's
Raft [consensus protocol](/docs/concepts/consensus/).

Snapshots are exposed as gzipped tar archives which internally contain the Raft
metadata required to restore, as well as a binary serialized version of the
Norca server state. The contents are covered internally by SHA-256 hashes.
These hashes are verified during snapshot restore operations. The structure of
the archive is internal to Norca and not intended to be used other than for
restore operations. The archives are not designed to be modified before a
restore.

| Method | Path                    | Produces                 |
| :----- | :---------------------- | ------------------------ |
| `GET`  | `/v1/operator/snapshot` | `200 application/x-gzip` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` |

With ACLs enabled, a request without a management token gets `403 Permission
denied` and no snapshot data. This includes a token that can't be resolved and
the secret ID of a client node.

### Parameters

- `stale` - Specifies if the cluster should respond without an active leader.
  This is specified as a query string parameter.

### Sample Request

```shell
$ curl \
    -o snapshot.tgz \
    http://127.0.0.1:4646/v1/operator/snapshot
```

The above example results in a tarball named `snapshot.tgz` in the current working directory.

## Restore Snapshot

This endpoint restores a point-in-time snapshot of the Norca server state.

Restores involve a potentially dangerous low-level Raft operation that is not
designed to handle server failures during a restore. This operation is primarily
intended to be used when recovering from a disaster, restoring into a fresh
cluster of Norca servers.

The body of the request should be a snapshot archive returned from a previous
call to the `GET` method.

| Method | Path                    | Produces                      |
| :----- | :---------------------- | ----------------------------- |
| `PUT`  | `/v1/operator/snapshot` | `200 text/plain (empty body)` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` |

With ACLs enabled, a request without a management token gets `403 Permission
denied` and the snapshot is not restored. This includes a token that can't be
resolved and the secret ID of a client node.

### Sample Request

```shell
$ curl \
    --request PUT \
    --data-binary @snapshot.tgz \
    http://127.0.0.1:4646/v1/operator/snapshot
```

> [!WARNING]
> Some tools default to www/encoded uploads. Norca expects the snapshot to be
> in pure binary form.
