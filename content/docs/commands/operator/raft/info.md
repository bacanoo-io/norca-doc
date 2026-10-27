---
title: "Command: operator raft info"
linkTitle: "operator raft info"
description: "Display Raft server state."
upstream:
  path: "website/content/docs/commands/operator/raft/info.mdx"
---

The `raft info` command is used to display summary information about the
raft logs persisted in the Norca [data directory].

This command requires file system permissions to access the data
directory on disk. The Norca server locks access to the data
directory, so this command cannot be run on a data directory that is
being used by a running Norca server.

> [!WARNING]
> This is a low-level debugging tool and not subject to
>   Norca's usual backward compatibility guarantees.

## Usage

```plaintext
norca operator raft info <path to data dir>
```

## Examples

An example output is as follows:

```shell
$ sudo norca operator raft info /opt/norca/data
path:        /opt/norca/data/server/raft/raft.db
length:      10
first index: 1
last index:  10
```

[data directory]: /docs/configuration#data_dir
