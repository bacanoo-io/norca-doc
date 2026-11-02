---
title: "Command: object-kind list"
linkTitle: "object-kind list"
description: "The object-kind list command lists object kinds."
---

The `object-kind list` command lists the object kinds the token may read.

## Usage

```plaintext
norca object-kind list [options]
```

The table has the columns `Kind`, `Namespaced`, `Rules` (the number of CEL
rules) and `Description`.

If ACLs are enabled, kinds are listed for tokens with the `read` capability of
the `operator` policy, or with any object capability on the kind.

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## List Options

- `-prefix`: Only list kinds whose `group/Kind` reference starts with the prefix.

- `-json`: Output the object kinds in JSON format.

- `-t`: Format and display the object kinds using a Go template.

## Examples

```shell
$ norca object-kind list -prefix norca.io/
```
