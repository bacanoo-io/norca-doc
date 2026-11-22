---
title: "Rigger Registries HTTP API"
linkTitle: "Rigger Registries"
description: "Registries of Rigger, the package manager: objects of the kind rigger.norca.io/Registry, synced when someone asks for it, and searched at the commit of their last sync."
---

A registry of **Rigger**, the package manager of Norca, lists modules and stacks: the **global
registry** (`github.com/bacanoo-io/norca-global-registry`, or a mirror of it) or a **registry
repository** of your own (a git repository with `modules/<name>` and `stacks/<name>`, versions tagged
`<name>/v<version>`). The Go client is `client.Rigger()` in `github.com/bacanoo-io/norca/norca/api`; the
command line is `rigger registry`, also as `norca rigger registry`.

**A registry is synced only when someone asks for it.** Nothing syncs on a schedule. A sync fetches
the **index** of the registry: the entries of the global registry, or the modules, stacks and tags of a
registry repository. The source of a module version is fetched only when it is installed. Searches and
installs read the registry **at the commit of its last good sync**, and a version that is newer than
that commit is not offered until the next sync. A registry that was never synced offers nothing.

## The object

Registries are cluster-scoped objects of the built-in kind `rigger.norca.io/Registry`. They are read and
written with the [Custom Objects HTTP API](/docs/api/objects) (`/v1/objects/rigger.norca.io/Registry`,
`/v1/object/rigger.norca.io/Registry/<name>`). Their **status is written by the servers** at a sync; a
write of the status through the object API is refused.

```hcl
kind  = "rigger.norca.io/Registry"
name  = "acme"
spec {
  type    = "git"
  source  = "https://git.example.com/acme/rigger-modules"
  display = "catalog"

  authSecret {
    namespace = "default"
    path      = "registries/acme"
  }
}
```

| Field | Meaning |
| --- | --- |
| `type` | `global` (only the registry named `global`) or `git` (a registry repository). |
| `source` | The git address of the registry. |
| `trustedKeys` | Public keys that the signatures of its versions are checked with at an install. |
| `authSecret` | The Variable with the credentials of a private source: `username` and `password` (or `token`) for https; `ssh_private_key` and `known_hosts` (and optionally `ssh_user`, `ssh_key_passphrase`) for ssh. **Whoever writes the registry must be able to read the Variable**, so that someone who may only write registries can't send the credentials of others to a source of their choosing. |
| `display` | How the web UI shows the registry: `catalog` (default) shows every module and stack; `selected` shows only those in `selected`. |
| `selected` | The modules and stacks shown with `display = "selected"`: `{ kind = "module" \| "stack", namespace, name }`. A module of the global registry has a namespace; one of a registry repository has none. |

**The selection only changes what the UI shows.** A module or stack that is not selected is still found
by a search and still installs from the command line and from stacks.

**The UI reads the status, so it changes only with a sync.** A sync resolves the selection against the
index and writes what it found into the status (`shown`, with the versions) and what the index lacks
(`missing`). A changed selection is shown after the next sync.

The servers create the registry **`global`** (type `global`, `display = "selected"`) when it is missing;
it is not synced until someone asks for it. Point its `source` at a mirror for a closed network.

### Status

| Field | Meaning |
| --- | --- |
| `phase` | `Ready` after a good sync, `Error` after a failed one; empty for a registry never synced. |
| `message` | The error of a failed sync. |
| `lastSyncedAt`, `lastGoodSyncAt` | The last sync and the last good one. |
| `source`, `commit` | The source and commit of the last good sync: what searches and installs read. **A failed sync keeps them.** |
| `modules`, `stacks` | How many the last good sync found. |
| `shown`, `missing` | With `display = "selected"`: the selected modules and stacks the sync found, with their versions, and those it did not. |

## Sync a registry

| Method | Path | Produces |
| --- | --- | --- |
| `PUT` or `POST` | `/v1/rigger/registry/:name/sync` | `application/json` |

| Blocking Queries | ACL Required |
| --- | --- |
| `NO` | object `write` on `rigger.norca.io/Registry` |

The sync runs on the leader: it fetches the source now, checks the index (an invalid entry of the global
registry fails the sync and names its file), resolves the selection and writes the status. A failed sync
is an error of the call and is recorded in the status and in the event log of the object
(`SyncFailed`); a good one is recorded as `Synced`.

```shell-session
$ curl -X PUT -H "X-Nomad-Token: $TOKEN" https://localhost:4646/v1/rigger/registry/acme/sync
```

```json
{
  "name": "acme",
  "spec": {"type": "git", "source": "https://git.example.com/acme/rigger-modules", "display": "catalog"},
  "status": {
    "phase": "Ready",
    "lastSyncedAt": "2026-11-22T10:00:00Z",
    "lastGoodSyncAt": "2026-11-22T10:00:00Z",
    "source": "https://git.example.com/acme/rigger-modules",
    "commit": "fedcba9876543210fedcba9876543210fedcba98",
    "modules": 3,
    "stacks": 1
  }
}
```

## Search a registry

| Method | Path | Produces |
| --- | --- | --- |
| `GET` | `/v1/rigger/registry/:name/search` | `application/json` |

| Blocking Queries | ACL Required |
| --- | --- |
| `NO` | object `read` on `rigger.norca.io/Registry` |

Returns a page of the modules and stacks of the registry at the commit of its last good sync, modules
first, by namespace and name, the versions the newest first. The display of the registry does not
matter: a search finds everything. A registry never synced is an error (409) that names the sync
command.

| Parameter | Meaning |
| --- | --- |
| `kind` | `module` or `stack`; both when empty. |
| `text` | Found in `<namespace>/<name>`, case-insensitively. |
| `offset`, `limit` | The page: `limit` 50 by default, at most 500. |

```shell-session
$ curl -H "X-Nomad-Token: $TOKEN" "https://localhost:4646/v1/rigger/registry/global/search?kind=module&text=nats"
```

```json
{
  "Items": [{"kind": "module", "namespace": "norca", "name": "nats", "versions": ["1.1.0", "1.0.0"]}],
  "Total": 1,
  "Commit": "0123456789abcdef0123456789abcdef01234567"
}
```

## ACL

The capabilities are object capabilities of the kind, in the namespace `*` (the kind is cluster-scoped):

```hcl
namespace "*" {
  object "rigger.norca.io/Registry" {
    capabilities = ["read", "write"]
  }
}
```

`read` lists, reads and searches registries; `write` writes them, syncs them and changes their
selection.

## Command line

```shell-session
$ rigger registry list
$ rigger registry status global
$ rigger registry sync global
$ rigger registry search global nats -kind module
$ rigger registry select global module norca/nats
$ rigger registry unselect global module norca/nats
```

`select` and `unselect` write the selection with a check-and-set on the registry as they read it; the
UI shows the change after the next `rigger registry sync`. The cluster is that of `NORCA_ADDR` and
`NORCA_TOKEN`.
