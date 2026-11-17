---
title: "Change Data Capture HTTP API"
linkTitle: "CDC"
description: "The /cdc/consumer endpoints manage the consumer the servers keep for the reader of a change stream."
---

The `/cdc/consumer` endpoints manage the consumer the servers keep for the
reader of a change stream ([change data
capture](/docs/features/change-data-capture)): one per reader and stream,
named after the reader. **The reader is the token or the workload identity
of the request**; its policy needs a
[`cdc` rule](/docs/other-specifications/acl-policy#cdc-rules). The requests
are forwarded to the leader and need ACLs.

`:stream` is one of:

| Stream | Bus stream | Content |
| --- | --- | --- |
| `events` | `NORCA_EVENTS_<region>` | the events of the namespaces |
| `kv` | `NORCA_KV_CHANGES_<region>` | the Consul KV notices |
| `admin` | `NORCA_ADMIN_EVENTS_<region>` | the admin events; management tokens only |

## Create or Change the Consumer

This endpoint creates the reader's consumer of a stream, or changes its
filters: a change keeps the position of the consumer.

| Method | Path                         | Produces           |
| ------ | ---------------------------- | ------------------ |
| `PUT`  | `/v1/cdc/consumer/:stream`   | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | a `cdc` rule |

### Parameters

- `Filters` `(array<string>: <required>)` - The subjects of the stream to
  deliver, 1 to 16. Each lies within the reader's `cdc` rule and the stream
  (`norca.<region>.<namespace>.<topic>` for `events`,
  `norca.<region>.<namespace>.ConsulKV.<type>` for `kv`); they do not
  overlap. **All are in one consumer, so the events arrive in the stream's
  order across topics.**
- `Deliver` `(string: "all")` - Where a new consumer starts: `all`, `new`,
  `last-per-subject` or `by-start-time` (with `StartTime`). It can't change
  later.
- `StartTime` `(string: "")` - RFC 3339 time for `by-start-time`.
- `AckWait` `(int: 30000000000)` - Nanoseconds a delivered event waits for
  its acknowledgement before it is delivered again (default 30s).
- `MaxAckPending` `(int: 1000)` - Events delivered and not acknowledged, at
  most 1000.

The consumer delivers on request (pull): at most 256 messages or 1MiB per
request, a request waiting at most 30 seconds.

| Code | When |
| --- | --- |
| `200` | the consumer |
| `400` | an unknown stream, a filter that is not a subject of the stream, overlapping filters, ACLs disabled |
| `403` | no `cdc` rule, a filter outside it, `admin` without a management token |
| `409` | the stream has its [`max_consumers`](/docs/configuration/bus) consumers |

### Sample Request

```shell-session
$ curl -X PUT -H "X-Nomad-Token: $NORCA_TOKEN" \
    -d '{"Filters": ["norca.eu.games.Evaluation", "norca.eu.games.Allocation"]}' \
    https://localhost:4646/v1/cdc/consumer/events
```

A task uses the [Task API](/docs/api/task-api) with its workload identity:

```shell-session
$ curl --unix-socket "$NORCA_SECRETS_DIR/api.sock" -H "Authorization: Bearer $NORCA_TOKEN" \
    -X PUT -d '{"Filters": ["norca.eu.games.>"]}' localhost/v1/cdc/consumer/events
```

### Sample Response

```json
{
  "Stream": "events",
  "StreamName": "NORCA_EVENTS_eu",
  "Name": "9f3c51ad-6b7e-40f2-a1d4-3c2e8b7f0e15",
  "Filters": ["norca.eu.games.Evaluation", "norca.eu.games.Allocation"],
  "Deliver": "all",
  "AckWait": 30000000000,
  "MaxAckPending": 1000,
  "NumPending": 42,
  "NumAckPending": 0,
  "Delivered": 0,
  "Created": "2026-11-15T09:12:03Z"
}
```

`Name` is the consumer the reader reads on the system bus: the accessor ID
of its token, or `<allocation id>_<task name>` of a workload identity (a
task name with characters a consumer name can't hold is
[written differently](/docs/features/change-data-capture#reading-in-go)).
A reader whose token also has a `bus` rule reads the consumer over a
connection of its own, logged in as the user `cdc` with the token as the
password ([connecting](/docs/features/change-data-capture#connecting)).

## Read the Consumer

| Method | Path                         | Produces           |
| ------ | ---------------------------- | ------------------ |
| `GET`  | `/v1/cdc/consumer/:stream`   | `application/json` |

Returns the consumer as above, with `NumPending` (events of its filters not
delivered yet), `NumAckPending` and `Delivered` (the stream sequence of the
last delivered event); `404` when the reader has none.

## Delete the Consumer

| Method   | Path                         | Produces           |
| -------- | ---------------------------- | ------------------ |
| `DELETE` | `/v1/cdc/consumer/:stream`   | `application/json` |

Deletes the reader's consumer; `404` when it has none. The leader also
removes the consumers of readers that lost their right (a deleted or expired
token, a policy without the `cdc` rule, an ended allocation), and a consumer
idle longer than `max_age` goes by itself.
