---
title: "Metrics Store HTTP API"
linkTitle: "Metrics Store"
description: "The /metrics/history endpoint returns the history of the task group usage the servers keep."
---

The `/metrics/history` endpoint returns the history of a metric of a task
group from the [metrics store](/docs/configuration/metrics_store) of a server.

## Read History

Every server keeps the full history, so the server that answers the request
reads its own store; the request is not forwarded to the leader.

| Method | Path                  | Produces           |
| ------ | --------------------- | ------------------ |
| `GET`  | `/v1/metrics/history` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required         |
| ---------------- | -------------------- |
| `NO`             | `namespace:read-job` |

### Parameters

- `job` `(string: <required>)` - The ID of the job.
- `group` `(string: <required>)` - The name of the task group.
- `namespace` `(string: "default")` - The namespace of the job.
- `metric` `(string: "norca.group.cpu")` - One of the
  [metrics](/docs/configuration/metrics_store#metrics).
- `from` `(string: "1h")` - The start of the history: an RFC 3339 time, Unix
  seconds, or a duration before now.
- `to` `(string: "")` - The end of the history (exclusive), in the same
  formats; empty is now.
- `max_points` `(int: 360)` - The largest number of points, up to 2000. The
  stored points are combined into steps of at least the sample interval: the
  mean of the averages and the largest maximum of each step. Steps without
  points are left out.
- `server_id` `(string: "")` - The name or ID of a server of the region to read
  instead.

### Sample Request

```shell-session
$ curl -H "X-Nomad-Token: $NORCA_TOKEN" \
    "https://localhost:4646/v1/metrics/history?job=api&group=web&from=6h&max_points=3"
```

### Sample Response

`Enabled` is `false`, with no points, when the server keeps no history.
`Step` is in nanoseconds.

```json
{
  "Enabled": true,
  "Metric": "norca.group.cpu",
  "Step": 7200000000000,
  "Points": [
    { "Time": "2026-10-31T04:00:00Z", "Avg": 21.4, "Max": 63.0 },
    { "Time": "2026-10-31T06:00:00Z", "Avg": 24.9, "Max": 71.5 },
    { "Time": "2026-10-31T08:00:00Z", "Avg": 18.2, "Max": 40.1 }
  ]
}
```

## Read Metrics Store Status

This endpoint returns the state of the metrics store of the server that
answers the request, or of the server named by `server_id`.

| Method | Path                         | Produces           |
| ------ | ---------------------------- | ------------------ |
| `GET`  | `/v1/operator/metrics-store` | `application/json` |

| Blocking Queries | ACL Required    |
| ---------------- | --------------- |
| `NO`             | `operator:read` |

### Parameters

- `server_id` `(string: "")` - The name or ID of a server of the region to
  report.

### Sample Response

Durations are in nanoseconds.

```json
{
  "Enabled": true,
  "Server": "nomad-1.global",
  "Partitions": 14,
  "DiskPartitions": 12,
  "DiskBytes": 48211968,
  "MaxDiskSize": 2147483648,
  "Series": 960,
  "MaxSeries": 50000,
  "Oldest": "2026-10-28T08:00:00Z",
  "Newest": "2026-10-31T08:41:30Z",
  "DroppedReports": 0,
  "DroppedGroups": 0,
  "Retention": 2592000000000000,
  "SampleInterval": 30000000000
}
```
