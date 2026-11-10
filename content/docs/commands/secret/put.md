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

**Values given as plain arguments end up in the shell history and the process list**, and the command warns
about them; prefer `@<file>` or standard input. Standard input can be used once per command.

If ACLs are enabled, this command requires the `write-secret` capability for the path, and
`dispatch-job` in the namespace to set or change the rotation job.

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
  `720h`). The leader announces `SecretExpiring` within the
  [expiry warning window](/docs/configuration/secrets#server-secrets-block) and `SecretExpired` once it
  has passed.

- `-rotate-every <duration>`: How often the value should be rotated. The leader announces
  `SecretRotationDue` once the interval has elapsed since the current version was written; `0` removes
  the interval.

- `-rotate-job <job>`: Parameterized job of the secret's namespace that the leader dispatches once per
  version when the rotation is due; the job writes the new version. It must declare the dispatch meta key
  `secret_path` and requires a rotation interval. An empty value (`-rotate-job ""`) removes it. See
  [expiry and rotation](/docs/features/secrets/secrets#expiry-and-rotation).

- `-max-versions <n>`: Number of versions kept (default 10, at most 100); older versions are destroyed on
  the next write.

- `-replicate`: Replicate the secret to the other regions of the federation, where it is a read-only
  replica. Only allowed in the authoritative region; `-replicate=false` stops the replication and removes
  the replicas. See
  [replication between regions](/docs/features/secrets/secrets#replication-between-regions).

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

Rotate every 30 days with a rotation job:

```shell
$ norca secret put -namespace apps -rotate-every 720h -rotate-job rotate-db-password app/db
Updated the metadata of secret "app/db"
```

Update only the metadata:

```shell
$ norca secret put -namespace apps -label tier=gold -max-versions 20 app/db
Updated the metadata of secret "app/db"
```

Replicate a secret of the authoritative region to the other regions (read-only there):

```shell
$ norca secret put -namespace apps -replicate app/db
Updated the metadata of secret "app/db"
```
