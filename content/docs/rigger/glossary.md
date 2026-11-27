---
title: "Glossary and FAQ"
linkTitle: "Glossary and FAQ"
weight: 16
description: "The terms of Rigger (module, stack, release, revision, registry, index, namespace, source, lock file, tree digest, signature, key, trust, bundle, operation, part, hook, drift, owner) and answers to common questions."
---

## Glossary

**Module**
: A package: a directory of HCL files with variables, resources (jobs, namespaces, quotas, ACL
  policies, Variables, object kinds, admission policies, external services, custom objects), outputs and
  tests. Files are named after what they hold. See [module language](/docs/rigger/module-language).

**Library module**
: A module with `library = true`: it has no resources and only computes values for the modules that call
  it as a child module (`lib/placement` of the Norca registry).

**Child module**
: A module called from `modules.hcl` of another module, by a relative path; its resources are part of
  the caller's release.

**Stack**
: A directory with `stack.hcl`: the modules of a region with their values, wired through their outputs,
  their versions pinned in a lock file. A stack owns the releases it installs. See
  [stack language](/docs/rigger/stack-language).

**Published stack**
: A stack with a `metadata.hcl` (a `stack` block): versioned, signed and tagged like a module, applied by
  its source or taken as a part.

**Part**
: A published stack taken into another stack with a `stack` block. Its releases are named
  `<part>-<release>`; its outputs are `stack.<part>.<output>`.

**Release**
: One install of a module: an object of the kind `rigger.norca.io/Release` in a namespace, applied by the
  servers through the release API. See [releases on the servers](/docs/rigger/releases).

**Revision**
: An immutable record of one install, upgrade or rollback of a release (`rigger.norca.io/ReleaseRevision`,
  `<release>.<n>`): the rendered resources, the values, the digest. A rollback applies the content of an
  old revision as a new one.

**Owner**
: The stack that owns a release, by its namespace and name (`spec.owner`). Another stack or manager
  takes the release over only with `--adopt`.

**Hook**
: A batch job of a module with a `hook` block, run at a phase of a release: `pre-install`,
  `post-install`, `pre-upgrade`, `post-upgrade`, `pre-delete`, `post-delete`, or `test`.

**Drift**
: A resource of a release that was changed or deleted outside the release. Detected, reported (the
  `Drifted` condition), never corrected on its own.

**Atomic**
: An install or upgrade that restores what it changed when a step fails. On by `atomic = true`, or in a
  production namespace.

**Operation**
: An apply or a destroy of a stack that the servers run on the leader (`rigger.norca.io/Operation`), with
  its log on the system bus. Cancelled between two releases.

**Source**
: Where a module or stack comes from, as written in a stack: `<namespace>/<name>`, `<registry>/<name>`, a
  git address, `oci://...`, `builtin/<name>`, `./modules/<name>`. See [registries and sources](/docs/rigger/registries).

**Registry**
: A place that lists versions of modules and stacks: the global registry (an index), or a registry
  repository (git, with `modules/` and `stacks/`).

**Global registry, index**
: [norca-global-registry](https://github.com/bacanoo-io/norca-global-registry): JSON entries that name,
  for each listed version, its repository, tag, commit, tree digest and signatures. It holds no code.
  `<namespace>/<name>` in a stack is a module of it.

**Namespace (of a registry)**
: The first part of `<namespace>/<name>` in the global registry: an owner with its repositories and its
  signing keys (`norca` is the official one). Not the same as a Norca namespace, where a release is
  installed.

**Advisory**
: An entry of `advisories.json` of the global registry: a warning shown for a version, or a block that
  refuses it.

**Registry of the cluster**
: An object of the kind `rigger.norca.io/Registry` that the servers read, at its last sync. `global` is
  created by the servers.

**Norca registry**
: [bacanoo-io/norca-registry](https://github.com/bacanoo-io/norca-registry), the registry repository of
  the operations modules of a Norca cluster, listed as `norca/<name>`. See [Norca registry](/docs/rigger/norca-registry).

**Built-in module**
: A module shipped inside Rigger, `builtin/<name>`, of one version (`builtin/redis`).

**Version, tag**
: A strict semver version; in git, the tag `<name>/v<version>` (or `v<version>`), never moved.

**Constraint**
: Which versions are acceptable: `~> 1.2`, `>= 1.2.0, < 2.0.0`. See [versions](/docs/rigger/versions).

**Lock file**
: `rigger.lock.hcl` of a stack, written by `rigger stack sync`: the version, commit, tree digest and
  signers of each module of a source.

**Tree digest**
: `sha256:` over the files of a module (and its child modules), one line per file, hidden files left
  out. What a signature signs and a lock file pins.

**Key, key ID**
: A cosign-format ECDSA P-256 key pair (`rigger key generate`). The key ID is `sha256:` of the DER
  encoding of the public key.

**Signature, signer**
: A file `.rigger-signatures/<key ID>.json` in a module: a signature of its tree digest. The signers are
  the trusted keys whose signatures verified.

**Trust**
: The `trust` block of a stack (keys per registry), the `trustedKeys` of a registry of the cluster, the
  `trusted_keys` of an admission policy: who must have signed.

**Bundle**
: An archive (`.riggerbundle`) of the modules of a stack as its lock file pins them, for a network that
  can't reach their sources.

**Generated value**
: `"!generate:<name>"`: a random value a stack makes at its first apply and keeps in the secret store.

**Runtime reference**
: A value that exists only on the node, written with `runtime`, `runtime_env`, `secret_ref`,
  `variable_ref`, `service_address` or `service_addresses`, and resolved when the task starts.

**Server-rendered**
: A release whose module the servers fetched and evaluated themselves (`--server`, the install API, the
  catalog). Admission sees it as `release.pack.serverRendered`.

## FAQ

**Is `rigger` the same as `norca rigger`?**
: Yes, the same commands. The standalone program also has `generate examples`, `operator init` and
  `completion`. Under `norca`, `rigger version` says `(built into Norca <version>)`.

**Does Rigger write jobs and policies behind the API?**
: No. Every resource goes through the release API with the caller's token: ACLs, quotas and admission
  hold as for a `norca job run`.

**Where do modules come from when I write `norca/nats`?**
: From the global registry, which points to the tag and commit of `modules/nats` in
  `bacanoo-io/norca-registry`. The program fetches it there; the servers after `rigger registry sync
  global`.

**Why does the web UI not offer the newest version?**
: The servers read a registry at its last sync. Sync it (**Sync** on the Registries tab, or
  `rigger registry sync <name>`).

**Should I commit `rigger.lock.hcl`?**
: Yes. It is what makes every machine and the servers install the same thing.

**How do I upgrade a module of a stack?**
: Within the constraint: `rigger stack sync --upgrade`, then `rigger stack apply`. To a new major
  version: change the constraint, sync, apply. See [upgrading](/docs/rigger/versions#upgrading).

**Does `~> 0.2` stay on 0.2.x?**
: No: two parts mean "up to the next major", so `~> 0.2` takes `0.9.0` too. Write `~> 0.2.0` for 0.2.x.

**Can I install a module without a stack?**
: Yes: `rigger install <dir or source> --name <release>`. Upgrade it with the same command and name.

**What happens to the releases when I remove a module block from a stack?**
: Nothing, unless you apply with `--prune`, which uninstalls the releases the stack owns and no longer has.
  `enabled = false` keeps an installed release as it is.

**How do I keep a password out of the release history?**
: Mark the variable `sensitive = true` and put it only into an item of a Variable resource; or let the
  job read it from the secret store with `secret_ref()` (a stack can generate it with `!generate:`).

**Can the servers install from my private git host?**
: Yes: register it as a registry of the cluster with an `authSecret` that names a Variable with the
  credentials, and sync it.

**Can I use Rigger without Internet access?**
: Yes: bundles, a mirror of the global registry, a checkout of a registry, or built-in modules. See
  [offline use](/docs/rigger/troubleshooting#offline-use).

**Is a release installed in every region?**
: No: in one region. A stack is applied in the region its `rigger` block names; for several regions,
  apply a stack per region.

**Is keyless signing supported?**
: No, signatures are made with keys.
