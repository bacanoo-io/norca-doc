---
title: "Key Management"
description: "Learn about the key management in Norca."
upstream:
  path: "website/content/docs/operations/key-management.mdx"
---

Norca servers maintain an encryption keyring used to encrypt [Variables][] and
sign task [workload identities][]. The servers store key metadata in raft, but
the encryption key material is stored in a separate file in the `keystore`
subdirectory of the Norca [data directory][]. These files have the extension
`.nks.json`. The key material in each file is wrapped in a unique key encryption
key (KEK) that is not shared between servers.

Under normal operations the keyring is entirely managed by Norca, but this
section provides administrators additional context around key replication and
recovery.

## Key Rotation

Only one key in the keyring is "active" at any given time, and all encryption
and signing operations happen on the leader. Norca automatically rotates the
active encryption key every 30 days. When a key is rotated, the existing keys
are marked as "inactive" but not deleted, so they can be used for decrypting
previously encrypted variables and verifying workload identities for existing
allocations.

If you believe key material has been compromised, you can execute [`norca
operator root keyring rotate -full`][]. A new "active" key will be created and
"inactive" keys will be marked "rekeying". Norca will asynchronously decrypt and
re-encrypt all variables with the new key. As each key's variables are encrypted
with the new key, the old key will marked as "deprecated".

## Key Replication

When a leader is elected, it creates the keyring if it does not already
exist. When a key is added, the metadata will be replicated via raft. Each
server runs a key replication process that watches for changes to the state
store and will fetch the key material from the leader asynchronously, falling
back to retrieving from other servers in the case where a key is written
immediately before a leader election.

## Restoring the Keyring from Backup

Key material is never stored in raft. This prevents an attacker with a backup of
the state store from getting access to encrypted variables. It also allows
cluster snapshots to be shared, for example for troubleshooting, without
exposing any of your keys or variables.

However, this means that to restore a cluster from snapshot you need to also
provide the keystore directory with the `.nks.json` key files on at least one
server. The `.nks.json` key files are unique per server, but only one server's
key files are needed to recover the cluster. Operators should include these
files as part of your organization's backup and recovery strategy for the
cluster.

If you are recovering a Raft snapshot onto a new cluster without running
workloads, you can skip restoring the keyring and run [`norca operator root
keyring rotate`][] once the servers have joined.

## Norca extensions: the keyring seal

In Norca the key-encrypting key described above is replaced by a **seal**. With the default `aead` seal it
is stored next to the key, as described on this page. With
[`keyring { seal "shares" }`](/docs/configuration/keyring), the root keys and the key of the secret store
are wrapped by an unseal key split into Shamir shares: a restarted server is sealed until a threshold of
shares is entered, and keys travel between servers only wrapped by the seal. See
[Seal](/docs/features/secrets/seal) and [Operating the seal](/docs/operations/seal-unseal). Norca's
[backups](/docs/features/backup-restore) include the keyring, encrypted for the backup's recipients.

[variables]: /docs/concepts/variables/
[workload identities]: /docs/concepts/workload-identity/
[data directory]: /docs/configuration#data_dir
[`norca operator root keyring rotate -full`]: /docs/commands/operator/root/keyring-rotate/
[`norca operator root keyring rotate`]: /docs/commands/operator/root/keyring-rotate/
