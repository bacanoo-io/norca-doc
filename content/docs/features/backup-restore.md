---
title: "Backup and restore"
linkTitle: "Backup and restore"
description: "Scheduled, age-encrypted backups of every region to S3-compatible stores and shared directories, with browsing, selective and full restore, and building a new cluster from a backup."
weight: 45
---

## What and why

The state of a Norca region (jobs and their versions, allocations,
deployments, namespaces, ACL objects, Variables, quotas, admission and network
policies, secrets) lives in the Raft log of its servers. Nomad v1.6.5 can save
a snapshot of it by hand (`operator snapshot save`), but has no scheduled
backup, and a snapshot alone is not enough to rebuild a cluster: the keys that
encrypt Variables and sign workload identities are kept on the disk of every
server, outside Raft.

Norca backs up every region on a schedule, from its leader, into one or more
destinations: S3-compatible stores (AWS S3, or a store with the S3 API such as
RustFS, the `rustfs` pack of the
[Norca pack registry](/docs/features/packages/registry)), and directories of
the servers' filesystem, such as a file server mounted on every server. A
backup holds the Raft snapshot, the keyring and the key of the built-in secret
store. Every object is encrypted with
[age](https://github.com/FiloSottile/age) public keys before it is written;
the private keys stay with the administrators.

Backups can be listed, browsed and compared with the current state, in the CLI
and the [web UI](/docs/features/web-ui). Restores come in three strengths:

- **selective**: single jobs (any version kept in a backup), Variables
  entries, secrets, namespaces, ACL policies and roles, written back with the
  normal API;
- **full region restore**: the whole state of a region returns to the time of
  a backup, after a preview and the approval of a second administrator;
- **new cluster**: an empty server is filled from a backup with
  `restore-bootstrap`, for disaster recovery or a move to another cloud.

## How it works

### Taking a backup

The backup manager runs on the leader of each region and starts and stops with
leadership, so exactly one server backs up a region at a time. The records of
the backups are kept in Raft, so a new leader continues the schedule without
repeating or skipping a slot.

```mermaid
flowchart LR
  subgraph region["Region"]
    L["Leader server<br/>backup manager"]
    RAFT[("Raft state")]
    KS[("Keyring")]
  end
  L -- "1: snapshot" --> RAFT
  L -- "2: root keys,<br/>secret store key" --> KS
  L -- "3: encrypt for the<br/>age recipients" --> ENC["age"]
  ENC -- "4: multipart upload,<br/>verify, manifest" --> S3A[("S3 store<br/>same cloud")]
  ENC -- "4: multipart upload,<br/>verify, manifest" --> S3B[("S3-compatible store<br/>other cloud")]
  ENC -- "4: write, sync, rename,<br/>verify, manifest" --> DIR[("Shared directory<br/>NFS, SMB")]
  L -- "5: backup record" --> RAFT
```

1. The leader takes a Raft snapshot, in the format of
   [`operator snapshot save`](/docs/commands/operator/snapshot/save).
2. With [`include_keyring`](/docs/configuration/backup#include_keyring) (the
   default) it adds the root keys of the keyring and the key of the built-in
   secret store.
3. Each object is streamed through age encryption for the
   [`recipients`](/docs/configuration/backup#encryption-parameters) of the
   destination. The servers only know the public keys.
4. The objects are uploaded to every destination in parallel, with multipart
   uploads to a store and crash-safe writes to a directory (a temporary file,
   synced and renamed), so the memory used does not depend on the size of the
   snapshot. Each object is verified (its size, and with `verify_checksum` its
   SHA-256), then the manifest is written last: without a manifest, an object
   set is not a backup.
5. The record of the backup (ID, Raft index, destinations, object counts) is
   written to Raft, and the retention deletes expired backups.

A backup is `complete` when it was verified on every destination, `partial`
when on at least one, and `failed` otherwise. All servers of the region must
run a Norca version that supports backups.

### Directory destinations and leader changes

A [`type = "directory"`](/docs/configuration/backup#destination-parameters)
destination writes the same files, in the same layout, below a directory of
the server. Because the leader writes the backups and the leader changes, the
directory must be **the same storage on every server of the region**: a file
server (NFS, SMB) or a cluster filesystem mounted at the same path everywhere.
A region with a single server can use a local disk. With a separate local
directory on each server, a new leader neither sees nor prunes the backups of
the previous one. Norca detects this: the new leader logs a warning when the
newest backup recorded on the destination is missing, browsing and restoring
such a backup fail with an error that names the requirement, and the retention
keeps the record instead of dropping it silently.

A directory is fast to restore from, but it is in the same site as the
servers: combine it with an S3 store in another site, or copy the folders off
the file server, for disaster recovery. Directories have no pre-signed
download URLs; administrators copy the files directly.

### Storage format

Every destination holds the backups of a region under its prefix
(`norca/${region}` by default; below `path` for a directory), one folder per
backup:

```plaintext
norca/eu-1/
  2026/10/24/
    20261024T140000Z-1834567/      backup ID: start time (UTC) and Raft index
      manifest.json                unencrypted description, counts only
      state.snap.age               Raft snapshot, age-encrypted
      keyring.age                  root keys, age-encrypted
      secret-store-key.age         key of the built-in secret store, age-encrypted
      consul-kv.json.age           Consul KV bucket of the system bus, age-encrypted
  latest.json                      pointer to the newest backup
```

The manifest records the region, the Norca and compatibility versions, the
Raft index and term, the leader, the size and SHA-256 checksum of every
object, the encryption mode and a fingerprint of the recipients, object counts
(jobs, namespaces, Variables, ...), labels and pinning. It holds no names and
no content, so backups can be listed without decrypting them, and a store that
lost its Raft records can still be read.

### Retention and pinning

The [`retention`](/docs/configuration/backup#retention-parameters) block keeps
the newest backup of each of the last 24 hours, 14 days, 8 weeks and 12 months
by default, and never fewer than `min_keep` backups. A pinned backup is never
deleted; backups can be pinned and labeled when they are taken or later. The
automatic backup taken before a full restore is always pinned. Each leader
deletes only within the prefix of its own region, and only on destinations
with [`prune`](/docs/configuration/backup#prune) enabled, so a destination the
servers may only write to can expire its objects with lifecycle rules instead.

### Browsing and selective restore

To browse, compare or restore, an administrator sends an age identity with the
request. The server downloads the backup, decrypts it, and loads it into a
separate in-memory state; the running cluster is not touched. The loaded
backup stays in memory for
[`browse_cache_ttl`](/docs/configuration/backup#browse_cache_ttl). The identity
is used for the request only and never stored. Variables are shown with their
key names, and secrets with their metadata, never their values.

A selective restore writes every item with the normal API on behalf of the
caller's token:

| Item | How it is restored |
| --- | --- |
| Job | Registered as a new version, through the admission chain and the quotas. Any version kept in the backup can be chosen, so the backups extend the job's version history. |
| Variables entry | Re-encrypted with the current keys, with a check-and-set write: an existing entry is only overwritten with its current modify index. |
| Secret | The items of one version in the backup are written as a new version of the secret; its history stays. |
| Namespace, ACL policy, ACL role | Upserted. |

### Full region restore

```mermaid
sequenceDiagram
  participant A as Administrator 1
  participant B as Administrator 2
  participant L as Leader
  participant S as Destination
  A->>L: restore -full -dry-run
  L->>S: download, decrypt, compare
  L-->>A: preview
  A->>L: restore -full -confirm eu-1
  L-->>A: pending request (approval_ttl)
  B->>L: approve (restore ID)
  L->>S: automatic pinned pre-restore backup
  L->>L: add the backup's keys on every server
  L->>L: restore the Raft state
  L-->>B: complete
```

A full restore returns the whole state of a region to the time of a backup.
Every change since is lost, and the clients stop the allocations that are not
in the backup. It is guarded:

- **Preview.** The request is computed against the current state first: which
  objects would be removed, restored or reverted.
- **Confirmation.** The request must name the region (`-confirm <region>`).
- **Two-person approval.** A second administrator, with another management
  token, approves the request; the requester can't. ACLs must be enabled.
  Only one request can wait at a time, and it expires after
  [`approval_ttl`](/docs/configuration/backup#approval_ttl).
- **Undo.** Before anything changes, an automatic, pinned backup of the
  current state is taken. If it fails, nothing is restored.
- **Keys.** The root keys of the backup are added to the keystore of every
  server, next to the existing keys, before the Raft state is restored.
- **Consul KV.** The Consul KV bucket of the [system bus](/docs/features/system-bus)
  is not part of the Raft state: after the state, the bucket gets the keys of
  the backup, and keys added since are removed.

Restoring the authoritative region rolls the global ACL policies and tokens
back in every region; the preview warns about it. After a restore of another
region, ACL replication brings the global objects back to the state of the
authoritative region.

### Building a new cluster from a backup

[`operator backup restore-bootstrap`](/docs/commands/operator/backup/restore-bootstrap)
runs on an administrator's machine against the first server of a new cluster.
It reads the backup from the store with the administrator's S3 credentials,
or from a folder copied from a directory destination, decrypts it locally, restores the root keys, then the Raft state, and re-wraps
the key of the secret store with the seal of the new server. The other new
servers then join and replicate state and keys from the first one.

```mermaid
flowchart TB
  B[("Encrypted backup<br/>in a store or directory")]
  B --> SEL["Selective restore<br/>jobs, Variables, secrets,<br/>namespaces, ACL objects"]
  B --> FULL["Full region restore<br/>preview, confirm,<br/>second approval"]
  B --> BOOT["restore-bootstrap<br/>new cluster"]
  SEL -- "normal API writes,<br/>new versions" --> R1["Running region"]
  FULL -- "pre-restore backup,<br/>keyring restore,<br/>Raft restore" --> R1
  BOOT -- "keyring restore,<br/>Raft restore,<br/>secret store re-wrap" --> R2["New first server"]
```

A backup can only be restored into its own region (`-allow-region-change`
overrides this for `restore-bootstrap`; the region references of the jobs are
not rewritten), and never by a Norca version older than the one that took it.

### Web UI

The **Backups** page of the [web UI](/docs/features/web-ui) shows, per region:

- the list of backups with the state of the schedule, and **Back up now** with
  labels and pinning;
- the details of a backup, its contents by type, and the comparison with the
  current state or another backup, with the job diff;
- the **job history**: the versions, deployments and allocations of a job
  across the latest backups, with restore and compare actions;
- the **restore wizard** for selective and full restores, and the page of a
  full restore request with its preview, approval and rejection.

The age identity is entered on the page and kept in the memory of the browser
tab only.

## Example

A region backs up hourly into a directory on a file server, mounted at the
same path on every server, and into a RustFS store in another site:

```hcl {filename="norca.hcl"}
server {
  backup {
    enabled  = true
    schedule = "0 * * * *" # hourly, cron syntax, UTC

    destination "nfs" {
      type = "directory"
      path = "/mnt/norca-backup" # the same NFS export on every server
    }

    destination "rustfs" {
      type             = "s3"
      endpoint         = "https://rustfs.other-site.example.com"
      bucket           = "norca-backup"
      region           = "us-east-1"
      force_path_style = true
      credentials_file = "/etc/norca.d/backup-credentials"
    }

    encryption {
      # The public key printed by: age-keygen -o backup-identity.txt
      recipients = ["age1..."]
    }
  }
}
```

The [single node example](/docs/getting-started/examples/02-single-node)
backs up hourly into a RustFS store deployed with the `rustfs` pack:

```hcl {filename="norca.hcl"}
server {
  backup {
    enabled  = true
    schedule = "0 * * * *" # hourly, cron syntax, UTC

    destination "rustfs" {
      type             = "s3"
      endpoint         = "http://10.0.0.10:9000"
      bucket           = "norca-backup"
      prefix           = "norca/${region}"
      region           = "us-east-1"
      force_path_style = true
      credentials_file = "/etc/norca.d/backup-credentials"
    }

    encryption {
      # The public key printed by: age-keygen -o backup-identity.txt
      recipients = ["age1..."]
    }

    retention {
      keep_hourly  = 24
      keep_daily   = 7
      keep_weekly  = 4
      keep_monthly = 3
    }
  }
}
```

```shell
norca operator backup save -label note=first-backup
norca operator backup list
norca operator backup contents -age-identity ~/backup-identity.txt -type jobs <backup ID>

# Selective restore: preview, then restore the job and the secret as new versions.
norca operator backup restore -age-identity ~/backup-identity.txt -namespace apps \
  -job test-app -secret test-app/db -dry-run <backup ID>
norca operator backup restore -age-identity ~/backup-identity.txt -namespace apps \
  -job test-app -secret test-app/db <backup ID>
```

The [runbook](/docs/operations/backup-restore) covers the store, the keys,
restore tests and disaster recovery.

## Configuration reference

The [`backup` block](/docs/configuration/backup) of the server configuration:

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | bool | `false` | Scheduled backups on the leader |
| `interval` / `schedule` | duration / cron | `"1h"` / `""` | Scheduled times; mutually exclusive |
| `jitter` | duration | `"5m"` | Per-region offset of the scheduled times |
| `timeout` | duration | `"1h"` | Maximum duration of a backup |
| `retry_interval` | duration | `"10m"` | Wait after a failed scheduled backup |
| `part_size`, `upload_concurrency` | size, int | `"16MiB"`, `4` | Multipart upload |
| `include_keyring` | bool | `true` | Back up the keyring and the secret store key |
| `verify_checksum` | bool | `false` | Download and compare SHA-256 after upload |
| `browse_cache_ttl` | duration | `"5m"` | How long a decrypted backup stays loaded |
| `require_approval` | bool | `true` | Two-person approval of full restores; can't be disabled |
| `approval_ttl` | duration | `"1h"` | How long a full restore request waits |
| `destination "<name>"` | block | | `type = "s3"`: `endpoint`, `bucket`, `prefix`, `region`, `force_path_style`, credentials, `ca_file`, `sse`, `kms_key`, `encryption`, `prune`; `type = "directory"`: `path`, `prefix`, `encryption`, `prune` |
| `encryption` | block | | `recipients` (age public keys) |
| `retention` | block | | `keep_hourly` 24, `keep_daily` 14, `keep_weekly` 8, `keep_monthly` 12, `min_keep` 3, `keep_failed` 10 |

The [`backup` ACL rule](/docs/other-specifications/acl-policy#backup-rules)
grants `read` (list, inspect, browse, compare, selective restore together with
the normal write permissions) and `write` (manual backup, pin, label, delete,
download URL). Full restores need management tokens.

## CLI and API

| Operation | CLI | HTTP |
| --- | --- | --- |
| List backups and the schedule | [`operator backup list`](/docs/commands/operator/backup/list) | `GET /v1/operator/backups` |
| Take a manual backup | [`operator backup save`](/docs/commands/operator/backup/save) | `POST /v1/operator/backups` |
| Details | [`operator backup inspect`](/docs/commands/operator/backup/inspect) | `GET /v1/operator/backup/:id` |
| Browse | [`operator backup contents`](/docs/commands/operator/backup/contents) | `GET`/`POST /v1/operator/backup/:id/contents` |
| Compare | [`operator backup diff`](/docs/commands/operator/backup/diff) | `GET`/`POST /v1/operator/backup/:id/diff` |
| Download URL | [`operator backup download`](/docs/commands/operator/backup/download) | `GET /v1/operator/backup/:id/download-url` |
| Pin, unpin, label | [`operator backup pin`](/docs/commands/operator/backup/pin) | `POST /v1/operator/backup/:id` |
| Delete | [`operator backup delete`](/docs/commands/operator/backup/delete) | `DELETE /v1/operator/backup/:id` |
| Selective or full restore | [`operator backup restore`](/docs/commands/operator/backup/restore) | `POST /v1/operator/backup/:id/restore` |
| Restore records | [`operator backup restores`](/docs/commands/operator/backup/restores) | `GET /v1/operator/backup/restores`, `GET /v1/operator/backup/restore/:restore_id` |
| Approve, reject a full restore | [`approve`](/docs/commands/operator/backup/approve), [`reject`](/docs/commands/operator/backup/reject) | `POST /v1/operator/backup/restore/:restore_id/approve`, `.../reject` |
| Keyring restore | used by `restore-bootstrap` and full restores | `PUT /v1/operator/keyring/restore` |
| New cluster from a backup | [`operator backup restore-bootstrap`](/docs/commands/operator/backup/restore-bootstrap) | – |

See the [Backups HTTP API](/docs/api/backups) for the parameters.

### Events and metrics

The event stream has a `Backup` topic (events `BackupCompleted`,
`BackupFailed`, `BackupUpdated`, `BackupDeleted`, `BackupRestoreRequested`,
`BackupRestoreApproved`, `BackupRestoreRejected`, `BackupRestoreStarted`,
`BackupRestoreFinished`), readable with the `backup` read permission; see
[Event stream](/docs/features/event-stream). The leader reports the metrics
`nomad.backup.last_success_age_seconds`, `nomad.backup.size_bytes`,
`nomad.backup.duration_seconds` and `nomad.backup.failures_total` (labeled by
destination); see [Monitoring](/docs/operations/monitoring#backups).

## Limits and status

- Available: scheduled backups, manual backups, browsing and comparison,
  selective restore, full region restore with two-person approval, keyring
  restore, `restore-bootstrap`, and the web UI pages.
- The destination types are `"s3"` and `"directory"`; Azure Blob Storage and
  other stores without the S3 API need an S3-compatible gateway or a mounted
  share.
- A directory destination must be shared storage mounted at the same path on
  every server of the region (or the region has a single server); Norca does
  not replicate it between servers. It has no download URLs.
- `age` is the only encryption mode. The `kms` mode of the design (envelope
  encryption with a cloud KMS, so the servers could decrypt for browsing
  without an administrator) is reserved and rejected by the configuration.
- Backups capture one region: restoring several regions gives no common point
  in time across the federation.
- Server configuration, the local state of clients, allocation directories,
  CSI volume contents and the state of Consul or Vault are not backed up.
- Norca never creates the bucket. It creates the directory of a directory
  destination, but not the mount behind it.

## Design

[S3-based scheduled backup and restore – plan](/docs/design/backup-restore-plan).
