---
title: "Backup and restore operations"
linkTitle: "Backup and restore"
description: "Runbook for the scheduled backups: the store or shared directory, the age keys, the schedule, restore tests and disaster recovery."
weight: 1
---

This runbook sets up the scheduled backups of a region and walks through the
restores. The concepts are on the [Backup and restore](/docs/features/backup-restore)
feature page, every key in the [`backup` block](/docs/configuration/backup)
reference, and every command under
[`norca operator backup`](/docs/commands/operator/backup).

## Plan

- **Where the backups go.** Keep them outside the cluster they protect: in
  another region, another cloud, or an external S3 store. A store running in
  the same cluster (as in the [single node example](/docs/getting-started/examples/02-single-node))
  is fine for a lab, not for disaster recovery. A second
  [`destination`](/docs/configuration/backup#destination-parameters) in
  another cloud gives a copy that survives the loss of a whole cloud.
- **A store or a directory.** A destination is an S3-compatible store or a
  directory of the servers. A directory must be the same storage on every
  server of the region, because the leader writes the backups and the leader
  changes: see [Use a shared directory](#use-a-shared-directory). A region with
  a single server can use a local disk.
- **Who holds the keys.** Backups are encrypted with age public keys; the
  private keys (identities) are needed to browse and restore. Decide who keeps
  them, offline, and how they are reached in a disaster.
- **How often.** The schedule bounds the data lost in a full restore. Each
  region backs up on its own schedule; `jitter` spreads regions that share a
  store.
- **Who restores.** A full restore needs two administrators with different
  management tokens.

## Set up the store

Any S3-compatible store works. The `rustfs` pack of the
[Norca pack registry](/docs/features/packages/registry) runs
[RustFS](https://rustfs.com) (Apache-2.0) as a Norca job, with its root
credentials in the built-in secret store and its data on a host volume.

{{% steps %}}

### Prepare the host volume

On every node that runs a RustFS server:

```hcl
client {
  host_volume "rustfs" {
    path      = "/srv/rustfs"
    read_only = false
  }
}
```

```shell
sudo install -d -o 10001 -g 10001 -m 750 /srv/rustfs   # the container user owns the drive
```

### Store the root credentials

```shell
norca secret put rustfs/root access_key=norca-backup secret_key=-   # type the secret key, then Ctrl-D
```

### Deploy RustFS with the backup bucket

```shell
norca pack registry add norca https://github.com/bacanoo-io/norca-registry --ref=v0.1.0
norca pack run rustfs --registry=norca --name=rustfs --var='buckets=["norca-backup"]'
norca service info -verbose rustfs
norca alloc logs -task create-buckets <alloc ID>     # "bucket norca-backup created"
```

Norca never creates the backup bucket; `buckets` makes the pack create it
once the store is ready. With another store, create the bucket there. For
RustFS on several nodes (`mode = "distributed"`) and the other variables, see
the [rustfs pack README](https://github.com/bacanoo-io/norca-registry/blob/main/packs/rustfs/README.md).

### Give the servers the credentials

An AWS shared credentials file on every server, readable only by the user of
the agent:

```ini {filename="/etc/norca.d/backup-credentials"}
[default]
aws_access_key_id     = norca-backup
aws_secret_access_key = <secret key>
```

```shell
sudo install -m 600 backup-credentials /etc/norca.d/backup-credentials
```

On AWS, leave the credentials out and give the servers an instance profile
instead; the servers then read their credentials from the environment.

{{% /steps %}}

> [!WARNING]
> The rustfs pack serves plain HTTP. The backups are encrypted before they
> leave the servers, and S3 requests are signed, but keep the store on a
> private network or the VPN.

## Use a shared directory

A [`type = "directory"`](/docs/configuration/backup#destination-parameters)
destination writes the backups into a directory instead of a bucket, in the
same layout. Use it with storage that every server of the region mounts at the
same path, typically an NFS export of a file server:

{{% steps %}}

### Mount the share on every server

```shell
sudo install -d -m 700 /mnt/norca-backup
echo 'files.example.com:/export/norca-backup /mnt/norca-backup nfs4 defaults,_netdev 0 0' | sudo tee -a /etc/fstab
sudo mount /mnt/norca-backup
```

The user of the agent must be able to write it, with the same user ID on
every server (or a squashed ID on the file server). Make the agent start after
the mount (`RequiresMountsFor=/mnt/norca-backup` in a systemd drop-in), so a
server never writes into the empty mount point.

### Add the destination

```hcl {filename="/etc/norca.d/norca.hcl"}
server {
  backup {
    destination "nfs" {
      type = "directory"
      path = "/mnt/norca-backup"
    }
  }
}
```

### Check it from every server

Take a backup, restart the agent of the leader so another server takes over,
and browse the same backup from the new leader:

```shell
norca operator backup save -label note=shared-check
norca operator raft list-peers                        # which server is the leader
sudo systemctl restart norca                          # on the leader
norca operator backup contents -age-identity ~/backup-identity.txt -type namespaces <backup ID>
```

A server that does not see the directory of the previous leader logs
`backup missing on a directory destination` when it becomes the leader, and
the `contents` command fails with an error that names the shared storage
requirement. Fix the mounts; the retention keeps the records of the missing
backups until then (`norca operator backup delete` drops such a record by
hand).

{{% /steps %}}

The directory is in the same site as the servers. For disaster recovery, add
an S3 destination in another site, or copy the folders off the file server,
for example nightly:

```shell
rsync -a --exclude '.*.norca-tmp-*' /mnt/norca-backup/norca/ backup-host:/srv/norca-copy/
```

Only folders with a `manifest.json` are complete backups. There are no
download URLs for a directory: `norca operator backup download` names the file
instead, and the files can be copied directly.

## Create the age keys

```shell
age-keygen -o ~/backup-identity.txt
# Public key: age1...
```

The public key (`age1...`) goes into the configuration of the servers; the
identity file stays offline, for example in a password manager or a vault
outside the cluster. Every backup can be encrypted for several recipients:
give each administrator, or each team, its own key pair, and a separate pair
for a disaster recovery copy.

```hcl
encryption {
  recipients = [
    "age1...ops",
    "age1...security",
  ]
}
```

Rotating a key means adding the new recipient, reloading the servers, and
removing the old one once no backup that is still needed was encrypted only
for it. `norca operator backup inspect` shows the recipients fingerprint of
every backup and destination.

## Configure the schedule

In the `server` block of every server of the region:

```hcl {filename="/etc/norca.d/norca.hcl"}
server {
  backup {
    enabled  = true
    schedule = "0 * * * *" # hourly, cron syntax, UTC

    destination "rustfs" {
      type             = "s3"
      endpoint         = "http://10.0.0.10:9000"
      bucket           = "norca-backup"
      prefix           = "norca/${region}"
      region           = "us-east-1" # s3_region of the rustfs pack
      force_path_style = true
      credentials_file = "/etc/norca.d/backup-credentials"
    }

    encryption {
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
norca config validate /etc/norca.d/
sudo systemctl reload norca          # or restart; the block is applied on SIGHUP
```

`norca config validate` checks the block as the agent does when it starts: a
missing recipient, a placeholder key, `interval` together with `schedule`, or
a part size out of range fails here. The destination itself is only reached
when a backup runs.

Then take a first backup by hand and look at the schedule:

```shell
norca operator backup save -label note=first-backup
norca operator backup list
norca operator backup inspect <backup ID>
```

`list` shows the schedule, the last success, the last error and the next due
time. While the region has no successful scheduled backup yet (manual backups
don't count), the first scheduled backup is due at once; after that, the next
one follows the slot of the last successful one, so a new leader neither
repeats nor skips a slot. A failed scheduled backup is retried after
[`retry_interval`](/docs/configuration/backup#retry_interval).

### Permissions

Give operators a policy with the [`backup` rule](/docs/other-specifications/acl-policy#backup-rules):

```hcl {filename="backup-operator.hcl"}
backup {
  policy = "write"
}
```

```shell
norca acl policy apply -description "Backup operators" backup-operator backup-operator.hcl
```

`read` is enough to list, browse and compare. Selective restores also need the
normal write permissions of the restored objects. Full restores need
management tokens.

### Watch the backups

Alert on the metrics of the leader (see [Monitoring](/docs/operations/monitoring#backups)):

- `nomad.backup.last_success_age_seconds` above twice the interval;
- an increase of `nomad.backup.failures_total` for a destination, or three
  failed backups in a row (the leader also logs an error then);
- backups in the `partial` status in `norca operator backup list`.

The `Backup` topic of the [event stream](/docs/features/event-stream) carries
`BackupCompleted`, `BackupFailed` and the restore events; the
[system bus](/docs/features/system-bus) keeps it in the event stream of the region.

## Test a restore

A backup counts as good only once it was restored. Test regularly:

1. **Browse.** Decrypting proves the identity and the integrity of the
   objects:

   ```shell
   norca operator backup contents -age-identity ~/backup-identity.txt -type jobs <backup ID>
   norca operator backup diff -age-identity ~/backup-identity.txt <backup ID>
   ```

2. **Selective restore with a preview.** `-dry-run` shows what would be
   written, and the current modify indexes for the check-and-set of Variables
   entries and secrets:

   ```shell
   norca operator backup restore -age-identity ~/backup-identity.txt -namespace apps \
     -job test-app -secret test-app/db -dry-run <backup ID>
   ```

3. **Full restore preview.** Shows what a full restore would remove, restore
   or revert, and how many allocations would stop, without requesting it:

   ```shell
   norca operator backup restore -full -dry-run -age-identity ~/backup-identity.txt <backup ID>
   ```

4. **A new cluster from the backup.** Restore the latest backup into a
   temporary single-server cluster with `restore-bootstrap` (see below), then
   check the job count against the manifest (`norca operator backup inspect`
   shows the summary) and read a Variables entry and a secret.

## Restore objects

The everyday restore brings back a deleted or broken object as a new version:

```shell
# An older version of a job; the backups keep versions the cluster no longer has.
norca operator backup contents -age-identity ~/backup-identity.txt \
  -type job-versions -job example <backup ID>
norca operator backup restore -age-identity ~/backup-identity.txt -job example@3 <backup ID>

# A Variables entry that still exists: give its current modify index.
norca operator backup restore -age-identity ~/backup-identity.txt \
  -variable nomad/jobs/example -dry-run <backup ID>
norca operator backup restore -age-identity ~/backup-identity.txt \
  -variable nomad/jobs/example@1234 <backup ID>

# Namespaces and ACL objects (management token).
norca operator backup restore -age-identity ~/backup-identity.txt \
  -restore-namespace apps -acl-policy app-developer <backup ID>
```

The **Backups** page of the web UI offers the same in the restore wizard, and
the job history across the backups.

## Restore a whole region

A full restore returns the region to the time of a backup and loses every
change since. Use it when the state is broken beyond selective repair, for
example after a mass deletion.

{{% steps %}}

### Request the restore

The first administrator previews and requests it, typing the region name:

```shell
norca operator backup restore -full -dry-run -age-identity ~/backup-identity.txt <backup ID>
norca operator backup restore -full -age-identity ~/backup-identity.txt -confirm eu-1 <backup ID>
```

The request waits for [`approval_ttl`](/docs/configuration/backup#approval_ttl)
(one hour by default). Only one request can wait at a time.

### Review and approve

A second administrator, with another management token, reviews the preview
and the warnings (an authoritative region rolls the global ACL objects back in
every region), then approves:

```shell
norca operator backup restores
norca operator backup restores <restore ID>
norca operator backup approve -age-identity ~/backup-identity.txt <restore ID>
```

Or rejects it, which the requester can do too:

```shell
norca operator backup reject -reason "wrong backup" <restore ID>
```

### Check the result

The approval takes a pinned pre-restore backup, adds the keys of the backup on
every server and restores the Raft state; the command waits until it is done.
The clients then stop the allocations that are not in the backup, and the
scheduler places the missing ones.

```shell
norca operator backup restores <restore ID>   # complete, with the pre-restore backup ID
norca job status
```

### Undo, if needed

The pre-restore backup holds the state from just before the restore. Restore
it the same way to undo the full restore.

{{% /steps %}}

## Disaster recovery: build a new cluster

When a region is lost, build it again from a backup in its store, or from a
copy of the folder of a directory destination. This works in another cloud
too, as long as the store or the copy is reachable.

{{% steps %}}

### Start one new server

Use the configuration of the lost region: the same `region`,
`bootstrap_expect = 1`, ACLs as before, and the `backup` block so the new
cluster backs up again. Do not start the other servers yet.

If the region used a seal other than the default (for example `shares`),
initialize and unseal the new server first, so it can store the restored keys;
see [Seal and unseal](/docs/operations/seal-unseal).

### Bootstrap the ACLs

```shell
norca acl bootstrap
export NORCA_TOKEN=<Secret ID of the new bootstrap token>
```

### Restore the backup

On an administrator's machine with the age identity and S3 credentials of the
store (they are never sent to the cluster):

```shell
export AWS_ACCESS_KEY_ID=norca-backup AWS_SECRET_ACCESS_KEY=<secret key>
norca operator backup restore-bootstrap -age-identity ~/backup-identity.txt \
  -endpoint http://10.0.0.10:9000 -s3-region us-east-1 -force-path-style \
  -from s3://norca-backup/norca/eu-1/
```

From a copy of a directory destination on the administrator's machine, give
its folder as a `file://` URL; the S3 options and credentials are not needed:

```shell
norca operator backup restore-bootstrap -age-identity ~/backup-identity.txt \
  -from file:///srv/norca-copy/eu-1/
```

`-from` with the prefix of a destination (the folder with `latest.json`)
restores the latest backup; give the folder of a backup
(`.../2026/10/24/<backup ID>/`) for an older one. The
command checks that the cluster is new (one server, no jobs), that the region
matches and that the backup was not taken by a newer Norca version, downloads
and verifies everything before it touches the cluster, then restores the
keys, the Raft state and the key of the secret store.

### Switch to the tokens of the backup

The ACL tokens of the backup are in effect now; the bootstrap token of the
new cluster no longer exists. Continue with a management token of the backup.
If the command warns that the secret store is wrapped by a seal this region
does not use, enter the old unseal shares with
`norca operator unseal -recover`.

### Join the other servers and the clients

Start the other servers and join them to the first one (`server_join`, or
`norca server join`); they replicate the state and the keys from the first
server. Then start or reconnect the clients; the scheduler places the
allocations of the restored jobs.

{{% /steps %}}

A backup of another region can be restored with `-allow-region-change`, for
example to clone a region; the region references inside the jobs are not
rewritten.

## Inspect a backup offline

The objects of a backup can be downloaded and decrypted outside the cluster,
for example to check a snapshot with the Raft tools:

```shell
curl -o state.snap.age "$(norca operator backup download <backup ID>)"
age --decrypt -i ~/backup-identity.txt -o state.snap state.snap.age
norca operator snapshot inspect state.snap
```

On a directory destination, copy `state.snap.age` from the folder that
`norca operator backup inspect` shows instead.

[`norca operator snapshot restore`](/docs/commands/operator/snapshot/restore)
restores such a snapshot without its keys; Variables, workload identities and
secrets of the backup are then unreadable. Prefer `restore-bootstrap`, which
restores the keys with the state.