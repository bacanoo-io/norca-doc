---
title: "Command: cdc consumer apply"
linkTitle: "consumer apply"
description: "The cdc consumer apply command creates or changes the reader's consumer of a change stream."
weight: 1
---

The `cdc consumer apply` command creates the consumer the servers keep for
the reader of a change stream, or changes its filters; a change keeps the
position of the consumer. The reader then reads it on the system bus by its
name ([API](/docs/api/cdc)).

## Usage

```plaintext
norca cdc consumer apply [options] -filter=<subject> [-filter=...]
```

The token needs a [`cdc` rule](/docs/other-specifications/acl-policy#cdc-rules)
that covers every filter.

## Options

- `-stream=<events|admin|kv>` - The change stream: the events of the
  namespaces (default), the admin events (management tokens only) or the
  Consul KV notices.
- `-filter=<subject>` - A subject of the stream to deliver, for example
  `norca.eu.games.Allocation`; up to 16, not overlapping.
- `-deliver=<all|new|last-per-subject|by-start-time>` - Where a new consumer
  starts (default `all`); it can't change later.
- `-start-time=<RFC3339>` - The start of `-deliver=by-start-time`.
- `-ack-wait=<duration>` - How long a delivered event waits for its
  acknowledgement (default `30s`).
- `-max-ack-pending=<n>` - Events delivered and not acknowledged (default and
  limit 1000).
- `-json` - Output the consumer in JSON format.

## Examples

```shell-session
$ norca cdc consumer apply -filter norca.eu.games.Evaluation -filter norca.eu.games.Allocation
Stream                      = events (NORCA_EVENTS_eu)
Name                        = 9f3c51ad-6b7e-40f2-a1d4-3c2e8b7f0e15
Filters                     = norca.eu.games.Evaluation, norca.eu.games.Allocation
Deliver                     = all
Ack Wait                    = 30s
Max Ack Pending             = 1000
Pending                     = 42
Ack Pending                 = 0
Delivered (stream sequence) = 0
```
