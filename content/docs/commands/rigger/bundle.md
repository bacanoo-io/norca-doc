---
title: "Command: rigger bundle"
linkTitle: "rigger bundle"
description: "The rigger bundle command packs the modules of a stack into one archive and imports it, for an install without a network."
---

The `rigger bundle` command carries the modules of a stack to a machine or a cluster that can't
reach their git repositories. A **bundle** holds the modules of a stack from git sources, as its lock
file pins them, in one archive. Sync the stack (`rigger stack sync`) before its bundle is made.

## Usage

```plaintext
norca rigger bundle create [stack] -o file.riggerbundle
norca rigger bundle inspect <file>
norca rigger bundle import <file> [-server]
```

| Command | What it does |
| --- | --- |
| `bundle create` | Writes the bundle of a stack. |
| `bundle inspect` | Shows what a bundle holds. |
| `bundle import` | Puts a bundle into the cache of the machine, for an install without a network. With `-server`, puts it into the cluster, for its servers; see [bundles for a cluster without a network](/docs/api/rigger-stacks#bundles-for-a-cluster-without-a-network). |

## Bundle Options

- `-o`: `create`: the bundle to write (`platform.riggerbundle`).

- `-server`: `import`: send the bundle to the servers of the cluster. Defaults to `RIGGER_SERVER`.

## Examples

```shell
$ norca rigger bundle create ./shop -o shop.riggerbundle
$ norca rigger bundle inspect shop.riggerbundle
$ norca rigger bundle import shop.riggerbundle -server
```
