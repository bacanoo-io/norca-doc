---
title: "Upgrading Norca"
linkTitle: "Upgrades"
description: "Norca-specific upgrade notes: the Norca and compatibility versions, the version gate of the Norca features, backups before an upgrade, the security fixes of 0.1.0, and the legacy web UI."
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
   gates, and the [security fixes](#security-fixes-in-010) below for changed
   behavior.
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
[Key management](/docs/operations/key-management).
<!-- TODO: verify: an end-to-end tested migration path from Nomad v1.6.5 servers to Norca (mixed cluster), and from which Nomad versions -->

## Security fixes in 0.1.0

Norca 0.1.0 contains the fixes of a security review, merged into `main` with
commit `8f7a1bd17`. Development builds made before that commit behave as
described under *Before*. Nomad v1.6.5 behaves like them for the first two
changes, so they also apply when you move a cluster from Nomad v1.6.5. The
server-side checks protect a cluster once every server runs a build with the
fixes; the task secret change needs the fixed build on the clients.

| Change | Applies | What to do |
| --- | --- | --- |
| [Node secret IDs are not ACL tokens](#node-secret-ids-are-not-acl-tokens) | ACLs enabled | Replace node secret IDs used as tokens by ACL tokens |
| [Snapshot save and restore stop after a denial](#snapshot-save-and-restore-stop-after-a-denial) | ACLs enabled | Nothing; use a management token |
| [Task secrets don't follow symlinks](#task-secrets-dont-follow-symlinks) | Always | Don't route secret destinations through symlinks |
| [Pack names and tags are validated](#pack-names-and-tags-are-validated) | Always | Rename tags and names that break the rules |
| [Release adoption is authorized](#release-adoption-is-authorized) | ACLs enabled | Give the tokens of `--client-side` and `--take-ownership` the permissions of the resources |

### Node secret IDs are not ACL tokens

**Before:** with ACLs enabled, a request authenticated with the secret ID of a
client node, rather than an ACL token or a workload identity, passed the
permission checks of most endpoints as if ACLs were disabled. It worked like a
management token on the secret store, the seal, the keyring, Variables, jobs,
nodes, the operator and backup endpoints, among others. A client node could
also drain any node and remove any service registration.

**Now:** the servers accept a node secret ID only on the requests clients make
for their own work, and deny it with `403 Permission denied` everywhere else.
A client can drain only its own node (`drain_on_shutdown`) and remove only the
service registrations of its own node. Variables are listed, read and written
only with ACL tokens and workload identities. Requests without a token are
still evaluated with the anonymous policy. See
[client node identity](/docs/concepts/acl#client-node-identity).

**What to do:** scripts, tools and integrations that send a node secret ID as
`X-Nomad-Token` (or `NORCA_TOKEN`/`NOMAD_TOKEN`) need an ACL token with a
policy for what they do; tasks use their
[workload identity](/docs/concepts/workload-identity). The clients' own use of
their secret ID (registration, allocation updates, service registrations,
intentions, mTLS certificates, the catalog of the built-in DNS server, drain on
shutdown) keeps working.

### Snapshot save and restore stop after a denial

**Before:** `GET` and `PUT` on [`/v1/operator/snapshot`](/docs/api/operator/snapshot)
answered `403` when the token failed authentication, but the server went on
and streamed the snapshot out or restored it.

**Now:** the request ends with the `403`, and a denied identity (such as a node
secret ID) is reported as `403` too. `norca operator snapshot save` and
`restore` need a management token, as documented.

### Task secrets don't follow symlinks

**Before:** the client wrote the files of [`secret`](/docs/job-specification/secret)
blocks by following symlinks. A task could replace a directory below its
`secrets/` directory with a symlink, so that the next delivery (a changed
secret, or every secret after a client restart) wrote the file anywhere on the
host, as the agent, owned by the task's user.

**Now:** every directory on the way to a secret file, `secrets/` included,
must be a real directory. A symlink or junction among them fails the delivery
with an error; a symlink at the destination is replaced by the file, not
followed. On Windows, a changed secret now replaces the previous read-only
file; these re-deliveries failed before.

**What to do:** nothing for tasks that don't create links in `secrets/`. A task
that links a directory below `secrets/` to another place must write its
secrets to a real directory instead.

### Pack names and tags are validated

**Before:** the tags of a [bundle](/docs/features/packages/supply-chain#air-gapped-installation-with-offline-bundles)
were not checked. A crafted tag such as `..\..\victim` made
`norca pack bundle import --cache-as` replace a directory outside of the pack
cache on Windows, and write outside of the registry's cache directory on Linux.

**Now:** tags (from bundles, `--ref` of an OCI registry, and registry tag
lists) must follow the OCI tag grammar, without Windows device names and a
trailing dot; pack names and cache registry names must not contain
`/ \ : @ * ? " < > |`, end with a dot or a space, or be `.`, `..` or a device
name. See the [naming rules](/docs/features/packages/supply-chain#oci-registries).

**What to do:** rebuild bundles and re-tag packs whose names or tags break the
rules; nothing else changes for valid names. The refs of git registries are not
affected.

### Release adoption is authorized

**Before:** a `record_only` release apply (`norca pack run --client-side`)
recorded existing resources as owned by the release without checking the
caller's permissions on them. A token with release `write` in one namespace
could adopt any job, ACL policy, namespace, Variable or object; with
`--take-ownership` it also removed them from the releases owning them in other
namespaces, so that a later uninstall of the adopting release deleted them. The
multiregion jobs adopted in a multi-region install were not checked either.

**Now:** before anything is written, every adopted resource needs the
permission a real apply of it needs, and taking resources over needs release
`write` in the namespace of every release they are taken from. Rollbacks of a
stored multi-region revision are checked the same way. See
[release permissions](/docs/features/packages/releases#permissions).

**What to do:** give the tokens that run `--client-side` deployments or use
`--take-ownership` these permissions, or the operations fail with `403`.

## Web UI and the legacy UI

Norca ships a new web UI at `/ui/`. The previous UI of Nomad v1.6.5 stays
available at `/ui/legacy/` for one release, so bookmarks and habits can move
over. It is only served by binaries built with it (the `ember-dist-legacy`
make target, part of `make prerelease`); a binary built without it serves the
new UI for those paths. See [Web UI](/docs/features/web-ui).

## The `nomad` alias

Scripts that call `nomad` keep working with a copy of the binary, or a
symlink to it, named `nomad`. The CLI reads `NORCA_*` environment variables
and falls back to the `NOMAD_*` names; see
[Compatibility](/docs/introduction/compatibility#environment-variables-of-the-cli).
