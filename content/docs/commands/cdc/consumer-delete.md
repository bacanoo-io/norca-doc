---
title: "Command: cdc consumer delete"
linkTitle: "consumer delete"
description: "The cdc consumer delete command deletes the reader's consumer of a change stream."
weight: 3
---

The `cdc consumer delete` command deletes the consumer the servers keep for
the reader of a change stream.

## Usage

```plaintext
norca cdc consumer delete [options]
```

## Options

- `-stream=<events|admin|kv>` - The change stream (default `events`).
