---
title: "Command: secret destroy"
linkTitle: "secret destroy"
description: "The \"secret destroy\" command destroys versions of a secret, or the whole secret, permanently (Norca)."
---

The `secret destroy` command destroys versions of a secret permanently, or with `-all` the whole secret
with all of its versions and its metadata. Destroyed values can't be restored. One of `-versions` and
`-all` is required: there is no default, so that a destroy never removes more than was named (the
[API](/docs/api/secrets#destroy-versions-or-a-secret) destroys the whole secret when no versions are
given). Without either the command fails with "Name the versions to destroy with -versions, or
destroy the whole secret with -all"; with both, with "Only one of -versions and -all can be
given".

If ACLs are enabled, this command requires the `destroy-secret` capability for the path.

## Usage

```plaintext
norca secret destroy [options] -versions <n,...> <path>
norca secret destroy [options] -all <path>
```

## General Options

The [general options](/docs/commands/secret#general-options) of the CLI.

## Destroy Options

- `-all`: Destroy the whole secret with all of its versions and its metadata.

- `-versions <n,...>`: Comma separated versions to destroy. Required unless `-all` is given.

- `-check-index <index>`: Apply only if the secret's modify index is the given one.

## Examples

Destroy the oldest two versions:

```shell
$ norca secret destroy -namespace apps -versions 1,2 app/db
Secret "app/db": destroyed versions 1,2
```

Destroy the whole secret:

```shell
$ norca secret destroy -namespace apps -all app/db
Destroyed secret "app/db" with all of its versions
```
