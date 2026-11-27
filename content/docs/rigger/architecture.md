---
title: "How Rigger fits together"
linkTitle: "How it fits together"
weight: 1
description: "The parts of Rigger and how they build on each other: the rigger program and norca rigger, Rigger on the servers, the global registry, the Norca registry and other registries, modules, stacks, releases and the objects a release creates."
---

Rigger has four layers: **where modules come from**, **who fetches and evaluates them**, **what is
installed**, and **the objects an install creates**.

![The parts of Rigger: sources, who evaluates, what is installed, the objects of a release](../images/rigger-overview.svg)

## Sources: where modules and stacks come from

A module or a stack is named by its **source** (see [registries and sources](/docs/rigger/registries)
for every form):

- **The global registry** is an index, the git repository
  [norca-global-registry](https://github.com/bacanoo-io/norca-global-registry). It holds no code: for
  each listed version of a module or stack it names the repository, tag and commit of its author,
  its tree digest and its signatures. It also holds the namespaces, their signing keys and the
  advisories (warnings and blocked versions). `source = "norca/nats"` is the module `nats` of the
  namespace `norca` there.
- **Registry repositories** are git repositories with `modules/<name>` and `stacks/<name>`
  directories; a version is the tag `<name>/v<version>` (`v<version>` in a repository of one
  module). The [Norca registry](/docs/rigger/norca-registry),
  [bacanoo-io/norca-registry](https://github.com/bacanoo-io/norca-registry), is such a repository:
  the operations modules of a Norca cluster, listed in the global registry as `norca/<name>`. A
  repository of your own works the same way, listed in the global registry or not.
- **Other sources:** `oci://<host>/<repository>` (an OCI registry, tagged by version), a directory,
  `builtin/<name>` (a module built into Rigger), and **bundles**, archives that carry the modules
  of a stack into a network that can't reach their repositories.

## Who fetches, verifies and evaluates

**Rigger evaluates a module into a list of resources** (jobs, policies, Variables, ...) with the
metadata of the module (name, version, source, commit, digest, signatures, requirements). That
happens in one of two places:

| | The `rigger` program, `norca rigger` | Rigger on the servers |
| --- | --- | --- |
| When | By default | `--server` (or `RIGGER_SERVER=1`), the [install API](/docs/api/rigger-install), the [stacks API](/docs/api/rigger-stacks), the catalog of the web UI, the deployer's `mode: embedded` |
| Reads | Every kind of source, on the machine it runs on | Only registered sources: the [registries of the cluster](/docs/api/rigger-registries) at their last sync (`global` among them), built-in modules, imported bundles, and the files the program sends |
| Credentials | Its own user's: [`rigger login`](/docs/commands/rigger/login), `RIGGER_GIT_*`, `RIGGER_OCI_*`, the ssh agent | The Variable that the `authSecret` of a registry names, used only for a caller who may read it |
| Cache | `RIGGER_CACHE_DIR`, else `rigger` in the user's cache directory | `<data_dir>/server/rigger/cache` of each server, bounded by the [`rigger` block](/docs/configuration/rigger) |
| A stack apply | Release after release, the program waits for each | An [operation](/docs/api/rigger-stacks#operations) on the leader, with its log on the system bus |
| The release is admitted as | rendered by a client | rendered by the servers (`serverRendered`), unless only a bundle vouches for its content |

**Either way the resources go through the [release API](/docs/api/releases) with the caller's
token.** Admission, quotas and ACLs hold for every resource, and the servers record the release.
Rigger never writes a job or a policy behind the release API's back.

`norca rigger` and the `rigger` program are one command tree: `norca rigger stack apply` and
`rigger stack apply` do the same. The program also has `rigger generate examples`,
`rigger operator init` and `rigger completion`, which `norca rigger` does not have.

## What is installed

- **A module** is installed as **one release**: `norca rigger install <dir|source> --name <release>`,
  or one `module` block of a stack. Installing it again with other values or another version is an
  upgrade of the same release.
- **A stack** installs **one release per `module` block**, in the order of their references, and
  **owns** them: it upgrades them on the next apply, removes those it no longer has with
  `--prune`, and uninstalls them all with `stack destroy`.
- **A release** is an object of the kind `rigger.norca.io/Release` in the namespace of the install,
  with an immutable revision per install, upgrade or rollback
  (`rigger.norca.io/ReleaseRevision`, named `<release>.<n>`). See
  [releases on the servers](/docs/rigger/releases).

## The objects of a release

A release applies its resources in a fixed order and deletes them in the reverse order:

| Order | File of a module | Object |
| --- | --- | --- |
| 1 | `<name>.quota.hcl` | Quota |
| 2 | `<name>.namespace.hcl` | Namespace |
| 3 | `<name>.acl.hcl` | ACL policy |
| 4 | `<name>.var.hcl` | Variable |
| 5 | `<name>.kind.hcl` | Object kind |
| 6 | `<name>.admission.hcl` | Admission policy |
| 7 | `<name>.external.hcl` | External service |
| 8 | `<name>.object.hcl` | Custom object |
| 9 | `<name>.norca.hcl` | Job (hook jobs too, at their phase) |

Jobs carry the marks of their release (`pack.release`, `pack.release_namespace`), custom objects an
owner reference to it; a release deletes what it owns itself. One module can therefore install an
application with its namespace and policies, or an operator with its object kind, its controller
and the ACL policy bound to it.

## Two paths through the same stack

```shell
# The program evaluates; the servers apply what it sends.
norca rigger stack apply ./platform -f values/prod.vars.hcl

# The program sends the stack; the leader fetches, evaluates and applies it as an operation.
norca rigger stack apply ./platform -f values/prod.vars.hcl --server
```

Both read the same lock file and give the same releases. The second needs every source of the
stack registered in the cluster and synced (or a bundle), and follows the log of the operation;
Ctrl-C cancels it before its next release. See [lifecycle](/docs/rigger/lifecycle) for when to
choose which.
