---
title: "Command: secret delete"
linkTitle: "secret delete"
description: "The \"secret delete\" command soft deletes versions of a secret (Norca)."
---

The `secret delete` command soft deletes versions of a secret: their values can no longer be read, but
they can be restored with [`secret undelete`](/docs/commands/secret/undelete) until they are destroyed.

If ACLs are enabled, this command requires the `write-secret` capability for the path.

## Usage

```plaintext
norca secret delete [options] <path>
```

## General Options

The [general options](/docs/commands/secret#general-options) of the CLI.

## Delete Options

- `-versions <n,...>`: Comma separated versions. Defaults to the current version.

- `-check-index <index>`: Apply only if the secret's modify index is the given one.

## Examples

```shell
$ norca secret delete -namespace apps app/db
Secret "app/db": deleted the current version

$ norca secret delete -namespace apps -versions 1,2 app/db
Secret "app/db": deleted versions 1,2
```
