---
title: "Command: cdc consumer read"
linkTitle: "consumer read"
description: "The cdc consumer read command shows the reader's consumer of a change stream."
weight: 2
---

The `cdc consumer read` command shows the consumer the servers keep for the
reader of a change stream: its filters and how far it has read.

## Usage

```plaintext
norca cdc consumer read [options]
```

## Options

- `-stream=<events|admin|kv>` - The change stream (default `events`).
- `-json` - Output the consumer in JSON format.
