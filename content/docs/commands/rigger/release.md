---
title: "Command: rigger release"
linkTitle: "rigger release"
description: "The rigger release command lists, shows, rolls back and uninstalls releases, one release at a time, without a stack."
---

The `rigger release` command works on one [release](/docs/features/packages/releases), without a
stack, through the [release API](/docs/api/releases).

## Usage

```plaintext
norca rigger release list [-namespace ns]
norca rigger release status <name> [-namespace ns]
norca rigger release history <name> [-namespace ns]
norca rigger release rollback <name> [revision] [-namespace ns] [-adopt]
norca rigger release uninstall <name> [-namespace ns]
```

| Command | What it does |
| --- | --- |
| `release list` | Lists the releases of the namespace. |
| `release status` | Shows the current revision of the release and what drifted. |
| `release history` | Lists the revisions of the release. |
| `release rollback` | Makes a revision current again: the one given, else the previous one. |
| `release uninstall` | Uninstalls the release. |

The table has the columns `NAMESPACE`, `RELEASE`, `REVISION`, `STATUS`, `MODULE` and `OWNER` (the
stack that owns the release).

## Release Options

- `-namespace`: The namespace of the release. Defaults to `default`. `list` takes `*` for all
  namespaces.

- `-region`: The region to talk to.

- `-adopt`: `rollback`: restore a revision of another manager or stack.

## Examples

```shell
$ norca rigger release list -namespace apps
$ norca rigger release status test-app -namespace apps
$ norca rigger release history test-app -namespace apps
$ norca rigger release rollback test-app 1 -namespace apps
$ norca rigger release uninstall test-app -namespace apps
```
