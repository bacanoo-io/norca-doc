---
title: "Operating the seal"
linkTitle: "Seal and unseal"
description: "Initialize the shares seal, unseal servers after a restart, rekey, handle the unseal shares, and restore a backup that was taken with other shares."
---

This page describes the day-to-day operation of the `shares` [keyring seal](/docs/features/secrets/seal):
the root keys of the keyring and the key of the built-in secret store are wrapped by an unseal key split
into Shamir shares, and every server that starts is sealed until a threshold of shares is entered on it.
The commands need a token with `operator:write` (`operator:read` for the status).

## Before you start

- Decide on the number of shares and the threshold. The defaults, 5 shares of which 3 unseal a server,
  tolerate the loss of two shares and require three people for an unseal.
- Choose the share holders: different people, each keeping one share in their own password manager or
  hardware token. Never store shares on the servers, in the job specifications, or together in one place.
- Keep a second recovery path: [backups](/docs/features/backup-restore) encrypted with `age` carry the keys
  for a full restore with the age identity.

## Initialize a new region

{{% steps %}}

### Configure the seal on every server

```hcl {filename="norca.hcl"}
server {
  keyring {
    seal "shares" {
      shares    = 5
      threshold = 3
    }
  }
}
```

Check it with `norca config validate`, start the servers and bootstrap the ACLs as usual. The keyring is
uninitialized.

### Generate the shares

```shell
norca operator keyring rewrap -to shares
```

The command prints the five shares **once**; they are stored nowhere. Hand one to each share holder now.
The leader is unsealed.

### Unseal the other servers

In a region with several servers, the others are sealed. Three share holders enter their shares on each of
them:

```shell
norca operator seal-status                         # names of the sealed servers
norca operator unseal -server-id <name of server 2>  # three times, one share each
norca operator unseal -server-id <name of server 3>  # three times, one share each
norca operator seal-status
```

{{% /steps %}}

The deployment examples [single node](/docs/getting-started/examples/02-single-node) and
[three nodes](/docs/getting-started/examples/03-three-node) go through these steps.

## After a restart

A restarted server is sealed: it joins Raft and serves everything that needs no decryption, but rejects
Variables, workload identity signing, mTLS issuance and the secret store with `server is sealed` (HTTP
503). The region keeps working while the leader and enough servers are unsealed.

```shell
norca operator seal-status
norca operator unseal -server-id norca-2   # prompts for one share without echo
```

`operator unseal` reads the share from standard input or a hidden prompt, never from the command line, so
it doesn't end up in the shell history. The share can be entered from any machine that reaches the HTTP
API; with `-server-id` the request is forwarded to that server. A share of the wrong size is rejected at
once. A wrong share among valid ones is detected when the threshold is reached: the unseal fails with
"the shares did not reconstruct the unseal key", the shares entered so far are discarded, and the share
holders start again. `norca operator unseal -server-id <name> -reset` discards the shares entered so far
without trying them.

A server that stays sealed is a reason to alert: watch `norca operator seal-status` (or
`GET /v1/operator/seal`) from your monitoring.

A new or replaced server that joins a region with the `shares` seal is sealed as well. Unseal it with the
current shares; it then receives the keys from the other servers, wrapped by the seal.

## Rekey: replace the shares

Replace the shares when a share holder leaves, a share may have been exposed, or the threshold should
change:

```shell
norca operator keyring rewrap -to shares -shares 5 -threshold 3
norca operator seal-status   # Rewrap, Servers done, Servers sealed
```

The rewrap runs online. It completes when every other server is done, sealed or down; then the old shares
stop working. A server that was sealed or down during the rewrap must be unsealed with the **new**
shares.

## Move an existing cluster from `aead` to `shares`

A cluster that ran without a `keyring` block (or with `seal "aead"`) keeps working when the block is
added; nothing changes until the rewrap:

```shell
# 1. Add keyring { seal "shares" { ... } } to every server and restart them one by one.
# 2. Move the keys to the new seal and hand out the printed shares.
norca operator keyring rewrap -to shares
# 3. Rotate the root keys: copies of old key files and backups still hold the old keys unprotected.
norca operator root keyring rotate -full
```

From now on, every restarted server needs the shares. `norca operator keyring rewrap -to aead` moves back
(for development only).

## Restore with another seal

A backup holds the secret store key wrapped by the seal that was in use when it was taken. When a full
restore brings back a store wrapped by shares the region no longer uses (for example after a rekey),
`norca operator seal-status` shows the secret store as "needs recovery", and secret requests fail with a
message that points to the recovery.

- **Backups with a secret store key.** Backups that include the keyring also carry the secret store key,
  encrypted like the keyring (`kms` or `age`). A full restore re-wraps it with the region's current seal,
  and `norca operator backup restore-bootstrap` hands it to the new server. Nothing else is needed.
- **Recovery with the old shares.** Otherwise, enter the old shares on the leader until they unwrap the
  restored key:

  ```shell
  norca operator unseal -recover            # one old share per call
  norca operator unseal -recover -reset     # discard the old shares entered so far
  norca operator seal-status
  ```

  When the store is recovered, its key is wrapped by the region's current seal.

A full restore and `norca operator snapshot restore` keep the region's own seal configuration: the
keystores are not part of the snapshot. See [backup and restore](/docs/operations/backup-restore).

## Lost shares

If fewer than `threshold` shares remain, a sealed server can't be unsealed. While at least the leader is
unsealed, rekey at once (`norca operator keyring rewrap -to shares`) to get a new set of shares, and don't
restart the unsealed servers before the rekey is complete. If no server can be unsealed any more, the keys
of the region are lost; what remains is a restore from a backup whose keys are encrypted with `age` or
`kms`, see [backup and restore](/docs/operations/backup-restore).

## Reference

| Command | Description |
| --- | --- |
| [`norca operator seal-status`](/docs/commands/operator/seal-status) | Seal of the region and state of every server |
| [`norca operator unseal`](/docs/commands/operator/unseal) | Enter one share; `-reset`, `-recover` |
| [`norca operator keyring rewrap`](/docs/commands/operator/keyring-rewrap) | Move to another seal, rekey |
| [`keyring` block](/docs/configuration/keyring) | Seal configuration of the servers |
