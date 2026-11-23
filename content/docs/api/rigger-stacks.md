---
title: "Rigger Stacks HTTP API"
linkTitle: "Rigger Stacks"
description: "The servers plan, apply and destroy stacks of Rigger: an apply or a destroy runs on the leader as an operation, with its full log on the system bus."
---

The servers can run a **stack** of Rigger, the package manager, themselves: a published stack (of the
global registry or a git repository) or a local stack sent as files. A plan and the status of a stack
answer at once; **an apply and a destroy run on the leader as an operation**, an object of the kind
`rigger.norca.io/Operation` in the namespace of the stack, and answer with it at once. The Go client is
`client.Rigger()` in `github.com/bacanoo-io/norca/norca/api`.

Every request is in the namespace of the stack (the `namespace` query parameter or
`X-Nomad-Namespace`); a stack of another namespace is refused. **A stack runs on the servers of its
region**: a stack of another region is refused (400), and a stack without a region is of `global`. The
releases are applied through the [release API](/docs/api/releases) with the caller's token.

## The request

| Field | Meaning |
| --- | --- |
| `Source`, `Version` | A published stack: `<namespace>/<name>` of the global registry, or a git address; `Version` is a version constraint. A stack of the global registry needs a [sync](/docs/api/rigger-registries#sync-a-registry) of the registry `global`. |
| `Files` | A local stack sent as files instead (base64 in JSON): the archive the `rigger` program makes of a stack directory (`Stack.Archive` of the Go library). |
| `Values`, `ValuesJSON` | The values of the variables: a values file (HCL), or the same as one JSON object, a member per variable, as a form sends them (`"ValuesJSON": {"count": 2}`). Both give the same values, so the same release. One of them at most. |
| `Prune` | An apply uninstalls the releases the stack no longer has. |
| `Adopt` | An apply takes over releases that another manager applied or another stack owns. |

The token needs object `write` on `packs.norca.io/Release` in the namespace. For a published stack, and
for a stack sent as files that takes anything from a registry or a bundle, it also needs:

- object `read` on `rigger.norca.io/Registry`;
- **read on the Variable of `authSecret`** of each private registry the stack uses, also when the
  content comes from the cache of the servers or from a bundle.

| Method | Path | Answers |
| --- | --- | --- |
| `PUT`, `POST` | `/v1/rigger/stack/plan` | the plan: the action of each release (`install`, `upgrade`, `unchanged`, `remove`), the values an apply generates, the secrets, the warnings |
| `PUT`, `POST` | `/v1/rigger/stack/status` | the releases the stack owns, their current revision and their drift |
| `PUT`, `POST` | `/v1/rigger/stack/apply` | the operation of the apply, started |
| `PUT`, `POST` | `/v1/rigger/stack/destroy` | the operation of the uninstall of the releases of the stack, started |

```shell-session
$ curl -X PUT -H "X-Nomad-Token: $TOKEN" "https://localhost:4646/v1/rigger/stack/apply?namespace=shop" \
    -d '{"Source": "acme/shop", "Version": "~> 1.2", "Values": "replicas = 3\n"}'
```

## Where the servers fetch from

**The servers fetch only from registered sources.** This holds for each module and part of a stack, also
for a status and a destroy, which load the stack:

| Source | What the servers read |
| --- | --- |
| `builtin/<name>` | The modules built into Rigger. |
| `<namespace>/<name>` | The global registry at its last good sync. |
| A git repository, also `<registry>/<name>` | A registry of the type `git` with that source, at the commit of its last good sync. Its `trustedKeys` hold beside the `trust` of the stack; a repository registered twice is under the keys of both. |
| `./modules/...` of a stack sent as files | The files sent. |
| A [bundle](#bundles-for-a-cluster-without-a-network) | Only the repository, commit and digest the lock file of the stack records. |

Anything else is refused (400), and the error says how to register it. The servers read no `oci://` and
no `dir://` source: the `rigger` program does, on the machine it runs on.

**Hidden paths are no content.** A file or a directory whose name starts with a dot is outside the digest
of a module, so a module can't read it and it can't be the source of a module.

## What is checked before a plan

- **`required_version`** of the stack and of its parts, against the Norca version of the cluster.
- **`requires { module }`** of the modules of the stack: met by a release of the stack at a fitting
  version, or by one installed in the namespace. A requirement with `when` counts only when that
  variable turns it on.
- **The owner of each release.** A stack is the owner by its namespace and name. A plan shows a release
  it would take over (`takes_over`); an apply without `Adopt` is then refused (409) before it starts.

## Read a version of a published stack

| Method | Path | Produces |
| --- | --- | --- |
| `GET` | `/v1/rigger/registry/:name/stack?name=<stack>&version=<constraint>` | `application/json` |

| Blocking Queries | ACL Required |
| --- | --- |
| `NO` | object `read` on `rigger.norca.io/Registry`, and read on the Variable of its `authSecret` |

What a form needs of the newest version of a stack of a synced
[registry](/docs/api/rigger-registries) that meets the constraint. `name` is `<namespace>/<name>` in
the global registry and `<name>` in a registry repository. The version is fetched and verified as an
apply verifies it, its modules included, so the rules of the sources of the request hold also for
modules of other registries.

| Field | Meaning |
| --- | --- |
| `Source` | The address to apply it by: the `Source` of a [request](#the-request), with `Version`. `<namespace>/<name>` of the global registry, `<repository>//stacks/<name>` of a registry repository. |
| `Metadata` | The `stack` block of its `metadata.hcl`: name, version, description, license, category, keywords, requirements. |
| `Readme` | Its `README.md`. |
| `FormSchema` | The JSON Schema of the form of its `variables.hcl`, with the `x-ui-*` hints the web UI reads; the tabs come from the `ui` block of its `metadata.hcl`, as for a module. |
| `Versions` | The versions of the stack at the last sync, the newest first. |
| `Meets`, `Unmet` | Whether the cluster meets the requirements of the version, and what it lacks. |
| `Warnings` | The advisories of the version. |

## Operations

An operation is planned before it starts, so an invalid stack is an error of the call. Then the leader
runs it and records it:

| Status field | Meaning |
| --- | --- |
| `phase` | `Running`, then `Succeeded`, `Failed`, `Cancelled` or `Interrupted`. |
| `plan`, `outcomes` | The action of each release, and what was done to it (the revision, or skipped). |
| `error` | The error of a failed operation. |
| `startedAt`, `finishedAt` | The times. |
| `logSubject`, `logStored`, `logDropped` | Where its log is on the bus, whether it was stored there, and how many records were not. |
| `cancelRequested` | A cancel was asked for. |

- **One operation of a stack at a time.** Another apply or destroy of the same stack is refused
  (409) and names the running one.
- **A cancel stops between two releases**: the release being applied finishes, the rest are skipped,
  the phase is `Cancelled`.
- **The token of the caller lives only in the memory of the leader**, never in the state of the
  cluster. When the leader changes, a running operation can't go on: the new leader marks it
  `Interrupted`. Apply the stack again; the releases already done come back unchanged.
- **The end is written until it is stored.** When that write fails, the leader tries again for up to a
  minute and the stack stays busy meanwhile; after that the operation is marked `Interrupted`.
- **The last 10 operations of a stack are kept**; the leader deletes older finished ones. **The log of
  an operation goes with it**, also of one deleted through the object API: the leader purges it within
  a minute, as it does the log of a start that failed at its plan.

Operations are written by the servers only; they are read (and deleted) with the
[Custom Objects HTTP API](/docs/api/objects): `/v1/objects/rigger.norca.io/Operation?namespace=shop`,
`/v1/object/rigger.norca.io/Operation/<name>?namespace=shop`.

### Cancel an operation

| Method | Path | ACL Required |
| --- | --- | --- |
| `PUT`, `POST` | `/v1/rigger/operation/:name/cancel` | object `write` on `packs.norca.io/Release` in the namespace |

An operation that has ended can't be cancelled (409).

### Read the log of an operation

| Method | Path | ACL Required |
| --- | --- | --- |
| `GET` | `/v1/rigger/operation/:name/log` | object `read` on `rigger.norca.io/Operation` in the namespace |

**The full log of an operation is in a stream of the [system bus](/docs/configuration/bus)**, a
subject per operation, every record of Rigger at every level: what it fetched, verified, evaluated
and applied, as a tree of operations. It is followed while the operation runs and read in full
afterwards; it is kept within `bus.rigger_logs_max_bytes` and `bus.rigger_logs_max_age`. A server
without the bus keeps the log only in its own log. **Only the servers write these subjects, and they
are read through this endpoint only**: a [bus rule](/docs/other-specifications/acl-policy#bus-rules)
reaches neither side of `norca.rigger.oplog.>`, so no token writes into the log of an operation or
reads it past the right to read operations.

| Parameter | Meaning |
| --- | --- |
| `after` | The sequence of the last record read; the records after it. |
| `limit` | At most this many records (default 500, at most 1000). |
| `wait` | How long to wait for the first record (`10s`, at most `30s`). |

```json
{
  "Lines": [
    {"Seq": 41, "Line": {"time": "2026-11-22T12:00:01Z", "level": "INFO", "msg": "started", "op": "release.apply", "release": "db"}}
  ],
  "Phase": "Running",
  "Finished": false
}
```

To follow a running operation, read again with `after` set to the last `Seq` and a `wait`, until
`Finished` is true: the operation has ended and the page holds the rest of its log. **A full page
(`limit` records) is never `Finished`**, and neither is the page during which the operation ended when
it has records; read on. A wait ends with the first records, or within a second of the end of the
operation. Durations and times in the records are text (`"1.8ms"`).

**When the log can't be read** (a server without the bus), the answer is still 200: it has no lines,
the reason in `LogUnavailable`, and the phase, which a wait follows. `Finished` is then true once the
operation has ended.

## Bundles for a cluster without a network

A cluster that can't reach the git repositories of its modules installs them from a **bundle**: the
archive `rigger bundle create` makes of the modules of a stack, as its lock file pins them. **A bundle
imported into the cluster is kept in an object store of the [system bus](/docs/configuration/bus)**,
replicated between the servers, within `bus.rigger_bundles_max_bytes`:

- **The server checks a bundle when it is imported**: each module and each stack of a part must have
  the digest its manifest names. A bundle is at most 64 MiB, has at most 1000 modules, and unpacks to
  at most 512 MiB, counted with a tree for each module.
- **The leader unpacks the bundles its cache lacks before it plans or applies anything**, so a bundle
  outlives a change of leader.
- **A bundle serves only what the lock file of the stack pins**: the repository, commit and digest. A
  synced registry that offers the version comes first. The stack must be synced (`rigger stack sync`)
  before its bundle is made.
- **A bundle needs no registered source**, but its use needs object `read` on
  `rigger.norca.io/Registry`, and read on the Variable when its repository is that of a private
  registry.
- **A module of the global registry installs from a bundle without the index.** The keys of its
  namespace come with the index, so then the digest of the lock file and the `trust` of the stack are
  what is checked.
- **A release with content that only a bundle vouches for is admitted as a client's**
  (`serverRendered` is false).

| Method | Path | Answers | ACL Required |
| --- | --- | --- | --- |
| `PUT`, `POST` | `/v1/rigger/bundle` | the bundle, kept (the body is the archive) | object `write` on `rigger.norca.io/Registry` |
| `GET` | `/v1/rigger/bundles` | the bundles: name, stack, modules, size, time of the import | object `read` on `rigger.norca.io/Registry` |
| `DELETE` | `/v1/rigger/bundle/:name` | | object `write` on `rigger.norca.io/Registry` |

```shell-session
$ curl -X PUT -H "X-Nomad-Token: $TOKEN" --data-binary @shop.riggerbundle https://localhost:4646/v1/rigger/bundle
{"Name": "bundle-87267ca88bfae93bc3fc1a665c12e614", "Stack": "shop", "Modules": ["git.example.com/acme/modules//modules/web 1.0.0"], "Size": 544, "Imported": "2026-11-22T14:04:19Z"}
```

The same bundle imported again keeps its name. A deleted bundle stays in the caches of the servers it
was unpacked into until they are cleared.

## From the command line

The `rigger` program and `norca rigger` evaluate a stack on the machine they run on, unless they are
given **`-server`** (or `RIGGER_SERVER=1`): then `stack plan`, `apply`, `status` and `destroy`,
`install` and `bundle import` go to the servers of `NORCA_ADDR`, which fetch and evaluate. The other
commands work locally: `RIGGER_SERVER` doesn't apply to them, and a `-server` given to them is an
error.

- A stack in a directory is sent as files, in its own namespace and region; a published stack names
  its namespace with `-namespace`. The values of `-f` and `-var` are sent as a values file.
- **An apply or a destroy follows the log of its operation** as it comes, then writes what it did.
  Where the log can't be read it says so and follows the phase.
- **Ctrl-C cancels the operation** before its next release and waits for its end; **a second Ctrl-C
  leaves it running**. `rigger operation follow <name>`, `cancel` and `status` reach it again.

```shell-session
$ rigger bundle import shop.riggerbundle -server
$ rigger stack apply ./shop -server -var replicas=3
operation shop-20261122-140938-a847 of the stack shop in default
  install default/db
  install default/web
...
install default/db: done (revision 1)
install default/web: done (revision 1)
```
