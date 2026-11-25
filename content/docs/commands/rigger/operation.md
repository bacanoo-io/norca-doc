---
title: "Command: rigger operation"
linkTitle: "rigger operation"
description: "The rigger operation command follows, cancels and shows an apply or a destroy of a stack that the servers run."
---

The `rigger operation` command reaches an **operation**: an apply or a destroy of a stack that the
servers run (`stack apply -server`, `stack destroy -server`, or a request of the
[stacks API](/docs/api/rigger-stacks#operations)).

## Usage

```plaintext
norca rigger operation follow <name> [-namespace ns]
norca rigger operation cancel <name> [-namespace ns]
norca rigger operation status <name> [-namespace ns] [-json]
```

| Command | What it does |
| --- | --- |
| `operation follow` | Follows the log of the operation. |
| `operation cancel` | Asks the servers to stop the operation before its next release. |
| `operation status` | Shows the operation. |

## Operation Options

- `-namespace`: The namespace of the stack of the operation. Defaults to `default`.

- `-region`: The region of the operation. Defaults to the region of the cluster.

- `-json`: `status`: write the operation as JSON.

## Examples

```shell
$ norca rigger operation follow shop-20261122-140938-a847
$ norca rigger operation cancel shop-20261122-140938-a847
```
