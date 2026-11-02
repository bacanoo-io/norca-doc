---
title: "Command: operator snapshot inspect"
linkTitle: "operator snapshot inspect"
description: "Display the current Raft peer configuration."
upstream:
  path: "website/content/docs/commands/operator/snapshot/inspect.mdx"
---

Displays information about a snapshot file on disk.

To inspect the file "backup.snap":

```shell
$ norca operator snapshot inspect backup.snap
ID       2-19-1592495928936
Size     3902
Index    19
Term     2
Version  1
```

## Usage

```plaintext
norca operator snapshot inspect <file>
```
