---
title: "Command: secret undelete"
linkTitle: "secret undelete"
description: "The \"secret undelete\" command restores soft deleted versions of a secret (Norca)."
---

The `secret undelete` command restores soft deleted versions of a secret. Destroyed versions can't be
restored.

If ACLs are enabled, this command requires the `write-secret` capability for the path.

## Usage

```plaintext
norca secret undelete [options] <path>
```

## General Options

The [general options](/docs/commands/secret#general-options) of the CLI.

## Undelete Options

- `-versions <n,...>`: Comma separated versions. Defaults to the current version.

- `-check-index <index>`: Apply only if the secret's modify index is the given one.

## Examples

```shell
$ norca secret undelete -namespace apps app/db
Secret "app/db": undeleted the current version
```
