---
title: "Secrets"
weight: 2
description: "Versioned Secret objects of the built-in store: metadata, versions, soft delete, ACL capabilities and audit."
---

## What and why

[Variables](/docs/concepts/variables) are widely used for configuration that is not secret, every task of
a job can read its own Variables without a policy, and they have no versions and no audit. Secrets are
therefore a separate object with stricter rules:

- **No implicit task access.** A task reads a secret only if its job grants it with
  [`secret_access`](/docs/job-specification/secret_access) or a policy bound to the job grants
  `read-secret`.
- **Values only by explicit read.** Listings, metadata, events, the event stream and the web UI show paths,
  metadata and a keyed hash of the value, never the value itself.
- **Versions.** Every write creates a version; older versions are kept up to `max_versions` and can be
  read, soft deleted, undeleted and destroyed.
- **Audit.** Every value read and every write produces an audit record with the accessor and the result.

## How it works

A secret lives at a **path** in a **namespace**, for example `prod/db/postgres` in `apps`.

| Part | Description |
| --- | --- |
| Path | Letters, digits, `-`, `_`, `~` and `/`, at most 256 characters, no leading, trailing or double `/`. |
| Items | The value: key/value pairs of strings. Item keys use letters, digits, `_`, `.` and `-` (at most 128 characters). At most 64 KiB per version in total. |
| Versions | Numbered from 1. The last `max_versions` (default 10, at most 100) are kept; older ones are destroyed on the next write. |
| Metadata | `Description` (at most 1024 bytes), `Owner` (at most 256 bytes), `Labels` (at most 64), `ExpiresAt`, `RotateEvery`, `Rotate` (the rotation job), `MaxVersions`, `Replicate` ([replication](#replication-between-regions)). **Metadata is never secret: everyone who may list the secret sees it.** |
| Value hash | `hmac-sha256:...`, a keyed hash of the items per version, so changes are visible without the value and the value can't be guessed offline. |
| State | A version can be **deleted** (soft; `undelete` restores it) or **destroyed** (permanent). Destroying the whole secret removes all versions and the metadata. |

The values are encrypted by the barrier of the secret store and written to Raft; the metadata row is
in its own table and can be watched with blocking queries. All value reads and writes run on the leader.

### Expiry and rotation

The leader watches the secrets and announces three conditions of every **live** secret (its current
version is neither deleted nor destroyed) on the `Secret` event topic, with metadata only:

| Event | When |
| --- | --- |
| `SecretExpiring` | `ExpiresAt` is within the expiry warning window: 7 days by default, [`server { secrets { expiry_warning } }`](/docs/configuration/secrets#server-secrets-block). |
| `SecretExpired` | `ExpiresAt` has passed. |
| `SecretRotationDue` | `RotateEvery` has elapsed since the current version was written. |

- **Once per version and condition.** Each event is published once for a version of a secret and the
  setting it was computed from. Changing `ExpiresAt` or `RotateEvery` evaluates the secret anew, and a
  new version starts over (its rotation is due `RotateEvery` after it was written).
- **Leader changes.** What was announced is kept in the leader's memory only: a new leader announces the
  conditions that hold once more, then not again. Subscribers that act on the events should be
  idempotent per secret and version.
- **Timing.** The leader evaluates on every change of a secret and at the next known due time, at least
  once a minute.
- **Metrics.** The leader sets the gauges `nomad.secrets.expiring`, `nomad.secrets.expired` and
  `nomad.secrets.rotation_due` (numbers of live secrets in each condition; 0 on the other servers) and
  counts rotation dispatches in `nomad.secrets.rotation.dispatched` and `nomad.secrets.rotation.failed`.

**A static secret is never changed by the store itself.** To rotate it automatically, name a **rotation
job**: a [parameterized](/docs/job-specification/parameterized) batch job in the secret's namespace
that creates the new value and writes it as a new version
(`norca secret put -rotate-job rotate-db-password`, or `"Rotate": {"Job": "rotate-db-password"}` in the
API metadata; it requires `RotateEvery`). When the rotation of a version is due, the leader dispatches
the job **once for that version**:

- **Dispatch meta.** `secret_path` is always passed and must be declared in the job's `meta_required` or
  `meta_optional`; `secret_namespace` and `secret_version` are passed only if the job declares them. The
  job reads them as `NORCA_META_secret_path` and so on.
- **Authority.** The leader dispatches with its own authority. Because of that, setting or changing the
  rotation job of a secret requires `dispatch-job` in the namespace next to `write-secret` (also for a
  backup restore with `-with-metadata`); keeping it in a metadata update does not. The job itself needs `read-secret`/`write-secret` on the path, for example
  through a policy bound to the job; it writes the new version with its workload identity, and the
  [`secret` blocks](/docs/features/secrets/delivery) of the consuming tasks re-deliver it according to
  their `change_mode`.
- **Idempotent.** The dispatch carries an idempotency token made of the secret and its version, so a new
  leader that finds the child job of an earlier dispatch does not dispatch again. The token protects
  while the child job exists: if it has been garbage collected and the version is still not rotated, a
  new leader dispatches once more.
- **Failures.** A missing job, a job that is not parameterized, a job without `secret_path` in its
  meta keys or any other dispatch error is published as `SecretRotationFailed` (with the error, the
  attempt and the next attempt), logged as a warning on the leader and retried with a backoff that
  doubles from 1 minute up to 1 hour. Changing the rotation job retries at once. While the store is
  sealed, dispatches wait without counting as attempts.
- **Audit.** Every dispatch attempt is an audit record with the operation `rotate`, the secret's
  version, the accessor `{"System": "secret-rotation"}`, the job and the dispatched child job, never a
  value. A successful dispatch is also published as `SecretRotationDispatched`.
- A job that finishes without writing a new version is not dispatched again for the same version;
  `SecretRotationDue` stays the current condition and the gauge keeps counting the secret.

```hcl {filename="rotate-db-password.norca.hcl"}
job "rotate-db-password" {
  namespace = "apps"
  type      = "batch"

  parameterized {
    meta_required = ["secret_path"]
    meta_optional = ["secret_namespace", "secret_version"]
  }

  group "rotate" {
    task "rotate" {
      driver = "exec"
      config {
        command = "/usr/local/bin/rotate-db-password"
        args    = ["${NORCA_META_secret_path}"]
      }
    }
  }
}
```

### Replication between regions

Secrets are **region-local**: every region has its own store, keyring and seal. In a
[federation](/docs/concepts/architecture), a secret can be copied to all other regions by marking it
`Replicate` in the **authoritative region** (the servers'
[`authoritative_region`](/docs/configuration/server#authoritative_region), the region the ACL
replication copies from): `norca secret put -replicate app/db` or `"Replicate": true` in the API
metadata. Every other region then holds a **read-only replica** of it.

```shell
# In the authoritative region (eu):
$ norca secret put -region eu -namespace apps -replicate app/db password=@pw.txt

# In another region (us), the replica is read like any secret...
$ norca secret get -region us -namespace apps -item password app/db

# ...but not changed.
$ norca secret put -region us -namespace apps app/db password=@new.txt
Error writing secret: Unexpected response code: 409 (secret "app/db" is replicated from the
authoritative region "eu" and is read-only in region "us"; change it in region "eu")
```

- **Read-only.** Outside the authoritative region, writes, metadata changes, delete, undelete, destroy
  and the [selective restore](/docs/features/backup-restore) of a replica fail with status 409 and the
  message above. `Replicate` can only be set in the authoritative region (400 elsewhere). Reads work as
  for any secret, with `read-secret` in the replica's region; tasks read the replica of their own region
  through the `norca` provider, never a secret of another region.
- **What is copied.** All retained versions with their numbers and creation times, soft deletes and
  destroys of versions, and the metadata (description, owner, labels, `ExpiresAt`, `RotateEvery`, the
  rotation job, `MaxVersions`). The value of a soft deleted version is copied only once it is undeleted.
  Expiry events are announced in every region; the rotation job runs **only in the authoritative region**,
  which writes the new version that is then replicated.
- **Removal.** Destroying the whole secret, or clearing `Replicate` (`-replicate=false`), in the
  authoritative region removes the replicas: a tombstone confirmed by the authoritative leader.
- **How.** The leader of every other region pulls over the region RPC (the server-to-server
  connection that also carries the ACL replication): a blocking query on the metadata of the replicated
  secrets returns at every change, and at least every 5 minutes; each time, the leader compares every
  replicated path with its replicas by version numbers, version states and the value hashes of the
  authoritative region, and fetches what differs from the authoritative leader. A leader change, an
  offline period, a sealed store or a restore are therefore caught up by the next comparison. Changes
  usually arrive within a second.
- **Encryption.** In addition to the servers' mutual TLS, each value is encrypted by the authoritative
  leader for the X25519 **replication key** of the requesting region (ECDH with a fresh key per value,
  HKDF-SHA256, AES-256-GCM, bound to both regions, the path and the version). The private key is kept in
  the region's secret store, protected by its seal, and replaced whenever the active root key of the
  region's keyring changes (`norca operator root keyring rotate`); the authoritative region fetches the
  public key from the region itself. A value is in plaintext only in the memory of the two leaders; the
  replica is written re-encrypted by the barrier of its own region.
- **Hashes.** A replica's `ValueHash` is the keyed hash of its own region and differs from the
  authoritative one; each version also carries `SourceHash`, the hash in the authoritative region, and
  the secret carries `Replica` (`Region`, `SourceCreateIndex`, `SourceModifyIndex`).
  [`secret info`](/docs/commands/secret/info) shows `Replicated From`.
- **Conflicts.** A replica never replaces a secret the region created itself at the same path: the leader
  logs a warning and counts `nomad.secrets.replication.conflict`; destroy the local secret to receive the
  replica. An older state never replaces a newer one: if the authoritative region is restored to a backup
  with a lower version of a secret, the replicas keep their newer version until the secret is written
  again there.
- **Permissions.** With ACLs, the other regions need a
  [`replication_token`](/docs/configuration/acl#replication_token) (a management token of the
  authoritative region, as for the ACL replication). The internal RPCs `Secret.ReplicationList`,
  `Secret.Replicate` and `Secret.ReplicationKey` have no HTTP endpoint and accept only servers: with
  `verify_server_hostname`, the server certificate of the requesting region.
- **Audit and events.** In the authoritative region, each fetch of values is an audit record with the
  operation `replicate`, the versions read, the accessor `{"System": "secret-replication"}` with the
  replication token's accessor ID and `PeerRegion` (the region the values were encrypted for). In the
  other region, each replica write is a `replicate` record with the versions whose values were written,
  and each removal a `destroy` record, both with `PeerRegion` set to the authoritative region. Every
  change of a replica is a `SecretUpserted` or `SecretDeleted` event of the `Secret` topic in its region,
  whose payload carries `Replica`. Values never appear in either.
- **Metrics.** `nomad.secrets.replication.written`, `.removed`, `.failed` and `.conflict` on the leader of
  each non-authoritative region.
- **Backup and restore.** Replicas are part of the region's Raft snapshot like any secret. A replica
  restored in a non-authoritative region (a full or snapshot restore) is overwritten by the replication
  at the next comparison with the current state of the authoritative region, and replicas of secrets
  that are gone there are removed. **Restore replicated secrets in the authoritative region.**

### Permissions

Four namespace capabilities, none of them part of the `read` or `write` policy shorthands:

| Capability | Allows |
| --- | --- |
| `list-secrets` | List paths and read metadata, never values |
| `read-secret` | Read values (implies `list-secrets`) |
| `write-secret` | Create and update secrets and metadata, soft delete and undelete versions |
| `destroy-secret` | Destroy versions and whole secrets permanently |

They are granted for a whole namespace or for paths with globs in a `secret` block of a namespace rule:

```hcl {filename="app-developer.hcl"}
namespace "apps" {
  policy       = "write"
  capabilities = ["list-secrets"]

  # read-secret is needed to submit jobs whose secret_access grants a path:
  # a job never grants its tasks more than its submitter may read.
  secret "*" {
    capabilities = ["list-secrets", "read-secret", "write-secret"]
  }
}
```

See [ACL policy specification](/docs/other-specifications/acl-policy#secrets). The dynamic secrets
engines have their own capabilities, `read-secret-engine` and `write-secret-engine`; see
[Dynamic secrets](/docs/features/secrets/dynamic#permissions).

### Audit

Every value read (also denied ones) and every write, delete, undelete, destroy and restore is recorded,
never with the value:

- On the **`SecretAccess`** event stream topic (event type `SecretAccessed`). Subscribing requires
  `operator:read`. A record holds the time, region, namespace, path, version or versions, operation
  (`read`, `write`, `delete`, `undelete`, `destroy`, `restore`, `rotate`, `replicate`; for
  [dynamic secrets](/docs/features/secrets/dynamic#observability) `engine-write`, `engine-delete`,
  `lease-create`, `lease-renew`, `lease-revoke`), result (`ok`, `denied`, `not-found`,
  `conflict`, `unavailable`, `invalid`, `error`), the accessor (token accessor ID, or the workload
  identity: namespace, job, group, task, allocation and node; or a server component such as
  `{"System": "secret-replication"}`), the other region of a replication (`PeerRegion`) and the server
  that executed it.
- Optionally in an **append-only audit file** on each server
  ([`server { secrets { audit_file } }`](/docs/configuration/secrets#server-secrets-block)), with size and
  time based rotation. Records are written by the server that executed the access, which is the leader.

Changes of secrets are also published on the **`Secret`** topic (`SecretUpserted`, `SecretDeleted`) with
metadata and value hash only; it is visible to everyone who may list the secret's path. The same topic
carries the [expiry and rotation](#expiry-and-rotation) events.

When a client fetches a secret from a provider other than `norca` (the agent's Vault), it sends an audit
record of the fetch to the servers, which record it with the task's workload identity as accessor.

## Example

```shell
# Write: values from a file and from standard input never reach the shell history.
$ norca secret put -namespace apps -description "Database login" -owner team-a \
    app/db username=app password=@pw.txt
Wrote secret "app/db" version 1

# Metadata and versions, never values.
$ norca secret info -namespace apps app/db

# Read one item of the current version (audited).
$ norca secret get -namespace apps -item password app/db

# Write a new version only if nobody else wrote one meanwhile.
$ norca secret put -namespace apps -check-index 1234 app/db username=app password=-

# Remind after 30 days, and let the rotation job write the next version.
$ norca secret put -namespace apps -rotate-every 720h -rotate-job rotate-db-password app/db
Updated the metadata of secret "app/db"

# Soft delete the current version, restore it, destroy an old version.
$ norca secret delete -namespace apps app/db
$ norca secret undelete -namespace apps app/db
$ norca secret destroy -namespace apps -versions 1 app/db
Secret "app/db": destroyed versions 1

# Destroy the whole secret: -all (destroy requires -versions or -all).
$ norca secret destroy -namespace apps -all app/db
Destroyed secret "app/db" with all of its versions
```

## Configuration reference

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `server.secrets.audit_file` | string | `""` | Path of the audit file; empty disables the file (the event topic is always published). |
| `server.secrets.audit_rotate_bytes` | int | `0` | Rotate before the file grows beyond this size; 0 disables. |
| `server.secrets.audit_rotate_duration` | string | `""` | Rotate once the file is older than this duration. |
| `server.secrets.audit_rotate_max_files` | int | `0` | Rotated files kept; 0 keeps all. |
| `server.secrets.expiry_warning` | string | `"168h"` | How long before `ExpiresAt` the leader announces `SecretExpiring`. |

Full reference: [`secrets` block](/docs/configuration/secrets).

## CLI and API

| Command | API | ACL |
| --- | --- | --- |
| [`norca secret list`](/docs/commands/secret/list) | [`GET /v1/secrets`](/docs/api/secrets#list-secrets) | `list-secrets` |
| [`norca secret info`](/docs/commands/secret/info) | [`GET /v1/secret/:path?metadata`](/docs/api/secrets#read-secret-metadata) | `list-secrets` |
| [`norca secret get`](/docs/commands/secret/get) | [`GET /v1/secret/:path`](/docs/api/secrets#read-a-secret-value) | `read-secret` |
| [`norca secret put`](/docs/commands/secret/put) | [`PUT /v1/secret/:path`](/docs/api/secrets#write-a-secret) | `write-secret` |
| [`norca secret delete`](/docs/commands/secret/delete) | [`DELETE /v1/secret/:path`](/docs/api/secrets#delete-versions) | `write-secret` |
| [`norca secret undelete`](/docs/commands/secret/undelete) | [`POST /v1/secret/:path/undelete`](/docs/api/secrets#undelete-versions) | `write-secret` |
| [`norca secret destroy`](/docs/commands/secret/destroy) | [`POST /v1/secret/:path/destroy`](/docs/api/secrets#destroy-versions-or-a-secret) | `destroy-secret` |
| [`norca secret import`](/docs/commands/secret/import) | – | `write-secret` |

A backup includes the secrets (encrypted). `norca operator backup restore -secret <path>` restores one
version from a backup as a **new** version; see [backup and restore](/docs/features/backup-restore).

## Limits and status

- Available: everything on this page.
- Not available yet: an audit query endpoint (the web UI takes the last access from the `SecretAccess`
  stream); the web UI does not show whether a secret is a replica.
- Secrets are region-local unless marked `Replicate` in the authoritative region.

## Design

[Secret storage plan – The built-in store](/docs/design/secrets-plan#the-built-in-store),
[Permissions](/docs/design/secrets-plan#permissions), [Audit](/docs/design/secrets-plan#audit) and
[Rotation](/docs/design/secrets-plan#rotation-and-dynamic-secrets) and
[Multi-region operation](/docs/design/secrets-plan#multi-region-operation).
