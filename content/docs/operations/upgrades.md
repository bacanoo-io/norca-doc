---
title: "Upgrading Norca"
linkTitle: "Upgrades"
description: "Norca-specific upgrade notes: the Norca and compatibility versions, the version gate of the Norca features, backups before an upgrade, moving from Nomad v1.6.5, and the legacy web UI."
weight: 2
---

Norca is upgraded like Nomad: servers first, one at a time, then the clients,
in place or by rolling in new hosts. The general procedure, the Raft protocol
notes and the changes of the Nomad releases up to v1.6.5 are on the adapted
pages [Upgrading](/docs/upgrade) and
[Specific version details](/docs/upgrade/upgrade-specific). This page adds what
is specific to Norca.

## Two versions

Every Norca binary carries two versions:

```shell
$ norca version
Norca v0.1.0 (Nomad API 1.6.5 compatible)
```

| Version | Value | Used for |
| --- | --- | --- |
| Norca version | `0.1.0` | The product version. The Norca features gate on it. |
| Compatibility version | `1.6.5` | The HTTP API and the protocols. Nomad's own feature gates, Autopilot and external API clients compare against it. |

The servers gossip both: the Serf tag `build` keeps the compatibility version,
and the tag `norca_vsn` carries the Norca version. `norca server members`
shows the compatibility version in its `Build` column; `-verbose` lists the
tags, `norca_vsn` among them:

```shell
norca server members -verbose
```

See [Compatibility](/docs/introduction/compatibility) for what stays
compatible with Nomad v1.6.5.

## Version gate of the Norca features

A Norca feature that writes new kinds of data to the Raft log is enabled in a
region only when every live server of the region runs at least the Norca
version that introduced it. In Norca 0.1.0 all features share one minimum
version, `0.1.0`. Until the gate is met, requests that would write the new data
fail with an error such as:

```plaintext
all servers must be running Norca 0.1.0 or later to upsert quotas
```

The gate applies, among others, to quotas, admission policies, network
policies, cross-job affinity, disruption budgets and evictions, `mtls` blocks
and certificate issuing, service intentions, the `secret` block and the seal
rewrap, custom objects and object kinds, pack releases, backups, and the
built-in autoscaler. A [multiregion job](/docs/features/multiregion) needs the
gate in every region it lists.

Servers that do not advertise a Norca version, such as Nomad servers during a
migration to Norca, never meet the gate. Mixed clusters keep running the
Nomad v1.6.5 features; the Norca features turn on once the last server runs
Norca. Prerelease builds pass the gate of their version: `0.1.0-dev` meets
`0.1.0`.

Clients matter too: only Norca clients (node attribute `norca.version` 0.1.0
or later) report the readiness of their service instances from the startup and
readiness checks. During a mixed upgrade, the servers don't treat the
instances on older clients as not ready; see
[Health check roles](/docs/features/health-check-roles).

## Before an upgrade

1. **Take a pinned backup** of every region, so the state from before the
   upgrade survives the retention:

   ```shell
   norca operator backup save -pin -label note="before upgrade to 0.2.0"
   ```

   A backup records the Norca version that took it. A Norca version older than
   that refuses to restore it, so keep the backup of the old version: it is the
   only way back.
2. **Read the release notes** of the Norca version for new defaults and new
   gates.
3. **Check the configuration** with the new binary:

   ```shell
   norca config validate /etc/norca.d/
   ```

   It checks the Norca blocks (`keyring`, `backup`, `autoscaler`, `mtls`,
   `admission`, `secrets`, `dns`, `consul_compat`) as the agent does when it
   starts.
4. **Check the seal.** A server with a seal other than the default starts
   sealed after a restart and must be unsealed before it can serve Variables,
   workload identities, mTLS and the secret store; plan the unseal shares or
   the KMS access for the restarts. See [Seal and unseal](/docs/operations/seal-unseal).

## Rolling upgrade

Follow [Upgrading](/docs/upgrade): add or upgrade one server at a time, wait
until it is healthy and a voter (`norca operator raft list-peers`,
`norca server members`), then the next. After the last server, check that the
Norca features are available, for example with `norca operator backup list`,
then upgrade the clients.

Downgrades are not supported. Data written by a Norca feature can't be read by
a version that does not know it.

## Upgrading from Nomad v1.6.5

Norca is based on Nomad v1.6.5 and keeps its HTTP API, its configuration keys,
its metric names and its Raft and Serf names. During a rolling migration of the
servers the Norca features stay off, as described above, until the last Nomad
server is replaced. Take a snapshot (`norca operator snapshot save`) and a copy
of the keystore of a server before you start; see
[Key management](/docs/operations/key-management). With ACLs enabled, check
the [security differences from Nomad v1.6.5](/docs/security/nomad-differences):
tools that use a node secret ID as a token need an ACL token on Norca.
<!-- TODO: verify: an end-to-end tested migration path from Nomad v1.6.5 servers to Norca (mixed cluster), and from which Nomad versions -->

## Web UI

Norca ships a new web UI at `/ui/`; the UI of Nomad v1.6.5 is not included.
Bookmarks keep working where the page exists under the same path; old links
to `/ui/legacy/` (the previous UI, served up to Norca v0.2.0) open the not-found
page of the UI. See [Web UI](/docs/features/web-ui).

## The `nomad` alias

Scripts that call `nomad` keep working with a copy of the binary, or a
symlink to it, named `nomad`. The CLI reads `NORCA_*` environment variables
and falls back to the `NOMAD_*` names; see
[Compatibility](/docs/introduction/compatibility#environment-variables-of-the-cli).
