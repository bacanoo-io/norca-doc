---
title: "Bus Operator HTTP API"
linkTitle: "Bus"
description: "The /operator/bus endpoint reports the status of the system bus of a server."
---

The `/operator/bus` endpoint reports the status of the
[system bus](/docs/configuration/bus) of a server: the NATS server with
JetStream embedded in the Norca servers.

## Read Bus Status

This endpoint returns the status of the bus of the server that answers the
request, or of the server named by `server_id`. The status is local to the
server: the request is not forwarded to the leader.

| Method | Path               | Produces           |
| ------ | ------------------ | ------------------ |
| `GET`  | `/v1/operator/bus` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required    |
| ---------------- | --------------- |
| `NO`             | `operator:read` |

### Parameters

- `server_id` `(string: "")` - The name or ID of a server of the region to
  report. Specified as a query string parameter.

### Sample Request

```shell-session
$ curl -H "X-Nomad-Token: $NORCA_TOKEN" \
    https://localhost:4646/v1/operator/bus
```

### Sample Response

```json
{
  "Enabled": true,
  "Server": "nomad-1.global",
  "Cluster": "global",
  "ClientURL": "nats://10.0.0.11:4649",
  "ClusterPort": 4650,
  "TLS": true,
  "Clustered": true,
  "Started": "2026-10-30T19:02:11Z",
  "Routes": [
    { "Server": "nomad-2.global", "Address": "10.0.0.12:4650", "Outgoing": true, "RTT": "412µs" },
    { "Server": "nomad-3.global", "Address": "10.0.0.13:4650", "Outgoing": false, "RTT": "388µs" }
  ],
  "JetStream": {
    "MetaLeader": "nomad-2.global",
    "ClusterSize": 3,
    "Memory": 0,
    "Storage": 0,
    "MaxMemory": 268435456,
    "MaxStorage": 4294967296,
    "Streams": 1,
    "Consumers": 0,
    "Messages": 4125,
    "Bytes": 2202009,
    "StreamDetails": [
      {
        "Name": "NORCA_EVENTS_global",
        "Subjects": ["nomad.global.>"],
        "Leader": "nomad-2.global",
        "Replicas": 3,
        "Storage": "File",
        "Compression": "S2",
        "MaxAge": 259200000000000,
        "MaxBytes": 1073741824,
        "Messages": 4125,
        "Bytes": 2202009,
        "FirstSeq": 1,
        "LastSeq": 4125,
        "Consumers": 0
      }
    ]
  },
  "Connections": {
    "Total": 4,
    "Internal": 1,
    "Nodes": 3,
    "Tokens": 0,
    "InMsgs": 1203,
    "OutMsgs": 1188,
    "InBytes": 1258291,
    "OutBytes": 1153433
  }
}
```

`Enabled` is `false`, and the other fields are empty, when the server runs
without a bus. `Clustered` is `false` while the region has a single server
and the bus runs a standalone JetStream. `MetaLeader` is empty while
JetStream has no meta leader, for example before the region's other servers
joined.
