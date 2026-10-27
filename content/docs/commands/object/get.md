---
title: "Command: object get"
linkTitle: "object get"
description: "The object get command shows a custom object."
---

The `object get` command shows a custom object: its metadata, the kind's display
columns, its conditions, spec and status, and the recent entries of its event
log when the token may read them.

## Usage

```plaintext
norca object get [options] <group>/<Kind> <name>
```

The metadata includes the generation and the observed generation, `managed_by`,
the owners, the finalizers and, for an object marked for deletion, since when
and with which propagation mode it is being deleted.

If ACLs are enabled, this command requires a token with the `read` capability of
an object rule matching the kind in the namespace.

## General Options

This command accepts the general options of the Norca CLI (`-address`,
`-region`, `-namespace`, `-token`, the TLS and color options), described on the
[`namespace apply`](/docs/commands/namespace/apply#general-options) page.

## Get Options

- `-json`: Output the object in JSON format.

- `-t`: Format and display the object using a Go template.

## Examples

```shell
$ norca object get norca.io/LoadBalancer web
```

Show only the addresses from the status:

```shell
$ norca object get -t '{{ index .Status "addresses" }}' norca.io/LoadBalancer web
```
