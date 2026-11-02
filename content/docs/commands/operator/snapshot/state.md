---
title: "Command: operator snapshot state"
linkTitle: "operator snapshot state"
description: "Displays a JSON representation of a Raft snapshot."
upstream:
  path: "website/content/docs/commands/operator/snapshot/state.mdx"
---

Displays a JSON representation of state in a raft snapshot on disk.

> [!WARNING]
> This is a low-level debugging tool and not subject to
>   Norca's usual backward compatibility guarantees.

## Usage

```plaintext
norca operator snapshot state [options] <file>
```

## Snapshot State Options

- `-filter`: Specifies an expression used to filter query results.

## Examples

The output of this command can be very large, so it's recommended that
you redirect the output to a file for later examination with other
tools.

```shell
$ norca operator snapshot state backup.snap > ~/raft-state.json
$ jq . < ~/raft-state.json
```
