---
title: "Registries and sources"
linkTitle: "Registries and sources"
weight: 10
description: "Where Rigger takes modules and stacks from: the global registry and its entries, registry repositories, git, OCI, directories and built-in modules, credentials, the registries of a cluster and their sync, searching, the cache, and bundles for a network without access to the sources."
---

## The global registry

`source = "norca/nats"` names the module `nats` of the namespace `norca` of the **global registry**,
[norca-global-registry](https://github.com/bacanoo-io/norca-global-registry), unless the stack has a
`registry "norca"` of its own. The global registry is an **index, not a store**: a git repository of
small JSON files. The code of every module stays in the repository of its author.

```plaintext
modules/<first letter>/<namespace>/<name>.json   the versions of one module
stacks/<first letter>/<namespace>/<name>.json    the versions of one stack
namespaces/<namespace>.json                      the owner and the source repositories
keys/<namespace>/*.pub                           the signing keys of the namespace
advisories.json                                  warnings and blocked versions
```

An entry lists, for each version, where its source is and what it must be:

```json
{
  "namespace": "norca",
  "name": "redis",
  "versions": [
    {
      "version": "0.4.1",
      "repository": "github.com/bacanoo-io/norca-registry",
      "path": "modules/redis",
      "tag": "redis/v0.4.1",
      "commit": "46a83440d526a1e123493b4e73b049cb76db8938",
      "digest": "sha256:a3349212de8fa90b6e70472dceaa6bb2b5852c620ebfb9ed01948f7d12bef6de",
      "signatures": [{ "key_id": "sha256:7a9dfce7...", "signature": "MEQCI..." }],
      "requires": { "norca": ">= 0.1.0", "features": ["releases", "secret-store"] },
      "description": "One Redis server: ...",
      "category": "database",
      "keywords": ["redis", "cache"],
      "license": "BSD-3-Clause",
      "listed": "2026-11-24"
    }
  ]
}
```

- Rigger takes the newest version that meets the constraint and is not blocked, fetches it from the
  repository of its author **at the listed commit**, and **refuses it unless its tree digest is the
  listed one and a key of its namespace signs it.**
- **A listed version never changes**, so a lock file that names it stays valid. A faulty version is
  answered by a newer one, with an advisory on the old one.
- **Advisories** (`advisories.json`) are warnings, shown by `stack sync`, `stack plan`, `show` and
  `install`, or blocks: a blocked version is never taken, and a lock file that names it fails with the
  reason. For example `norca/redis 0.4.0` carries the warning that its server does not start; 0.4.1
  fixes it.
- The global registry fails closed: when its index is reached and can't be read, nothing of it is
  installed.
- **`RIGGER_GLOBAL_REGISTRY`** points the program to another registry of this shape: a git address
  (a mirror) or a directory (a checkout). The servers read the source of their registry `global`.

How a version gets listed: [publishing and signing](/docs/rigger/publishing#getting-listed-in-the-global-registry).

## Registry repositories

A registry repository is a git repository of modules and stacks:

```plaintext
modules/<name>/         a module; tag <name>/v<version>
modules/lib/<name>/     a library module the others call as ../lib/<name> (no tag of its own)
stacks/<name>/          a published stack; tag <name>/v<version>
```

- A stack names it with a `registry` block and its modules as `<registry>/<name>`; without a stack, a
  module of it is `<repository>//modules/<name>` (`rigger show github.com/acme/modules//modules/web`).
- **Its versions are its tags.** A version is read at the commit of its tag, and a child module
  (`../lib/placement`) at the same commit.
- Signed or not: the program installs an unsigned version with a warning; a `trust` block of a stack
  or the `trustedKeys` of a registry of the cluster require signatures.
- A repository of one module keeps the module at its root and tags `v<version>`.

The [Norca registry](/docs/rigger/norca-registry) is one; `rigger generate examples` writes one to start
from.

## All sources

| Source | Example | The program | The servers |
| --- | --- | --- | --- |
| The global registry | `norca/nats` | yes | at the last sync of their registry `global` |
| A registry of the stack | `example/postgres` + `registry "example"` | yes | when a registry of the cluster has that repository, at its last sync |
| A git repository | `github.com/acme/modules//modules/web`, `https://git.example.com/acme/modules//modules/web` | yes | the same: only a registered repository |
| An OCI repository | `oci://registry.example.com/acme/web` | yes | no |
| A directory | `./modules/web` of a stack, `rigger install ./web`, `dir:///srv/modules/web` | yes | only as files sent with the stack or the install |
| A built-in module | `builtin/redis` | yes | yes |
| A bundle | imported with `rigger bundle import` | yes, from the cache | yes, imported into the cluster |

When the servers can't read a source, the request is refused with what to do:

```plaintext
github.com/acme/modules//modules/web: the servers fetch only from registered sources, and github.com/acme/modules is none:
register it (norca object apply of a rigger.norca.io/Registry of the type git with that source) and sync it
(rigger registry sync <name>), or import a bundle of the stack
```

## Git, OCI and credentials in the program

- **Git repositories are read without the `git` program**, so the credential helpers and
  `~/.ssh/config` of git do not apply. An `ssh://` or `user@host:path` repository authenticates with
  the keys of the ssh agent and the known hosts of the user (`SSH_KNOWN_HOSTS`, else
  `~/.ssh/known_hosts`); an https repository with the credentials of its host, else anonymously. A
  repository on the local file system (`file://` or an absolute path) is read where it is.
- **OCI repositories** hold a module as one layer (at most 256 MiB), tagged with its version;
  `rigger module publish --to oci://...` pushes one.
- **An address carries no credentials**: `https://user:token@host/...` is refused, in a stack, a lock
  file, an index entry and a registry of the cluster alike. Addresses are written into lock files and
  release records and shown in errors.
- **A credential goes to its host only, over https** (http on localhost). The program has two places
  for them; the first wins:

  ```shell
  echo "$TOKEN" | rigger login git.example.com --username robot     # kept per host
  export RIGGER_GIT_HOST=git.example.com RIGGER_GIT_USERNAME=robot RIGGER_GIT_PASSWORD="$TOKEN"
  export RIGGER_OCI_HOST=registry.example.com RIGGER_OCI_USERNAME=robot RIGGER_OCI_PASSWORD="$TOKEN"
  ```

  `rigger login` keeps them in `rigger/credentials.json` of the user's configuration directory
  (`RIGGER_CREDENTIALS_FILE` names another file), readable by the user only. A password in the
  environment without its `_HOST` is an error.

## Registries of the cluster

The servers read only what is registered: objects of the kind `rigger.norca.io/Registry`. The servers
create the registry **`global`** (type `global`) on their own; others are written with the object API
or **Add registry** in the web UI:

```hcl {filename="acme-registry.hcl"}
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

```shell
norca object apply acme-registry.hcl
norca rigger registry sync acme
norca rigger registry search acme web --kind module
norca rigger install web --registry acme --name shop --server
```

- **A registry is synced only when someone asks for it** (`rigger registry sync`, **Sync** in the web
  UI, `sync_registries` of the deployer). A sync fetches its index (the entries of the global
  registry; the modules, stacks and tags of a repository) at the newest commit, and records that
  commit. **Searches and installs read the registry at its last good sync**; a newer version is not
  offered until the next one, and a registry never synced offers nothing:

  ```plaintext
  the registry "global" has not been synced: sync it first (rigger registry sync global)
  ```

- **`trustedKeys`** (the PEM texts of public keys): the servers install a version of the registry
  only when one of the keys signs it. They hold beside the `trust` of a stack. Without them an
  unsigned version installs, and the answer warns that it is unsigned.
- **`authSecret`** names the Variable with the credentials of a private repository (`username` and
  `password` or `token` for https; `ssh_private_key` and `known_hosts` for ssh). **Everyone who uses
  the registry needs read on that Variable**, so nobody can borrow the credentials of others.
- **`display = "selected"`** shows only the modules and stacks in `selected` in the web UI catalog
  (`rigger registry select|unselect`); a search and an install still find everything.

The object, its status and the API are described in [Rigger Registries](/docs/api/rigger-registries).

## Finding modules without a cluster

```shell
rigger search                                   # the global registry
rigger search nats --kind module
rigger search --category database --json
rigger search --registry builtin                 # the modules built into the program
rigger search --registry github.com/acme/rigger-modules
rigger show norca/nats --version "~> 2.0" --readme
```

`search` and `show` fetch the registry into the program's cache, as the servers sync one, and never
talk to a cluster. `show` verifies the version it shows as an install would. To search what the
servers synced, use `rigger registry search <registry>`.

## The cache

The program keeps fetched repositories, trees and registries in `RIGGER_CACHE_DIR`, else `rigger` in
the user's cache directory (`~/.cache/rigger` on Linux). **The cache serves a version the lock file
pins when its source can't be reached**, checked against the same digest; it is never used to get
round a refusal. Each server keeps its own cache in `<data_dir>/server/rigger/cache`.

## Bundles

A **bundle** carries the modules of a stack from git sources, as its lock file pins them, into a
network that can't reach their repositories:

```shell
rigger stack sync ./shop                                 # the lock file first
rigger bundle create ./shop -o shop.riggerbundle
rigger bundle inspect shop.riggerbundle
rigger bundle import shop.riggerbundle                   # into the cache of this machine
rigger bundle import shop.riggerbundle --server          # into the cluster, for its servers
```

- **A bundle serves only what a lock file pins**: the repository, the commit and the digest. A synced
  registry that offers the version comes first.
- **On the servers** a bundle is checked when it is imported (each module and stack must have the
  digest its manifest names), kept in an object store of the system bus (within
  `bus.rigger_bundles_max_bytes`), and unpacked by the leader before it plans. At most 64 MiB, 1000
  modules, 512 MiB unpacked.
- **A module of the global registry installs from a bundle without the index.** The keys of its
  namespace come with the index, so then the digest of the lock file and the `trust` of the stack are
  what is checked; the release is admitted as a client's (`serverRendered` is false).
- `GET /v1/rigger/bundles` lists the bundles of the cluster, `DELETE /v1/rigger/bundle/:name` removes one.

See [offline use](/docs/rigger/troubleshooting#offline-use) for a complete closed-network workflow.
