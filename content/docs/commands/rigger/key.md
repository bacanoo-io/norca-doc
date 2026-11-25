---
title: "Command: rigger key"
linkTitle: "rigger key"
description: "The rigger key command generates a signing key pair, signs a module with it and verifies the signature."
---

The `rigger key` command makes the keys that modules and stacks are signed with, signs and verifies.
See [supply chain](/docs/features/packages/supply-chain) for how a stack trusts keys.

## Usage

```plaintext
norca rigger key generate [--out name]
norca rigger key sign [dir] --key name.key
norca rigger key verify [dir] --key name.pub
```

| Command | What it does |
| --- | --- |
| `key generate` | Writes `name.key`, encrypted with the password of `RIGGER_KEY_PASSWORD`, and `name.pub`. |
| `key sign` | Signs the tree digest of a module into its `.rigger-signatures` directory. |
| `key verify` | Checks that a module is signed by the key. |

## Key Options

- `--out`: `generate`: the files to write, `<out>.key` and `<out>.pub`. Defaults to `rigger`.

- `--key`: `sign`: the private key. `verify`: the public key.

## Examples

```shell
$ norca rigger key generate --out acme
$ norca rigger key sign modules/redis --key acme.key
$ norca rigger key verify modules/redis --key acme.pub
```
