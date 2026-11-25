---
title: "Releases HTTP API"
linkTitle: "Releases"
description: "The /release endpoints install, upgrade, plan, roll back, test, check and uninstall releases, and read their revisions."
---

The `/release` endpoints manage [releases](/docs/features/packages/releases): installs and
upgrades of rendered resources applied by the servers, with a revision history. **Rigger applies its
releases through them**: the `rigger` program and `norca rigger`, and the servers themselves for an
[install](/docs/api/rigger-install) or a [stack](/docs/api/rigger-stacks). The Go client is
`client.Releases()` in `github.com/bacanoo-io/norca/norca/api`.

Releases are custom objects of the built-in kind `rigger.norca.io/Release` in a namespace, with
revisions of the kind `rigger.norca.io/ReleaseRevision`. They can be read with the object API too, but
**only these endpoints write them**. All endpoints are bound to a namespace (`namespace` query parameter
or `X-Nomad-Namespace`, default `default`) and a region (`region`).

Several names inside a release keep the word pack: `Spec.Pack` (the package of the release), the
manager `pack`, the job meta `pack.release` and the admission input `release.pack`.

The table below shows the ACL capabilities each endpoint needs. They are object capabilities of the
kind, granted in an ACL policy. The registries and the operations of Rigger are kinds of the same
group, so **a rule for `rigger.norca.io/*` covers the releases with them**:

```hcl
namespace "apps" {
  object "rigger.norca.io/Release" {
    capabilities = ["read", "write"]
  }
}
```

**Writing a release grants nothing else**: every resource of the release is applied with the caller's
token through the normal endpoint of its type, so **the token also needs the permissions for those
resources** (for example `submit-job` for a job, or a management token for an ACL policy). Resources the
release adopts without writing them (all of them with `RecordOnly`, and the multiregion jobs another
region of an [install in several regions](#several-regions-in-one-request) registers) need the same
permissions, and `TakeOwnership` needs
object `write` on `rigger.norca.io/Release` in the namespace of every release resources are taken
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
| `YES`            | object `read` on `rigger.norca.io/Release` |

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
| `YES`            | object `read` on `rigger.norca.io/Release` |

### Response fields

- `ID`, `Namespace`, `Name`, `CreateTime`, `ModifyTime`, `CreateIndex`, `ModifyIndex`

- `Spec.Pack` - The package of the newest revision: `Name`, `Version`, `Registry`, `Path`, `Source`,
  `Ref`, `Digest`, `Signer` (key ID reported by the client), `Signatures`, `TrustedSigner` (key ID
  the servers verified a signature with), `Requires` (`Norca`, `Features`), `Manager` (`pack` or
  `rigger`: the package manager that applied the newest revision; see
  [one manager](#one-manager-per-release)), `Commit`.

- `Spec.Description`, `Spec.Revision` (newest revision), `Spec.MaxHistory`, `Spec.Atomic` (mode of
  the last operation), `Spec.Multiregion` (`Regions`, `GlobalRegion`; only for an
  [install in several regions](#several-regions-in-one-request)).

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
to a caller who may write the resource). The operation claims its resources before it
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
| `NO`             | object `write` on `rigger.norca.io/Release`, plus the permissions for every resource |

### Parameters

- `:name` `(string: <required>)` - The release name, in the path.

- `Pack` `(object: <required>)` - The package of the release, for Rigger a module: `Name`, `Version`,
  `Registry`, `Path`, `Source` (where it came from) and `Ref` (the tag or branch), `Digest`, `Signer`,
  `Signatures` (each `Payload` and `Signature`, the cosign simple signing format), `Requires`.
  `Manager` is `rigger` for a release of Rigger; `pack` (also when empty) is the manager of the
  releases that the pack manager made, which no longer exists. `Commit` is the git commit a Rigger
  module was fetched at; for a module of a stack's own directory, the commit of the
  [origin](/docs/api/rigger-stacks#the-origin-of-a-stack-sent-as-files) of the stack. A module that
  the servers installed from a [registry of Rigger](/docs/api/rigger-registries) records the name of
  that registry in `Registry`.

- `Description` `(string: "")` - Description of the revision.

- `Values` `(map: nil)` - The variable overrides, recorded in the revision (secret-looking values
  redacted); `ValuesHash` a hash of all overrides and value files.

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
  - `Source` (the file of the package it came from), and
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
  enabled, the token needs object `write` on `rigger.norca.io/Release` in the namespace of every
  release resources are taken from. A resource another operation is writing at that moment is not
  taken: it is a `409 Conflict` with `TakeOwnership` too. The resources are removed from the releases
  they are taken from after the operation has recorded its result; an operation a leader change has
  interrupted by then takes nothing off them and answers with the warning
  `resources of release "<namespace>/<name>" not taken over: ...`, and the next operation decides.

- `MaxHistory` `(int: 10)` - Number of revisions to keep (at most 100).

- `RecordOnly` `(bool: false)` - Only record the revision of resources that the client deployed
  itself. With ACLs enabled, the token needs the permissions to write every resource it records, as
  for a real apply.

- `VariablesSchemas` `(array: nil)` - JSON Schemas of the variables (`Pack`: the path of the package
  a schema belongs to, such as `app.redis`; `Schema`), validated by the servers and stored in the
  revision (64 KiB in total).

- `VariableValues` `(map: nil)` - The effective variable values per package path, validated against
  the schemas and never stored.

- `Regions` `(array: nil)` - Install in these regions in one request, at most 32; see
  [several regions in one request](#several-regions-in-one-request). Rigger does not send it.

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

**A release has one package manager:** Rigger, or `pack` for a release that the pack manager made
before it was removed. Such a release is still listed, rolled back and uninstalled. The manager of a
revision is `Pack.Manager`. An install, an upgrade or a dry run of one manager on a release whose
newest revision the other applied fails with `409 Conflict`:

```text
release "web" is managed by pack: rigger takes it over only when asked to (adopt; the flag -adopt)
```

`Adopt` (`rigger stack apply -adopt`, `rigger install -adopt`) takes the release over; from then on
the other manager is the one refused. A rollback to a revision of the other manager needs `Adopt`
too. Uninstalls and tests are open to both.

### Several regions in one request

A release lives in a region, and **Rigger installs a release in one region**: for several regions it
takes one install, or one stack, per region. The endpoint itself also takes `Regions`: the region
that receives the request sends the release to the leader of every region in turn and answers with
one result per region. Each region applies it as a release operation of its own, with its own
release object, revisions, atomic mode, hooks and drift detection; `Spec.Multiregion` of every
release records the regions and the global region.

- **Global resources** (namespaces, quotas, ACL policies) are applied and owned only by the release
  of the global region: the authoritative region if it is one of the regions, otherwise the first
  one given. The other regions show them as `remote` in their changes and wait, up to a minute,
  until the replicated copies match.
- **A job with a `multiregion` block** is registered by the release of the first region of the
  request that the job lists; the releases of the other listed regions adopt their copy.
- **A failure in one region** does not affect the releases of the other regions. The request fails
  only if every region failed.
- `Regions` can't be combined with `RecordOnly`.
- The token must be valid in every region.

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
| `NO`             | object `write` on `rigger.norca.io/Release` |

The body and the response are those of [install or upgrade](#install-or-upgrade-release); the
`Changes` carry the job diffs.

## List revisions

This endpoint lists the kept revisions of a release, newest first.

| Method | Path                        | Produces           |
| ------ | --------------------------- | ------------------ |
| `GET`  | `/v1/release/:name/history` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | object `read` on `rigger.norca.io/Release` |

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
| `YES`            | object `read` on `rigger.norca.io/Release` and `namespace:read-job` |

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
| `NO`             | object `write` on `rigger.norca.io/Release`, plus the permissions for every resource |

### Parameters

- `Revision` `(int: 0)` - The revision to restore; `0` restores the revision deployed before the
  current one.
- `Atomic` `(bool: <optional>)`, `Wait` `(bool: false)`, `Timeout` `(duration: 5m)` - As for an
  install.
- `DryRun` `(bool: false)` - Return the changes without rolling back.
- `Adopt` `(bool: false)` - Restore a revision the other package manager applied than the one of
  the newest revision ([one manager](#one-manager-per-release)).

The rollback restores the package (`Pack`), the values, the owner and the input digest of the revision.
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
| `NO`             | object `write` on `rigger.norca.io/Release` |

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
| `NO`             | object `read` on `rigger.norca.io/Release` |

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
| `NO`             | object `write` on `rigger.norca.io/Release`, plus the permissions to delete every resource |

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
