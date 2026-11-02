---
title: "Command: secret import"
linkTitle: "secret import"
description: "The \"secret import\" command copies secrets into the built-in secret store from Vault KV or from Variables (Norca)."
---

The `secret import` command copies secrets into the built-in secret store of the namespace given with
`-namespace`. Exactly one of `-from-vault` and `-from-variable` is required.

- `-from-vault` reads the KV secrets below a prefix of a Vault (or OpenBao) KV v1 or v2 mount, recursively,
  with the standard Vault environment of the user: `VAULT_ADDR`, `VAULT_TOKEN` (or the token file of the
  vault CLI, `~/.vault-token`), `VAULT_NAMESPACE`, `VAULT_CACERT` and the other `VAULT_*` variables. The
  mount and its KV version are read from Vault. Each secret is written to its path below the mount
  (`kv/app/db` becomes `app/db`), which is the path that Vault-style lookups of jobs read through the
  default [`vault_kv`](/docs/configuration/secrets#vault_kv-parameters) rules once the agents' `vault`
  blocks are removed. Values that are not strings are stored as JSON. Only the latest version is copied;
  deleted versions are skipped.
- `-from-variable` copies a [Variable](/docs/concepts/variables) (or, for a path ending in `/`, every
  Variable below it) into a secret of the same path; `-move` deletes the Variable after it was copied.

By default, secrets that exist already are skipped, and new secrets are written only if they still don't
exist, so a secret written meanwhile is never overwritten. Values are never printed: the command prints the
source and target paths and versions of each secret, and a summary.

If ACLs are enabled, this command requires the `write-secret` capability (and `list-secrets` for
`-dry-run`) for the target paths, and Variables `read` (and `destroy` for `-move`) for `-from-variable`.

## Usage

```plaintext
norca secret import [options] -from-vault <mount>/<prefix>
norca secret import [options] -from-variable <path>
```

## General Options

The [general options](/docs/commands/secret#general-options) of the CLI.

## Import Options

- `-from-vault <mount>/<prefix>`: The Vault KV mount and the prefix below it to import, for example
  `kv/app/` or `secret/app/db`. A KV v2 prefix may include `data/`.

- `-from-variable <path>`: The Variable, or with a trailing `/` the Variables below the path, to import.

- `-kv-version <1|2>`: The KV version of the Vault mount; by default it is read from Vault.

- `-vault-address <address>`, `-vault-namespace <namespace>`: Override `VAULT_ADDR` and
  `VAULT_NAMESPACE`.

- `-prefix-map <from>=<to>`: Write the secrets whose source path (below the mount for Vault) starts with
  `<from>` to `<to>` followed by the rest of the path. Can be repeated; the longest `<from>` wins. For
  example `-prefix-map app/=prod/app/`.

- `-overwrite`: Write a new version of secrets that exist already; by default they are skipped.

- `-move`: With `-from-variable`, delete each Variable once it was copied.

- `-dry-run`: Show what would be imported without writing anything. KV v2 values are not read (the
  versions come from the metadata).

## Examples

Preview, then import the KV v2 secrets below `kv/app/` into the namespace `apps`:

```shell
$ export VAULT_ADDR=https://vault.example.internal:8200
$ norca secret import -namespace apps -from-vault kv/app/ -dry-run
$ norca secret import -namespace apps -from-vault kv/app/
```

Import into another path prefix:

```shell
$ norca secret import -namespace apps -from-vault kv/app/ -prefix-map app/=prod/app/
```

Move all Variables below `app/` into secrets:

```shell
$ norca secret import -namespace apps -from-variable app/ -move
```
