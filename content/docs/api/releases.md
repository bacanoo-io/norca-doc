---
title: "Releases HTTP API"
linkTitle: "Releases"
description: "The /release endpoints install, upgrade, plan, roll back, test, check and uninstall pack releases, and read their revisions."
---

The `/release` endpoints manage [pack releases](/docs/features/packages/releases): installs and
upgrades of rendered pack resources applied by the servers, with a revision history. `norca pack` uses
them; the Go client is `client.Releases()` in `github.com/bacanoo-io/norca/norca/api`.

Packs of [cluster pack registries](/docs/features/packages/catalog) are rendered by the servers and
installed with `plan-pack` and `deploy-pack`, described in the
[Pack registries HTTP API](/docs/api/pack-registries#plan-or-install-a-pack).

Releases are custom objects of the built-in kind `packs.norca.io/Release` in a namespace, with
revisions of the kind `packs.norca.io/ReleaseRevision`. They can be read with the object API too, but
**only these endpoints write them**. All endpoints are bound to a namespace (`namespace` query parameter
or `X-Nomad-Namespace`, default `default`) and a region (`region`).

The table below shows the ACL capabilities each endpoint needs. They are object capabilities of the
kind, granted in an ACL policy:

```hcl
namespace "apps" {
  object "packs.norca.io/Release" {
    capabilities = ["read", "write"]
  }
}
```

**Writing a release grants nothing else**: every resource of the release is applied with the caller's
token through the normal endpoint of its type, so **the token also needs the permissions for those
resources** (for example `submit-job` for a job, or a management token for an ACL policy). Resources the
release adopts without writing them (all of them with `RecordOnly`, and the multiregion jobs another
region of a multi-region install registers) need the same permissions, and `TakeOwnership` needs
object `write` on `packs.norca.io/Release` in the namespace of every release resources are taken
from; see [permissions](/docs/features/packages/releases#permissions).

> [!NOTE]
> The field names on this page are those of the Go structures (`Spec`, `Status`, `Pack`, ...).
> Binaries built with the generated codec (the project's `make` targets) encode the nested
> structures with these PascalCase names; a plain `go build` without the generated codec encodes
> them with the camelCase names of their JSON tags (`pack`, `maxHistory`, `lastOperation`).
> Clients should accept both.

## List releases

This endpoint lists the releases of a namespace.

| Method | Path           | Produces           |
| ------ | -------------- | ------------------ |
| `GET`  | `/v1/releases` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | object `read` on `packs.norca.io/Release` |

### Parameters

- `namespace` `(string: "default")` - The namespace; `*` lists the releases of all namespaces the
  token can read.

- `prefix` `(string: "")` - Only releases whose name starts with the prefix.

- `owner` `(string: "")` - Only releases of an owner, as `<kind>/<namespace>/<name>`:
  `stack/apps/platform` lists the releases the Rigger stack `platform` of the namespace `apps` owns.

### Sample request

```shell
$ curl \
    "https://localhost:4646/v1/releases?namespace=apps"
```

The response is a list of release objects as returned by [Read release](#read-release).

## Read release

This endpoint reads a release.

| Method | Path                | Produces           |
| ------ | ------------------- | ------------------ |
| `GET`  | `/v1/release/:name` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | object `read` on `packs.norca.io/Release` |

### Response fields

- `ID`, `Namespace`, `Name`, `CreateTime`, `ModifyTime`, `CreateIndex`, `ModifyIndex`

- `Spec.Pack` - The pack of the newest revision: `Name`, `Version`, `Registry`, `Path`, `Digest` (OCI
  manifest digest), `Signer` (key ID reported by the client), `Signatures`, `TrustedSigner` (key ID
  the servers verified a signature with), `Requires` (`Norca`, `Features`), `Manager` (`pack` or
  `rigger`: the package manager that applied the newest revision; see
  [one manager](#one-manager-per-release)), `Commit`.

- `Spec.Description`, `Spec.Revision` (newest revision), `Spec.MaxHistory`, `Spec.Atomic` (mode of
  the last operation), `Spec.Multiregion` (`Regions`, `GlobalRegion`; only for multi-region
  installs).

- `Spec.Owner` - The owner of the newest revision, for a release a Rigger stack installed: `Kind`
  (`stack`), `Namespace` and `Name` (those of the stack), `Version`, `Source`, `Part`. Absent for a
  release no stack owns.

- `Status.Phase` - `pending`, `applying`, `deployed`, `failed`, `rolling-back` or `uninstalling`.

- `Status.Revision` - The deployed revision.

- `Status.Resources` - The owned resources: `Type`, `Namespace`, `Name`, `Hook`, `ModifyIndex`,
  `Version`, `Hash`.

- `Status.Conditions` - `Ready`, `HooksSucceeded` and `Drifted`, each with `Type`, `Status`
  (`True`, `False`, `Unknown`), `Reason`, `Message`, `LastTransitionTime`.

- `Status.LastOperation` - `ID` (the operation's unique ID, set when it starts), `Action`, `Revision`,
  `User`, `StartTime`, `EndTime`, `Error`, `Warnings`, `RolledBack`.

- `Status.LastTest` - `Revision`, `StartTime`, `EndTime`, `Succeeded`, `Hooks` (per hook job:
  `Phase`, `Namespace`, `Job`, `Status` (`succeeded`, `failed`, `timeout`), `Message`).

### Sample request

```shell
$ curl \
    "https://localhost:4646/v1/release/cache?namespace=apps"
```

## Install or upgrade release

This endpoint installs a release, or upgrades it with a new revision. The leader runs one operation
per release at a time; **a concurrent operation gets `409 Conflict`, as does a resource owned by
another release without `TakeOwnership`, and a resource another release operation or a tenant pass
is writing at that moment** (`being written by another operation`; the other operation is named only
to a caller who may write the resource). The operation claims the resources of its pack before it
writes anything, so nothing is written then; see
[install, upgrade, rollback, uninstall](/docs/features/packages/releases#install-upgrade-rollback-uninstall).

**A leader change answers `503 Service Unavailable`** in two ways, here and for the rollback, test
and uninstall endpoints:

- `this server is not the leader, and release operations run on the leader; retry the operation` -
  The request reached a server that is not (or no longer) the leader, and nothing was written. Retry
  it.
- `release "<name>": the operation was interrupted by a leader change; the new leader marks the release failed` -
  The operation stopped at its next write when its server lost the leadership (or the new leader had
  already marked the release `failed`). What it wrote so far stays: no atomic rollback, hook jobs
  are not purged. The new leader marks the release `failed`; upgrade or roll back again. See
  [install, upgrade, rollback, uninstall](/docs/features/packages/releases#install-upgrade-rollback-uninstall).

| Method         | Path                | Produces           |
| -------------- | ------------------- | ------------------ |
| `PUT` / `POST` | `/v1/release/:name` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `write` on `packs.norca.io/Release`, plus the permissions for every resource |

### Parameters

- `:name` `(string: <required>)` - The release name, in the path.

- `Pack` `(object: <required>)` - The pack: `Name`, `Version`, `Registry`, `Path`, `Source` (the git
  URL or `oci://` location of its registry) and `Ref` (the tag or branch), `Digest`, `Signer`,
  `Signatures` (each `Payload` and `Signature`, the cosign simple signing format), `Requires`.
  `norca pack` fills `Source` and `Ref` for packs of git and OCI registries; the web UI upgrades the
  release from a cluster registry of that source. `Manager` is `pack` (also when empty) or `rigger`;
  `Commit` the git commit a Rigger module was fetched at.

- `Description` `(string: "")` - Description of the revision.

- `Values` `(map: nil)` - The variable overrides, recorded in the revision (secret-looking values
  redacted); `ValuesHash` a hash of all overrides and var files.

- `InputDigest` `(string: "")` - Rigger's digest of what it applies (the module digest, the values,
  the settings), recorded in the revision as given; Rigger compares it to tell an unchanged release.

- `Owner` `(object: nil)` - The owner of the release: `Kind` (only `stack`), `Namespace` and `Name`
  of the stack (both required), `Version`, `Source`, `Part`. Whoever may apply the release may set it, but the release
  of a stack goes to another owner only with `Adopt` (see [one owner](#one-owner-per-release)); an
  unknown kind or a missing namespace or name is a `400`.

- `Adopt` `(bool: false)` - Take over a release whose newest revision the other package manager
  applied ([one manager](#one-manager-per-release)) or that another stack owns
  ([one owner](#one-owner-per-release)).

- `Resources` `(array: <required>)` - The rendered resources. Each has

  - `Type` (`namespace`, `quota`, `acl-policy`, `variable`, `object-kind`, `admission-policy`,
    `object` or `job`),
  - `Source` (the template file), and
  - the resource in the field of its type: `Namespace`, `Quota`, `ACLPolicy`, `Variable`,
    `ObjectKind`, `AdmissionPolicy`, `Object`, or `Job` (API form) with an optional `Submission`.

  A Variables resource lists its secret item names in `SecretKeys`. **At most 256
  resources.** A Variable is written only in the state the operation read it in (check-and-set): one
  changed meanwhile is not written, and its apply fails with "changed since the release read it".
  A hook job is registered only while its ID is free and purged only while it belongs to the
  release; the hook fails if a job of another owner has the ID or replaces the hook job.

- `Secrets` `(array: nil)` - Secret Variables items (`Namespace`, `Path`, `Items`), written to the
  Variables but **never stored in the release**.

- `Atomic` `(bool: <optional>)` - Restore the previous state on failure; if unset, the namespace
  decides (production namespaces are atomic). The restore puts back only what is still as the
  operation left it: a resource somebody else changed after the operation's write, or created again
  after the operation deleted it, is left as it is, with a warning naming it in
  `Status.LastOperation.Warnings` of the release (see
  [atomic mode](/docs/features/packages/releases#atomic-mode-and-production-namespaces)).

- `Wait` `(bool: false)` - Wait for the deployments of the jobs.

- `Timeout` `(duration: 5m)` - How long to wait for deployments and hooks, in nanoseconds (at most 2h).

- `TakeOwnership` `(bool: false)` - Take over resources that belong to another release. With ACLs
  enabled, the token needs object `write` on `packs.norca.io/Release` in the namespace of every
  release resources are taken from. A resource another operation is writing at that moment is not
  taken: it is a `409 Conflict` with `TakeOwnership` too. The resources are removed from the releases
  they are taken from after the operation has recorded its result; an operation a leader change has
  interrupted by then takes nothing off them and answers with the warning
  `resources of release "<namespace>/<name>" not taken over: ...`, and the next operation decides.

- `MaxHistory` `(int: 10)` - Number of revisions to keep (at most 100).

- `RecordOnly` `(bool: false)` - Only record the revision of resources deployed by the client
  (`norca pack run --client-side`). With ACLs enabled, the token needs the permissions to write every
  resource it records, as for a real apply.

- `VariablesSchemas` `(array: nil)` - The JSON Schemas of the packs (`Pack`: the pack path such as
  `app.redis`, `Schema`), validated again by the servers and stored in the revision (64 KiB in total).

- `VariableValues` `(map: nil)` - The effective variable values per pack path, validated against the
  schemas and never stored.

- `Regions` `(array: nil)` - Install in these regions in one operation
  ([multi-region installs](/docs/features/packages/releases#multi-region-installs), at most 32).

### Response

- `Release` - The release after the operation.
- `Revision` - The number of the new revision.
- `Changes` - Per resource: `Type`, `Namespace`, `Name`, `Action` (`create`, `update`, `delete`,
  `unchanged`, `hook`, `adopt`, `remote`), `Hook`, `Owner`, `JobDiff` (plans), `Region` (for
  `remote`), `Error` (the change failed). A resource the upgrade dropped and did not delete because
  it is no longer the release's is a `delete` with `Error` `not deleted: <why>`
  ([install, upgrade, rollback, uninstall](/docs/features/packages/releases#install-upgrade-rollback-uninstall)).
- `Warnings` - Warnings, for example of admission policies with `action = "warn"`.
- `Regions` - With `Regions` in the request: one result per region (`Region`, `Release`, `Revision`,
  `Changes`, `Warnings`, `Error`), in the order the regions were applied.

### One manager per release

**A release has one package manager:** the pack manager (`norca pack`) or Rigger. The manager of a
revision is `Pack.Manager`. An install, an upgrade or a dry run of one manager on a release whose
newest revision the other applied fails with `409 Conflict`:

```text
release "web" is managed by pack: rigger takes it over only when asked to (adopt; the flag -adopt)
```

`Adopt` (`rigger stack apply -adopt`, `rigger install -adopt`) takes the release over; from then on
the other manager is the one refused. A rollback to a revision of the other manager needs `Adopt`
too. Uninstalls and tests are open to both.

### One owner per release

**The owner of a release is a stack, by its namespace and name.** A stack prunes and destroys what it
owns, so an apply, a dry run or a rollback that would give the release of a stack to another owner
(another stack, one of the same name in another namespace, or none) fails with `409 Conflict`:

```text
release "web" belongs to the stack apps/platform: it is taken over only when asked to (adopt; the flag -adopt)
```

`Adopt` takes the release over (`rigger stack apply -adopt`, `rigger install -adopt`,
`rigger release rollback -adopt`). A release that no stack owns may become a stack's without it. A
stack that changes its namespace is a new stack: its old releases need `Adopt`.

## Plan release

This endpoint runs the same checks as an install or upgrade and returns the changes, without writing
anything.

| Method         | Path                     | Produces           |
| -------------- | ------------------------ | ------------------ |
| `PUT` / `POST` | `/v1/release/:name/plan` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `write` on `packs.norca.io/Release` |

The body and the response are those of [install or upgrade](#install-or-upgrade-release); the
`Changes` carry the job diffs.

## List revisions

This endpoint lists the kept revisions of a release, newest first.

| Method | Path                        | Produces           |
| ------ | --------------------------- | ------------------ |
| `GET`  | `/v1/release/:name/history` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | object `read` on `packs.norca.io/Release` |

Each revision has `Namespace`, `Release`, `Revision`, `Spec` (`Action`, `RollbackOf`, `Pack`,
`Description`, `Values`, `ValuesHash`, `InputDigest`, `Owner`, `VariablesSchemas`, `Multiregion`,
`Resources`, `User`, `CreateTime`) and `Status` (`Phase`: `pending`, `deployed`, `superseded` or `failed`; `Message`,
`Hooks`).

## Read revision

This endpoint reads one revision with its rendered resources.

| Method | Path                             | Produces           |
| ------ | -------------------------------- | ------------------ |
| `GET`  | `/v1/release/:name/revision/:n`  | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | object `read` on `packs.norca.io/Release` and `namespace:read-job` |

The response is a revision as in [list revisions](#list-revisions), with `Resources`: the rendered
resources in the form of the install request.

## Roll back release

This endpoint applies the content of a kept revision as a new revision. It claims the resources as
an install does: one that another operation is writing at that moment is a `409 Conflict`. A leader
change answers `503 Service Unavailable` as for an
[install or upgrade](#install-or-upgrade-release).

| Method         | Path                         | Produces           |
| -------------- | ---------------------------- | ------------------ |
| `PUT` / `POST` | `/v1/release/:name/rollback` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `write` on `packs.norca.io/Release`, plus the permissions for every resource |

### Parameters

- `Revision` `(int: 0)` - The revision to restore; `0` restores the revision deployed before the
  current one.
- `Atomic` `(bool: <optional>)`, `Wait` `(bool: false)`, `Timeout` `(duration: 5m)` - As for an
  install.
- `DryRun` `(bool: false)` - Return the changes without rolling back.
- `Adopt` `(bool: false)` - Restore a revision the other package manager applied than the one of
  the newest revision ([one manager](#one-manager-per-release)).

The rollback restores the pack, the values, the owner and the input digest of the revision.
The response is that of [install or upgrade](#install-or-upgrade-release).

### Sample request

```shell
$ curl \
    --request POST \
    --header "X-Nomad-Token: $NORCA_TOKEN" \
    --data '{"Revision": 1, "Wait": true}' \
    "https://localhost:4646/v1/release/cache/rollback?namespace=apps"
```

## Run tests

This endpoint runs the `test` hooks of the deployed revision and records the result in
`Status.LastTest`. A leader change answers `503 Service Unavailable` as for an
[install or upgrade](#install-or-upgrade-release), with the message
`release "<name>": the test was interrupted by a leader change; no result was recorded`. An
interrupted test records no result and no `TestSucceeded` or `TestFailed` event, and the phase of
the release stays as it was.

| Method         | Path                     | Produces           |
| -------------- | ------------------------ | ------------------ |
| `PUT` / `POST` | `/v1/release/:name/test` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `write` on `packs.norca.io/Release` |

### Parameters

- `timeout` `(duration: "5m")` - How long to wait for the test hooks, as a query parameter (for
  example `2m`).

The response is the test result: `Revision`, `StartTime`, `EndTime`, `Succeeded`, `Hooks`.

## Check drift

This endpoint compares the live resources with the deployed revision and updates the `Drifted`
condition.

| Method                 | Path                      | Produces           |
| ---------------------- | ------------------------- | ------------------ |
| `GET` / `PUT` / `POST` | `/v1/release/:name/drift` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `read` on `packs.norca.io/Release` |

### Sample response

```json
{
  "Drifted": true,
  "Revision": 3,
  "Resources": [
    { "Type": "job", "Namespace": "apps", "Name": "cache", "Reason": "modified" }
  ]
}
```

`Reason` is `missing` or `modified`.

## Uninstall release

This endpoint uninstalls a release: `pre-delete` hooks, the resources in reverse order, `post-delete`
hooks, then the release and its revisions. A leader change answers `503 Service Unavailable` as for
an [install or upgrade](#install-or-upgrade-release); an interrupted uninstall leaves the release
and the resources it has not deleted yet, and the new leader marks the release `failed`: uninstall
it again.

| Method   | Path                | Produces           |
| -------- | ------------------- | ------------------ |
| `DELETE` | `/v1/release/:name` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | object `write` on `packs.norca.io/Release`, plus the permissions to delete every resource |

### Parameters

- `propagation` `(string: "background")` - `background` deletes the resources, `orphan` keeps them
  and deletes only the release. Query parameter.
- `no_hooks` `(bool: false)` - Skip the hooks. Query parameter.
- `timeout` `(duration: "5m")` - How long to wait for the hooks. Query parameter.

The response has `Release` (the release before deletion) and `Changes`. The uninstall deletes only
what is still the release's: a resource somebody else created again under its name, or that a
tenant or another release owns or another operation is writing, is left, and its change has the
`Error` `not deleted: <why>`. As the release object is gone, the warnings of the uninstall are in
`Release.Status.LastOperation.Warnings` of the response.

### Sample request

```shell
$ curl \
    --request DELETE \
    --header "X-Nomad-Token: $NORCA_TOKEN" \
    "https://localhost:4646/v1/release/cache?namespace=apps&propagation=orphan"
```
