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

## Promote a Standby Server

This endpoint is the manual failover to a [standby server](/docs/configuration/server#role)
(Norca). The leader checks the standby and the voter it replaces, removes that
voter from the Raft configuration, and waits until autopilot promotes the
standby: autopilot stays the only one that changes the votes. The standby
cooldown does not apply. The endpoint answers with the Raft configuration after
the promotion, in the format of [Read Raft Configuration](#read-raft-configuration).

| Method | Path                                | Produces           |
| ------ | ----------------------------------- | ------------------ |
| `PUT`  | `/v1/operator/raft/promote-standby` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required     |
| ---------------- | ---------------- |
| `NO`             | `operator:write` |

### Parameters

- `id` `(string: <required>)` - The Raft ID of the standby server. It must have
  the role `standby`, be healthy for autopilot (in contact with the leader and
  within `MaxTrailingLogs` of it) and stable for `ServerStabilizationTime`.

- `replace` `(string: <optional>)` - The Raft ID of the failed voter the
  standby replaces; it is removed from the Raft configuration before the
  promotion. It must be a voter that autopilot reports unhealthy, and never the
  leader. Without `replace` the healthy voters must already be fewer than
  `TargetVoters`.

- `force` `(bool: false)` - Replace the voter even when autopilot reports it
  healthy. The checks of the standby always apply.

The request is refused when autopilot `TargetVoters` is `0`, since nothing
would promote the standby. When the standby is not promoted within 30 seconds
the request fails; the removal of the voter is not undone.

### Sample Request

```shell
$ curl \
    --request PUT \
    "https://localhost:4646/v1/operator/raft/promote-standby?id=59a1bc0e-0a1c-7b36-3e6a-6d4b4f0e8a1d&replace=1d7a2bd8-6c9e-4e5c-2b0f-3f1a0c2b9e44"
```

[consensus protocol guide]: /docs/concepts/consensus/
