---
title: "Command: secret get"
linkTitle: "secret get"
description: "The \"secret get\" command reads the value of a version of a secret; the read is audited (Norca)."
---

The `secret get` command reads the value of a version of a secret. The read is recorded in the audit
trail of the secret store. Values are only printed when asked for explicitly with `-item` or `-format`;
without either the command refuses to print anything. To see the metadata, use
[`secret info`](/docs/commands/secret/info).

If ACLs are enabled, this command requires the `read-secret` capability for the path.

## Usage

```plaintext
norca secret get [options] <path>
```

## General Options

The [general options](/docs/commands/secret#general-options) of the CLI.

## Get Options

- `-version <n>`: The version to read. Defaults to the current version.

- `-item <key>`: Print only the value of the item.

- `-format ( json | env )`: Print all items, as a JSON object or as `KEY='value'` lines quoted for POSIX
  shells.

Only one of `-item` and `-format` can be given.

## Examples

```shell
$ norca secret get -namespace apps -item password app/db
s3cr3t-value

$ norca secret get -namespace apps -format env app/db
password='s3cr3t-value'
username='app'

$ norca secret get -namespace apps -version 1 -format json app/db
{
  "password": "old-value",
  "username": "app"
}
```
