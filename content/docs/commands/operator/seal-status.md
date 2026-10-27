---
title: "Command: operator seal-status"
linkTitle: "operator seal-status"
description: "The \"operator seal-status\" command shows the keyring seal of the region and the seal state of every server (Norca)."
---

The `operator seal-status` command (Norca) shows the [keyring seal](/docs/features/secrets/seal) of the
region and, for every server, whether it is sealed, the progress of its unseal and the state of the secret
store core. A sealed server serves everything that needs no decryption and rejects Variables, workload
identity signing, mTLS issuance and the secret store.

During a [rewrap](/docs/commands/operator/keyring-rewrap) the output also shows the rewrap, the servers
that are done and the servers that are sealed and must be unsealed with the new shares afterwards. A secret
store restored from a backup wrapped by other shares is shown as "needs recovery" with the seals that wrap
its key; see [`operator unseal -recover`](/docs/commands/operator/unseal).

If ACLs are enabled, this command requires a token with the `operator:read` capability.

## Usage

```plaintext
norca operator seal-status [options]
```

## General Options

The general options of the CLI (`-address`, `-region`, `-token`, the TLS and color options); see
[Commands](/docs/commands#environment-variables).

## Seal Status Options

- `-server-id <name or ID>`: Show only this server.

- `-json`: Output the status in JSON format.

- `-t`: Format and display the status using a Go template.

## Output

The first block shows the seals of the region: `aead (implicit: no seal configuration)`,
`none (not initialized)`, or for example `shares (3 of 5, key 1a2b3c4d)`. The table has one row per server:

| Column | Meaning |
| --- | --- |
| `Leader` | Whether the server is the leader |
| `Sealed` | Whether the server is sealed |
| `Seal` | The seals the server holds, or `not initialized` |
| `Unseal Progress` | Shares entered of the threshold while sealed, for example `1/3` |
| `Secret Store` | `active` (leader), `standby`, `sealed`, `needs recovery` or `not initialized` |
| `Configured Seal` | The seal of the server's `keyring` block |

## Examples

```shell
$ norca operator seal-status
Region seals = shares (3 of 5, key 1a2b3c4d)

Name     Leader  Sealed  Seal    Unseal Progress  Secret Store  Configured Seal
norca-1  true    false   shares  -                active        shares
norca-2  false   true    shares  1/3              sealed        shares
norca-3  false   false   shares  -                standby       shares
```
