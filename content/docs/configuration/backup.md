---
title: "backup Block"
linkTitle: "backup"
description: "The \"backup\" block configures the scheduled, encrypted backups of a region's state and keyring into S3-compatible stores."
---

**Placement:** `server -> backup`

The `backup` block configures the scheduled backups that the leader of a
region takes of the Raft state and the keyring into one or more
S3-compatible stores (AWS S3, RustFS, MinIO and other stores with the S3
API). Every object is encrypted with [age](https://github.com/FiloSottile/age)
public keys before it leaves the server. See
[Backup and restore](/docs/features/backup-restore) for the concepts and
[Backup and restore operations](/docs/operations/backup-restore) for a
runbook.

```hcl
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

The block is read on every server, but only the leader takes scheduled
backups. Manual backups, browsing and restores need a `destination` and the
`encryption` block, not `enabled`. The block is applied again on a
configuration reload (`SIGHUP`), and `norca config validate` checks it as the
agent does when it starts.

## `backup` Parameters

- `enabled` `(bool: false)` - Starts the scheduled backups on the leader. At
  least one `destination` is required when it is `true`.

- `interval` `(string: "1h")` - The time between two scheduled backups, as a
  duration of at least `1m`. The scheduled times are aligned to the Unix epoch
  and shifted by the region's `jitter` offset. Mutually exclusive with
  `schedule`.

- `schedule` `(string: "")` - A cron expression, evaluated in UTC, for the
  scheduled times, for example `"0 */6 * * *"`. Mutually exclusive with
  `interval`.

- `jitter` `(string: "5m")` - The upper bound of a per-region offset of the
  scheduled times. The offset is derived from the region name, so a region
  always backs up at the same minutes and regions that share a store don't
  upload at the same time. `"0s"` turns the offset off.

- `timeout` `(string: "1h")` - The maximum duration of a whole backup run.

- `retry_interval` `(string: "10m")` - The wait after a failed scheduled
  backup before it is tried again.

- `part_size` `(string: "16MiB")` - The part size of the multipart upload,
  between `5MiB` and `5GiB`. The default allows objects of up to 160 GB.

- `upload_concurrency` `(int: 4)` - The number of parts buffered and uploaded
  in parallel, between 1 and 64. The memory used by an upload is
  `part_size` times `upload_concurrency`.

- `include_keyring` `(bool: true)` - Adds the keyring (the root keys of
  Variables and workload identities) and the key of the built-in secret store
  to every backup. Without them the Variables and secrets of a restored
  backup can't be decrypted in a new cluster.

- `verify_checksum` `(bool: false)` - Downloads every uploaded object again
  and compares its SHA-256 checksum. Without it only the size of the uploaded
  object is verified.

- `browse_cache_ttl` `(string: "5m")` - How long a backup that was downloaded
  and decrypted for browsing stays loaded in the memory of the server. `"0s"`
  disables the cache.

- `require_approval` `(bool: true)` - Requires a second administrator to
  approve every full restore. Two-person approval is mandatory, so this value
  can't be set to `false`.

- `approval_ttl` `(string: "1h")` - How long a full restore request waits for
  its approval, between `1m` and `168h`.

- `destination` <code>([Destination](#destination-parameters))</code> - An
  S3-compatible store, labeled with its name. Can be repeated: every backup is
  uploaded to all destinations in parallel, and one failing destination does
  not stop the others.

- `encryption` <code>([Encryption](#encryption-parameters))</code> - The
  client-side encryption of the backups. Required as soon as a destination is
  configured.

- `retention` <code>([Retention](#retention-parameters))</code> - Which
  backups the leader keeps.

### `destination` Parameters

```hcl
destination "aws" {
  bucket = "company-norca-backup"
  region = "eu-central-1"
  sse    = "aws:kms"
}
```

- `type` `(string: "s3")` - The type of the store. `"s3"` is the only
  type; it covers AWS S3 and S3-compatible stores.

- `endpoint` `(string: "")` - The address of the store, as `host[:port]` or a
  URL. An `http://` URL disables TLS. Empty means AWS S3.

- `bucket` `(string: <required>)` - The bucket. Norca never creates it.

- `prefix` `(string: "norca/${region}")` - The object prefix of the
  backups. `${region}` is the only interpolation; it keeps the backups of
  regions that share a bucket apart.

- `region` `(string: "")` - The region of the bucket. S3-compatible stores
  usually expect the region they are configured with, for example
  `"us-east-1"`.

- `force_path_style` `(bool: false)` - Uses path-style bucket addressing
  (`https://host/bucket/key`), which most S3-compatible stores need.

- `access_key`, `secret_key` `(string: "")` - Static credentials. They must be
  set together and can't be combined with `credentials_file`. The secret key
  is redacted in the output of the agent self endpoint.

- `session_token` `(string: "")` - The session token of temporary static
  credentials.

- `credentials_file` `(string: "")` - An AWS shared credentials file, for
  example:

  ```ini
  [default]
  aws_access_key_id     = norca-backup
  aws_secret_access_key = <secret key>
  ```

- `profile` `(string: "")` - The profile of the shared credentials file.

  Without static keys and without `credentials_file`, the credentials come
  from the environment of the agent (`AWS_ACCESS_KEY_ID` and
  `AWS_SECRET_ACCESS_KEY`, or `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY`), the
  default shared credentials file, and the instance profile of the machine.

- `ca_file` `(string: "")` - A PEM bundle of CAs to trust for the endpoint.

- `sse` `(string: "")` - Server-side encryption of the store: `""`,
  `"AES256"` or `"aws:kms"`. It is applied in addition to the client-side
  encryption.

- `kms_key` `(string: "")` - The KMS key of `sse = "aws:kms"`.

- `encryption` <code>([Encryption](#encryption-parameters))</code> - Overrides
  the client-side encryption for this destination, for example a disaster
  recovery copy encrypted for other recipients.

- `prune` `(bool: true)` - Lets the retention, and `norca operator backup
  delete`, delete backups on this destination. Turn it off where the servers
  may only write, and expire the objects with lifecycle rules of the store.

### `encryption` Parameters

- `mode` `(string: "age")` - The encryption mode. `"age"` is the only mode
  that can be used; `"kms"` is reserved and rejected.

- `recipients` `(array<string>: <required>)` - The age public keys
  (`age1...`) the backups are encrypted for. The private keys (identities)
  are kept by the administrators outside the cluster and are only needed to
  browse and restore backups.

- `kms_key` `(string: "")` - Reserved for the `kms` mode.

### `retention` Parameters

The retention follows a grandfather-father-son scheme, in UTC: the newest
backup of each of the last `keep_hourly` hours, `keep_daily` days,
`keep_weekly` ISO weeks and `keep_monthly` months is kept. Pinned backups are
never deleted. The leader applies the retention after every backup, and only
within the prefix of its own region.

- `keep_hourly` `(int: 24)` - Hourly backups to keep.

- `keep_daily` `(int: 14)` - Daily backups to keep.

- `keep_weekly` `(int: 8)` - Weekly backups to keep.

- `keep_monthly` `(int: 12)` - Monthly backups to keep.

- `min_keep` `(int: 3)` - The number of newest usable backups that are never
  deleted, by the retention or by hand, even if the schedule has not run for
  a long time.

- `keep_failed` `(int: 10)` - The number of records of failed backups to
  keep.

## `backup` Examples

### Two clouds

The primary destination in the same cloud, and a disaster recovery copy in
another cloud that the servers may only write to, encrypted for a separate
key that is kept offline:

```hcl
server {
  backup {
    enabled  = true
    interval = "1h"

    destination "primary" {
      bucket = "company-norca-backup-eu"
      region = "eu-central-1"
      sse    = "aws:kms"
      kms_key = "arn:aws:kms:eu-central-1:111111111111:key/example"
    }

    destination "dr" {
      endpoint         = "https://s3.other-cloud.example.com"
      bucket           = "norca-backup-dr"
      force_path_style = true
      credentials_file = "/etc/norca.d/backup-dr-credentials"
      prune            = false

      encryption {
        recipients = ["age1...dr"]
      }
    }

    encryption {
      recipients = ["age1...ops", "age1...security"]
    }
  }
}
```

### RustFS on the same machine

The configuration of the [single node example](/docs/getting-started/examples/02-single-node)
backs up to a RustFS store deployed with the `rustfs` pack of the
[Norca pack registry](/docs/features/packages/registry); see the
[runbook](/docs/operations/backup-restore#set-up-the-store) for the steps.
