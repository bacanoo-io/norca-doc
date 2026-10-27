---
title: "Command: object list"
linkTitle: "object list"
description: "The object list command lists the custom objects of a kind."
---

The `object list` command lists the custom objects of a kind, with the display
columns of the kind.

## Usage

```plaintext
norca object list [options] <group>/<Kind>
```

Use `-namespace=*` to list the objects of all namespaces. The table has the
columns `Name`, `Namespace`, the kind's display columns, `Generation`,
`Observed` (the `observedGeneration` of the status) and `Age`. A token that can't
read the kind definition gets the listing without the kind's columns.

If ACLs are enabled, this command requires a token with the `read` capability of
an object rule matching the kind.

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-namespace`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## List Options

- `-label <key>=<value>`: Only list objects with the label. Can be given several
  times; objects must have all the labels.

- `-filter`: Specifies an expression used to filter query results.

- `-per-page`: How many results to show per page.

- `-page-token`: Where to start pagination.

- `-json`: Output the objects in JSON format.

- `-t`: Format and display the objects using a Go template.

## Examples

List the load balancers of the default namespace:

```shell
$ norca object list norca.io/LoadBalancer
```

List the objects of a team in all namespaces:

```shell
$ norca object list -namespace '*' -label team=web norca.io/LoadBalancer
```
