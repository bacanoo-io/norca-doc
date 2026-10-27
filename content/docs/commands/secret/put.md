---
title: "Command: secret put"
linkTitle: "secret put"
description: "The \"secret put\" command writes a new version of a secret and optionally its metadata (Norca)."
---

The `secret put` command writes a new version of a secret, and optionally its metadata. Without items,
only the metadata of an existing secret is updated. The metadata flags change only the fields they set;
the other fields are kept.

Items are given as arguments:

| Argument | Value |
| --- | --- |
| `<item>=@<file>` | The content of the file |
| `<item>=-` | Read from standard input |
| `-` | All items, read from standard input as a JSON object of strings |
| `<item>=<value>` | The argument itself |

Values given as plain arguments end up in the shell history and the process list, and the command warns
about them; prefer `@<file>` or standard input. Standard input can be used once per command.

If ACLs are enabled, this command requires the `write-secret` capability for the path.

## Usage

```plaintext
norca secret put [options] <path> [<item>=<value> | <item>=@<file> | <item>=- | -]...
```

## General Options

The [general options](/docs/commands/secret#general-options) of the CLI.

## Put Options

- `-check-index <index>`: Write only if the secret's modify index is the given one; `0` writes only if the
  secret does not exist yet. A mismatch fails without writing.

- `-description <text>`: Description of the secret (at most 1024 bytes).

- `-owner <name>`: Person or team responsible for the secret (at most 256 bytes).

- `-label <key>=<value>`: Label of the secret; can be repeated. Labels are added to the existing ones.

- `-expires-at <time>`: When the value expires: an RFC 3339 time, or a duration from now (for example
  `720h`). Stored and shown; expiry warnings are not available yet.

- `-rotate-every <duration>`: How often the value should be rotated. Stored and shown.

- `-max-versions <n>`: Number of versions kept (default 10, at most 100); older versions are destroyed on
  the next write.

## Examples

Write a new secret, the password from a file:

```shell
$ norca secret put -namespace apps -description "Database login" -owner team-a \
    app/db username=app password=@pw.txt
Wrote secret "app/db" version 1
```

Write a new version, typing the password (end with Ctrl-D):

```shell
$ norca secret put -namespace apps app/db username=app password=-
Wrote secret "app/db" version 2
```

All items from a JSON document on standard input, only if the secret doesn't exist yet:

```shell
$ generate-credentials | norca secret put -check-index 0 app/api -
```

Update only the metadata:

```shell
$ norca secret put -namespace apps -label tier=gold -max-versions 20 app/db
Updated the metadata of secret "app/db"
```
