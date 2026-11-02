---
title: "Command: operator keyring rewrap"
linkTitle: "operator keyring rewrap"
description: "The \"operator keyring rewrap\" command moves the keys of the region to another keyring seal, online (Norca)."
---

The `operator keyring rewrap` command (Norca) moves the root keys of the keyring and the key of the secret
store to another [seal](/docs/features/secrets/seal), online. Every server adds wraps of the new seal to its
keys, and once every running, unsealed server is done, the wraps of the old seal are dropped. Until then
both seals unwrap the keys. Servers that are down or sealed don't hold the rewrap up: unseal them with the
shares of the new seal afterwards. Follow the progress with
[`norca operator seal-status`](/docs/commands/operator/seal-status).

The command is also available as `norca operator root keyring rewrap`.

- Rewrapping to `shares` generates a new unseal key and prints its shares **once**: they are stored nowhere;
  hand them to the share holders.
- From `shares` to `shares` it replaces the shares (a rekey); the old shares stop working when the rewrap
  is complete. The new unseal key reaches the other servers only wrapped by the current seal.
- In a new region whose servers are configured with `seal "shares"`, the first rewrap to `shares`
  initializes the keyring; unseal every other server with the new shares.

A rewrap does not rotate the keys. After leaving the `aead` seal, rotate the root keys with
[`norca operator root keyring rotate -full`](/docs/commands/operator/root/keyring-rotate), since copies of
the old key files or backups may still hold the keys unprotected.

If ACLs are enabled, this command requires a token with the `operator:write` capability.

## Usage

```plaintext
norca operator keyring rewrap -to <seal> [options]
```

## General Options

The general options of the CLI (`-address`, `-region`, `-token`, the TLS and color options); see
[Commands](/docs/commands#environment-variables).

## Rewrap Options

- `-to <seal>`: The seal to move to: `shares` or `aead`. Required.

- `-shares <n>`: The number of unseal shares of a new `shares` seal. Defaults to the leader's
  configuration, or 5.

- `-threshold <n>`: The number of shares that unseal a server. Defaults to the leader's configuration, or
  3.

## Examples

Initialize a new region, or move an existing region from `aead` to `shares`:

```shell
$ norca operator keyring rewrap -to shares
Rewrap 6f1c2a90-... to "shares" started

Unseal share 1: ...
Unseal share 2: ...
Unseal share 3: ...
Unseal share 4: ...
Unseal share 5: ...

The unseal shares are shown only this once and are stored nowhere. A restarted
server stays sealed until 3 of them are entered with 'norca operator unseal'.
Losing more than 2 of the 5 shares makes the keys unrecoverable.
Follow the progress with 'norca operator seal-status'.
```

Replace the shares with seven new ones, four of which unseal a server:

```shell
$ norca operator keyring rewrap -to shares -shares 7 -threshold 4
```
