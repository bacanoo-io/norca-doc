---
title: "Command: operator raft state"
linkTitle: "operator raft state"
description: "Display Raft server state."
upstream:
  path: "website/content/docs/commands/operator/raft/state.mdx"
---

The `raft state` command is used to display the server state obtained by
replaying raft log entries persisted in the Norca [data directory] in
JSON format.

This command requires file system permissions to access the data
directory on disk. The Norca server locks access to the data
directory, so this command cannot be run on a data directory that is
being used by a running Norca server.

> [!WARNING]
> This is a low-level debugging tool and not subject to
>   Norca's usual backward compatibility guarantees.

## Usage

```plaintext
norca operator raft state [options] <path to data dir>
```

## Raft State Options

- `-last-index=<last_index>`: Set the last log index to be applied, to
  drop spurious log entries not properly committed. If the
  `last_index` option is zero or negative, it's treated as an offset
  from the last index seen in raft.

## Examples

The output of this command can be very large, so it's recommended that
you redirect the output to a file for later examination with other
tools.

```shell
$ sudo norca operator raft state /opt/norca/data > ~/raft-state.json
$ jq . < ~/raft-state.json
```

[data directory]: /docs/configuration#data_dir
