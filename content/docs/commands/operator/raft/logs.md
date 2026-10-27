---
title: "Command: operator raft logs"
linkTitle: "operator raft logs"
description: "Display Raft server state."
upstream:
  path: "website/content/docs/commands/operator/raft/logs.mdx"
---

The `raft logs` command is used to display the log entries persisted in
the Norca [data directory] in JSON format.

This command requires file system permissions to access the data
directory on disk. The Norca server locks access to the data
directory, so this command cannot be run on a data directory that is
being used by a running Norca server.

> [!WARNING]
> This is a low-level debugging tool and not subject to
>   Norca's usual backward compatibility guarantees.

## Usage

```plaintext
norca operator raft logs [options] <path to data dir>
```

## Raft Logs Options

- `-pretty`: By default this command outputs newline delimited JSON. If the
  `-pretty` flag is passed, each entry will be pretty-printed.

## Examples

The output of this command can be very large, so it's recommended that
you redirect the output to a file for later examination with other
tools.

```shell
$ sudo norca operator raft logs /opt/norca/data > ~/raft-logs.json
$ jq . < ~/raft-logs.json
```

[data directory]: /docs/configuration#data_dir
