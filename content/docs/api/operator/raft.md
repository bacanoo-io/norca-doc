---
title: "Raft Operator HTTP API"
linkTitle: "Raft"
description: "The /operator/raft endpoints provide tools for management of  the Raft subsystem."
upstream:
  path: "website/content/api-docs/operator/raft.mdx"
---

The `/operator/raft` endpoints provide tools for management of the Raft subsystem.

Please see the [Consensus Protocol Guide] for more information about Raft consensus protocol and its use.

## Read Raft Configuration

This endpoint queries the Raft configuration of the servers.

| Method | Path                              | Produces           |
| ------ | --------------------------------- | ------------------ |
| `GET`  | `/v1/operator/raft/configuration` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` |

### Parameters

- `stale` - Specifies if the cluster should respond without an active leader.
  This is specified as a query string parameter.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/operator/raft/configuration
```

### Sample Response

```json
{
  "Index": 1,
  "Servers": [
    {
      "Address": "127.0.0.1:4647",
      "ID": "2ad8d8d4-5f2b-4c2e-a3e8-9a4f7a6c1d01",
      "Leader": true,
      "Node": "bacon-mac.global",
      "RaftProtocol": "3",
      "Role": "voter",
      "Voter": true
    }
  ]
}
```

#### Field Reference

- `Index` `(int)` - The `Index` value is the Raft index corresponding to this
  configuration. The latest configuration may not yet be committed if changes
  are in flight.

- `Servers` `(array: Server)` - The returned `Servers` array has information
  about the servers in the Raft peer configuration.

  - `ID` `(string)` - The Raft ID of the server, its node ID.

  - `Node` `(string)` - The node name of the server, as known to Norca, or
    `"(unknown)"` if the node is stale and not known.

  - `Address` `(string)` - The `ip:port` for the server.

  - `Leader` `(bool)` - is either `"true"` or `"false"` depending on the server's
    role in the Raft configuration.

  - `Voter` `(bool)` - is `"true"` or `"false"`, indicating if the server has a vote
    in the Raft configuration.

  - `RaftProtocol` `(string)` - The Raft protocol version of the server (`"3"`).

  - `Role` `(string)` - The configured [role](/docs/configuration/server#role) of
    the server: `voter`, `standby` or `observer`, or `"unknown"` if the server is
    not in the gossip pool.

## Remove Raft Peer

This endpoint removes a Norca server with given address from the Raft
configuration. The return code signifies success or failure.

| Method   | Path                     | Produces           |
| -------- | ------------------------ | ------------------ |
| `DELETE` | `/v1/operator/raft/peer` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` |

### Parameters

- `address` `(string: <optional>)` - Specifies the server to remove as
  `ip:port`. **This cannot be provided along with the `id` parameter.**

- `id` `(string: <optional>)` - Specifies the server to remove as
  `id`. **This cannot be provided along with the `address` parameter.**

### Sample Request

```shell
$ curl \
    --request DELETE \
    https://localhost:4646/v1/operator/raft/peer?address=1.2.3.4:4646
```

[consensus protocol guide]: /docs/concepts/consensus/
