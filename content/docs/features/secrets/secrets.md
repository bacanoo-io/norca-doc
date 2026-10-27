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
| Metadata | `Description` (at most 1024 bytes), `Owner` (at most 256 bytes), `Labels` (at most 64), `ExpiresAt`, `RotateEvery`, `MaxVersions`. Metadata is never secret: everyone who may list the secret sees it. |
| Value hash | `hmac-sha256:...`, a keyed hash of the items per version, so changes are visible without the value and the value can't be guessed offline. |
| State | A version can be **deleted** (soft; `undelete` restores it) or **destroyed** (permanent). Destroying the whole secret removes all versions and the metadata. |

The values are encrypted by the barrier of the secret store and written to Raft; the metadata row is
in its own table and can be watched with blocking queries. All value reads and writes run on the leader.

`ExpiresAt` and `RotateEvery` are stored and shown; warnings and events for them are not available yet.

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

See [ACL policy specification](/docs/other-specifications/acl-policy#secrets).

### Audit

Every value read (also denied ones) and every write, delete, undelete, destroy and restore is recorded,
never with the value:

- On the **`SecretAccess`** event stream topic (event type `SecretAccessed`). Subscribing requires
  `operator:read`. A record holds the time, region, namespace, path, version or versions, operation
  (`read`, `write`, `delete`, `undelete`, `destroy`, `restore`), result (`ok`, `denied`, `not-found`,
  `conflict`, `unavailable`, `invalid`, `error`), the accessor (token accessor ID, or the workload
  identity: namespace, job, group, task, allocation and node) and the server that executed it.
- Optionally in an **append-only audit file** on each server
  ([`server { secrets { audit_file } }`](/docs/configuration/secrets#server-secrets-block)), with size and
  time based rotation. Records are written by the server that executed the access, which is the leader.

Changes of secrets are also published on the **`Secret`** topic (`SecretUpserted`, `SecretDeleted`) with
metadata and value hash only; it is visible to everyone who may list the secret's path.

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
- Not available yet: expiry and rotation events and warnings, rotation jobs, replication between regions,
  an audit query endpoint (the web UI takes the last access from the `SecretAccess` stream).
- Secrets are region-local.

## Design

[Secret storage plan – The built-in store](/docs/design/secrets-plan#the-built-in-store),
[Permissions](/docs/design/secrets-plan#permissions) and [Audit](/docs/design/secrets-plan#audit).
