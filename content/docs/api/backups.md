---
title: "Backups HTTP API"
linkTitle: "Backups"
description: "The /operator/backup endpoints list, browse and restore the scheduled backups of a region."
---

The `/operator/backups` and `/operator/backup` endpoints list, take, browse
and restore the backups of a region, as configured in the server's
[`backup` block](/docs/configuration/backup). See
[Backup and restore](/docs/features/backup-restore) for the concepts and
[`norca operator backup`](/docs/commands/operator/backup) for the CLI.

Every endpoint accepts the `region` query parameter and is forwarded to the
servers of that region. Endpoints that decrypt a backup (contents, diff,
restore, approve) take the age identity of the administrators in the request
body (`AgeIdentity`); the GET form of contents and diff takes it in the
`X-Norca-Age-Identity` header, with several identities separated by commas.
The identity is used for the request only and is never stored or logged.

## List Backups

This endpoint lists the backups of the region, newest first, and the state of
the schedule.

| Method | Path                  | Produces           |
| ------ | --------------------- | ------------------ |
| `GET`  | `/v1/operator/backups` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required  |
| ---------------- | ------------- |
| `YES`            | `backup:read` |

### Sample Request

```shell
$ curl \
    --header "X-Nomad-Token: $NORCA_TOKEN" \
    https://localhost:4646/v1/operator/backups
```

### Sample Response

```json
{
  "Backups": [
    {
      "ID": "20261024T140000Z-1834567",
      "Region": "eu-1",
      "AuthoritativeRegion": "eu-1",
      "Trigger": "schedule",
      "Status": "complete",
      "StatusDescription": "",
      "StartedAt": "2026-10-24T14:00:00Z",
      "CompletedAt": "2026-10-24T14:00:03Z",
      "NorcaVersion": "0.1.0",
      "NomadVersion": "1.6.5",
      "RaftIndex": 1834567,
      "RaftTerm": 42,
      "Path": "2026/10/24/20261024T140000Z-1834567",
      "Destinations": [
        {
          "Name": "rustfs",
          "Status": "verified",
          "Location": "s3://norca-backup/norca/eu-1/2026/10/24/20261024T140000Z-1834567/",
          "EncryptionMode": "age"
        }
      ],
      "Summary": { "jobs": 214, "namespaces": 6, "variables": 87 },
      "Labels": null,
      "Pinned": false
    }
  ],
  "Schedule": {
    "Enabled": true,
    "Schedule": "0 * * * *",
    "Destinations": ["rustfs"]
  }
}
```

The sample is shortened: a backup record also carries `LeaderID`, `KeyIDs`
(the root keys in its keyring) and `Seals`, and every destination
`RecipientsFingerprint`, `Duration`, `Error` and `Objects` (`state`,
`keyring`, `secret_store_key`, each with `Key`, `Size` and `SHA256`). The
schedule also carries `Interval`, `LastSuccess`, `LastSuccessID`,
`LastAttempt`, `LastError`, `NextDue` and `Overdue` (the last successful
backup is older than two intervals).

## Take a Backup

This endpoint takes a manual backup on the leader, into every destination. By
default the request returns when the backup is uploaded and verified.

| Method | Path                  | Produces           |
| ------ | --------------------- | ------------------ |
| `POST` | `/v1/operator/backups` | `application/json` |

| Blocking Queries | ACL Required   |
| ---------------- | -------------- |
| `NO`             | `backup:write` |

### Parameters

- `Labels` `(map[string]string: nil)` - Labels of the backup.

- `Pin` `(bool: false)` - Pins the backup, so the retention never deletes it.

- `Detach` `(bool: false)` - Returns as soon as the snapshot is taken, with the
  ID of the backup and without the backup record.

### Sample Payload

```json
{
  "Labels": { "note": "before upgrade" },
  "Pin": true
}
```

### Sample Request

```shell
$ curl \
    --header "X-Nomad-Token: $NORCA_TOKEN" \
    --request POST \
    --data @payload.json \
    https://localhost:4646/v1/operator/backups
```

The response has the fields `ID` and `Backup` (the backup record, `null` for a
detached request).

## Read a Backup

| Method | Path                       | Produces           |
| ------ | -------------------------- | ------------------ |
| `GET`  | `/v1/operator/backup/:id`  | `application/json` |

| Blocking Queries | ACL Required  |
| ---------------- | ------------- |
| `YES`            | `backup:read` |

The response is a backup record as in the list.

## Pin, Unpin or Label a Backup

| Method | Path                       | Produces           |
| ------ | -------------------------- | ------------------ |
| `POST` | `/v1/operator/backup/:id`  | `application/json` |

| Blocking Queries | ACL Required   |
| ---------------- | -------------- |
| `NO`             | `backup:write` |

### Parameters

- `Pinned` `(bool: <optional>)` - Pins or unpins the backup. Left out, the
  pinning is not changed.

- `Labels` `(map[string]string: nil)` - Replaces the labels of the backup when
  set.

- `RemoveLabels` `(array<string>: nil)` - Removes single labels.

The change is also written to the manifest of the backup on its destinations.
The response is the updated backup record.

## Delete a Backup

This endpoint deletes a backup from the destinations that allow pruning, and
its record. Pinned backups and the newest backups kept by `min_keep` can't be
deleted.

| Method   | Path                       | Produces           |
| -------- | -------------------------- | ------------------ |
| `DELETE` | `/v1/operator/backup/:id`  | `application/json` |

| Blocking Queries | ACL Required   |
| ---------------- | -------------- |
| `NO`             | `backup:write` |

## Browse a Backup

This endpoint downloads a backup, decrypts it and loads it into a separate
in-memory state, then returns one type of its content. The running cluster is
not touched. Variables are returned with their key names only; secrets with
their paths, metadata and value hashes.

| Method | Path                                | Produces           |
| ------ | ----------------------------------- | ------------------ |
| `GET`  | `/v1/operator/backup/:id/contents`  | `application/json` |
| `POST` | `/v1/operator/backup/:id/contents`  | `application/json` |

| Blocking Queries | ACL Required  |
| ---------------- | ------------- |
| `NO`             | `backup:read` |

### Parameters

- `type` `(string: "jobs")` - The content type, as a query parameter:
  `namespaces`, `jobs`, `job-versions`, `variables`, `secrets`,
  `acl-policies`, `acl-roles`, `deployments` or `allocations`.
  `job-versions` requires `job`.

- `namespace` `(string: "")` - The namespace, as a query parameter; `*` for all
  namespaces. Objects in namespaces the token can't read are hidden.

- `job` `(string: "")` - Restricts job versions, deployments and allocations to
  a job.

- `prefix` `(string: "")` - Restricts Variables to a path prefix, and other
  objects to an ID prefix.

- `destination` `(string: "")` - The destination to read from; empty picks the
  first one the backup was verified on.

- `AgeIdentity` `(string: <required>)` - The age identity, in the JSON body of
  a POST request, or in the `X-Norca-Age-Identity` header of a GET request.

### Sample Request

```shell
$ curl \
    --header "X-Nomad-Token: $NORCA_TOKEN" \
    --request POST \
    --data "$(jq -n --rawfile id backup-identity.txt '{AgeIdentity: $id}')" \
    "https://localhost:4646/v1/operator/backup/20261024T140000Z-1834567/contents?type=jobs&namespace=*"
```

## Compare a Backup

This endpoint compares a backup with the current state of the region or with
another backup. Objects are reported as added (only on the right side),
deleted (only in the backup) or modified.

| Method | Path                            | Produces           |
| ------ | ------------------------------- | ------------------ |
| `GET`  | `/v1/operator/backup/:id/diff`  | `application/json` |
| `POST` | `/v1/operator/backup/:id/diff`  | `application/json` |

| Blocking Queries | ACL Required  |
| ---------------- | ------------- |
| `NO`             | `backup:read` |

### Parameters

- `against` `(string: "current")` - `current`, or the ID of another backup.

- `type` `(string: "")` - Restricts the comparison to one content type.

- `job` `(string: "")` - Restricts the comparison to a job, and adds the job
  diff of the two sides.

- `destination` `(string: "")` - The destination to read the backups from.

- `AgeIdentity` `(string: <required>)` - As for browsing.

## Restore from a Backup

This endpoint restores selected objects from a backup (selective restore), or
previews and requests a full restore of the region.

| Method | Path                               | Produces           |
| ------ | ---------------------------------- | ------------------ |
| `POST` | `/v1/operator/backup/:id/restore`  | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `backup:read` and the permissions of the normal writes (selective); `management` with ACLs enabled (full) |

### Parameters

- `Mode` `(string: "selective")` - `selective` or `full`.

- `Items` `(array<Item>: nil)` - The objects of a selective restore. A full
  restore takes no items. Each item has:

  - `Type` `(string: <required>)` - `job`, `variable`, `secret`, `namespace`,
    `acl-policy` or `acl-role`.
  - `Namespace` `(string: "")` - The namespace of a job, Variables entry or
    secret.
  - `ID` `(string: <required>)` - The job ID, Variables path, secret path,
    namespace name, ACL policy name or ACL role name.
  - `Version` `(int: <optional>)` - The version of the job or the secret in the
    backup; left out, the version that was current at backup time.
  - `CheckIndex` `(int: <optional>)` - The check-and-set index of a Variables
    entry (`0`, the default, restores it only if it does not exist) or the
    optional guard of a secret.
  - `WithMetadata` `(bool: false)` - Also restores the metadata of a secret.

- `DryRun` `(bool: false)` - Only returns what would be restored, or the
  preview of a full restore.

- `Confirm` `(string: "")` - The name of the region, required to request a full
  restore.

- `Destination` `(string: "")` - The destination to read the backup from.

- `AgeIdentity` `(string: <required>)` - The age identity.

### Sample Payload

```json
{
  "Items": [
    { "Type": "job", "Namespace": "apps", "ID": "test-app", "Version": 3 },
    { "Type": "variable", "Namespace": "apps", "ID": "nomad/jobs/test-app" }
  ],
  "AgeIdentity": "AGE-SECRET-KEY-1..."
}
```

The response has the fields `Restore` (the restore record, `null` for a dry
run), `Results` (one per item) and `Preview` (the effect of a full restore).

## List Restores

| Method | Path                            | Produces           |
| ------ | ------------------------------- | ------------------ |
| `GET`  | `/v1/operator/backup/restores`  | `application/json` |

| Blocking Queries | ACL Required  |
| ---------------- | ------------- |
| `YES`            | `backup:read` |

The response lists the selective and full restores of the region, newest
first.

## Read a Restore

| Method | Path                                         | Produces           |
| ------ | -------------------------------------------- | ------------------ |
| `GET`  | `/v1/operator/backup/restore/:restore_id`    | `application/json` |

| Blocking Queries | ACL Required  |
| ---------------- | ------------- |
| `YES`            | `backup:read` |

The response is the restore record, with the preview of a full restore and who
requested, approved or rejected it.

## Approve a Full Restore

This endpoint approves a pending full restore as the second administrator and
runs it: an automatic, pinned backup of the current state is taken first, the
keys of the backup are added to the keystore of every server, and the Raft
state of the backup is restored. The requester can't approve their own
request.

| Method | Path                                                | Produces           |
| ------ | --------------------------------------------------- | ------------------ |
| `POST` | `/v1/operator/backup/restore/:restore_id/approve`   | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` (another token than the request's) |

### Parameters

- `AgeIdentity` `(string: <required>)` - The age identity of the backup.

## Reject a Full Restore

| Method | Path                                               | Produces           |
| ------ | -------------------------------------------------- | ------------------ |
| `POST` | `/v1/operator/backup/restore/:restore_id/reject`   | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` |

### Parameters

- `Reason` `(string: "")` - The reason, kept in the restore record.

## Download URL of a Backup Object

This endpoint returns a pre-signed URL of an encrypted backup object, valid
for 15 minutes.

| Method | Path                                    | Produces           |
| ------ | --------------------------------------- | ------------------ |
| `GET`  | `/v1/operator/backup/:id/download-url`  | `application/json` |

| Blocking Queries | ACL Required   |
| ---------------- | -------------- |
| `NO`             | `backup:write` |

### Parameters

- `object` `(string: "state")` - `state`, `keyring` or `manifest`.

- `destination` `(string: "")` - The destination; empty picks the first one the
  backup was verified on.

The response has the fields `URL` and `ExpiresAt`.

## Restore Root Keys

This endpoint adds root keys of a backup to the keystore of every server of
the region, next to the existing keys; no key is removed or replaced. It is
used before the Raft state of a backup is restored, for example by
[`operator backup restore-bootstrap`](/docs/commands/operator/backup/restore-bootstrap),
so the Variables and workload identities of the backup stay readable.

| Method | Path                           | Produces           |
| ------ | ------------------------------ | ------------------ |
| `PUT`  | `/v1/operator/keyring/restore` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` |

### Parameters

- `Keys` `(array<RootKey>: <required>)` - The root keys (metadata and key
  material) from the keyring object of a backup, at most 1000.

The response has the fields `Added` (the IDs of the keys the receiving server
did not have), `Servers` (the servers that hold the keys now) and `Errors`
(the servers that failed, by name).
