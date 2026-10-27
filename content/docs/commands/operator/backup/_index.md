---
title: "Command: operator backup"
linkTitle: "backup"
description: "The operator backup command lists, browses and restores the scheduled backups of a region."
---

The `operator backup` command groups the subcommands for the backups that the
leader of a region takes into S3-compatible stores, as configured in the
server's [`backup` block](/docs/configuration/backup). Backups are encrypted
with age; browsing, comparing and restoring them needs an age identity
(private key) given with `-age-identity`. The identity is sent to the server
for the request only and is never stored. See
[Backup and restore](/docs/features/backup-restore) for the concepts.

## Usage

Usage: `norca operator backup <subcommand> [options] [args]`

Run `norca operator backup <subcommand> -h` for help on that subcommand. The
following subcommands are available:

| Subcommand | Description |
| --- | --- |
| [`save`](/docs/commands/operator/backup/save) | Take a manual backup |
| [`list`](/docs/commands/operator/backup/list) | List the backups of a region |
| [`inspect`](/docs/commands/operator/backup/inspect) | Display the details of a backup |
| [`contents`](/docs/commands/operator/backup/contents) | Browse the content of a backup |
| [`diff`](/docs/commands/operator/backup/diff) | Compare a backup with the current state or another backup |
| [`download`](/docs/commands/operator/backup/download) | Print a short-lived download URL of a backup object |
| [`pin`](/docs/commands/operator/backup/pin) | Pin, unpin or label a backup |
| [`delete`](/docs/commands/operator/backup/delete) | Delete a backup |
| [`restore`](/docs/commands/operator/backup/restore) | Restore objects from a backup, or request a full restore of the region |
| [`restores`](/docs/commands/operator/backup/restores) | List the restores of a region, or show one with its preview |
| [`approve`](/docs/commands/operator/backup/approve) | Approve and run a pending full restore |
| [`reject`](/docs/commands/operator/backup/reject) | Reject a pending full restore |
| [`restore-bootstrap`](/docs/commands/operator/backup/restore-bootstrap) | Build a new cluster from a backup |

## Examples

List the backups and the state of the schedule:

```shell
$ norca operator backup list
```

Take a manual, pinned backup:

```shell
$ norca operator backup save -pin -label note="before upgrade"
```

Browse the jobs of a backup:

```shell
$ norca operator backup contents -age-identity key.txt <id>
```

Compare a backup with the current state:

```shell
$ norca operator backup diff -age-identity key.txt <id>
```

Restore version 3 of a deleted job and a Variables entry:

```shell
$ norca operator backup restore -age-identity key.txt \
    -job example@3 -variable nomad/jobs/example <id>
```

Request a full restore of the region, which a second administrator approves
(with another management token) to run it:

```shell
$ norca operator backup restore -full -age-identity key.txt -confirm <region> <id>
$ norca operator backup restores <restore_id>
$ norca operator backup approve -age-identity key.txt <restore_id>
```

Build a new cluster from a backup, on its first new server:

```shell
$ norca operator backup restore-bootstrap -age-identity key.txt \
    -from s3://<bucket>/<prefix>/<yyyy>/<mm>/<dd>/<id>/
```
