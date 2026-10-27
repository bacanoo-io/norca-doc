---
title: "Command: secret"
linkTitle: "secret"
description: "The \"secret\" command groups subcommands for the secrets of the built-in secret store (Norca)."
---

The `secret` command (Norca) groups subcommands for the secrets of the
[built-in secret store](/docs/features/secrets). Secrets are versioned key/value items kept encrypted on
the servers. Their values are returned only by an explicit, audited read; listings, the metadata and the
event stream show paths, metadata and a keyed hash of the value.

## Usage

Usage: `norca secret <subcommand> [options] [args]`

Run `norca secret <subcommand> -h` for help on that subcommand. The following subcommands are available:

- [`secret list`](/docs/commands/secret/list) - List secrets
- [`secret info`](/docs/commands/secret/info) - Show the metadata and versions of a secret
- [`secret get`](/docs/commands/secret/get) - Read the value of a secret
- [`secret put`](/docs/commands/secret/put) - Write a secret
- [`secret delete`](/docs/commands/secret/delete) - Soft delete versions of a secret
- [`secret undelete`](/docs/commands/secret/undelete) - Restore soft deleted versions of a secret
- [`secret destroy`](/docs/commands/secret/destroy) - Destroy versions of a secret (`-versions`), or the whole secret (`-all`), permanently; one of the two is required
- [`secret import`](/docs/commands/secret/import) - Import secrets from Vault KV or from Variables

There is no separate `versions` subcommand: `secret info` lists the retained versions.

## General Options

Every subcommand accepts the general options of the CLI: `-address`, `-region`, `-namespace`, `-token`,
the TLS options (`-ca-cert`, `-ca-path`, `-client-cert`, `-client-key`, `-tls-server-name`,
`-tls-skip-verify`) and `-no-color`/`-force-color`. See [Commands](/docs/commands#environment-variables)
for the environment variables that set them. Secrets live in a namespace; `-namespace` selects it
(default `default`).

## Examples

Write a secret, reading the password from a file:

```shell
$ norca secret put prod/db/postgres username=app password=@pw.txt
Wrote secret "prod/db/postgres" version 1
```

List the secrets below a prefix:

```shell
$ norca secret list prod/
```

Show the metadata and versions of a secret:

```shell
$ norca secret info prod/db/postgres
```

Print one item of the current version:

```shell
$ norca secret get -item password prod/db/postgres
```
