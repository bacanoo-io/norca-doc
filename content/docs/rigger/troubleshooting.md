---
title: "Troubleshooting"
linkTitle: "Troubleshooting"
weight: 15
description: "The common errors of Rigger with their messages and what to do: registries not synced, sources the servers don't read, lock files, signatures, versions, ownership, permissions, requirements, values, publishing; how to see more; and using Rigger without a network."
---

**Read the log first.** The commands log to standard error as a tree of operations (what was fetched,
verified, evaluated and applied). `--log-level debug` shows every step; `--log-format json` writes it
for a machine. An apply on the servers keeps its full log with its operation:
`norca rigger operation follow <name>`, or the stack's page in the web UI.

## Registries and sources

**`the registry "global" has not been synced: sync it first (rigger registry sync global)`**
: The servers read a registry only as they last synced it, and nothing syncs on its own. Run
  `norca rigger registry sync global` (or the registry named) in the region. The deployer does it with
  `rigger.sync_registries`.

**`<source>: the servers fetch only from registered sources, and <repository> is none: register it (...) and sync it (rigger registry sync <name>), or import a bundle of the stack`**
: A stack applied with `--server` names a git repository the cluster doesn't know. Register it as a
  registry of the cluster (an object of `rigger.norca.io/Registry`, type `git`) and sync it, import a
  bundle of the stack, or apply without `--server`.

**`the servers fetch modules only from the registries of the cluster they have synced (rigger registry sync <name>) and their built-in modules: install a module of a registered repository with --registry <name>, or install without --server`**
: `rigger install <git or oci address> --server`. Use `--registry <name>` with the name of the module
  in a registered repository, or install without `--server`.

**`<source> of the registry "<name>" at its last sync: ... (rigger registry sync <name> fetches newer versions)`**
: The version is newer than the last sync of the registry. Sync it.

**`the repository of the registry "<name>" needs read on the Variable "<path>" in the namespace "<ns>"`** (403)
: The registry has an `authSecret`. Everyone who uses it, including through a stack or a bundle, needs
  read on that Variable.

**`... credentials in an address: ... an address is not kept secret, the credentials of its host are given apart (rigger login, the credentials of a registry)`**
: Remove the user and password from the address. Use `rigger login <host>`, `RIGGER_GIT_*` /
  `RIGGER_OCI_*`, or the `authSecret` of the registry.

**`the tree of the commit is past a limit of the fetcher`**
: A commit is larger than the fetch limits (on a server: the [`rigger` block](/docs/configuration/rigger)).
  The error names the limit. Raise it on every server and restart them, or keep large files out of the
  repository of modules.

## Lock files and verification

**`<source> has no entry in rigger.lock.hcl; run rigger stack sync.`**
: A module was added to the stack after its last sync. Run `rigger stack sync` and commit the lock file.

**Lock file out of date: `the locked version 1.0.0 does not meet "~> 2.0"; run rigger stack sync.`**
: The constraint changed. `rigger stack sync` takes a version that meets it.

**`the tag points to another commit than the lock file records`**, **`the content of <source> <version> is not what the lock file records (...)`**
: The tag was moved, or the content changed, since the lock was written. **Rigger refuses it on
  purpose.** Find out why the publisher moved the tag; only if the new content is to be trusted, run
  `rigger stack sync` again and review the change of the lock file.

**`<source> <version>: not signed by a key the stack trusts`**
: The `trust` of the stack requires a signature by its `public_keys`, and none verifies. Check the key
  with `rigger key verify <module dir> --key <key.pub>` on a checkout of the tag, or
  `rigger show <source>`, which lists the key IDs that signed it.

**`... the lock file records a signature of <key ID>, which no longer verifies; run rigger stack sync`**
: The trusted keys of the stack changed (a key was rotated or removed). Sync again.

**`... is not signed: only its commit and tree digest are checked`** (a warning)
: A version of a registry repository without signatures. Add `trustedKeys` to the registry of the
  cluster, or a `trust` block with `require_signature = true` to the stack, to refuse it instead.

## Versions

**`no version meets the constraint "~> 3.0"`**
: `rigger show <source>` lists the versions there are. On the servers, sync the registry first.

**`blocked by the global registry`** (with the reason)
: The version was taken out of the global registry (malicious code, exposed secrets, a compromised key,
  a legal requirement). Change the constraint to a version that is not blocked and sync.

**`builtin/redis is version 0.4.2 in this program, not 0.4.1: a lock file that records 0.4.1 is written again with rigger stack sync --upgrade`**
: The program (or the servers) ship another version of a built-in module than the lock file records.

## Releases and stacks

**`release apps/web belongs to the stack apps/other: it is taken over only when asked to (adopt; the flag --adopt)`**
: A release has one owner. Add `--adopt` if the release should move to this stack (or to no stack, for
  `install`); otherwise choose another release name.

**`the stack <stack> has a running operation, <name>: cancel it or wait for its end`** (409)
: One apply or destroy of a stack at a time. `norca rigger operation follow <name>` or
  `operation cancel <name>`.

**`resources of the pack are being written by other operations: namespace "shared" is being written by release "apps/web"`** (409)
: Two releases touch the same resource at the same moment. Run the operation again when the other one
  is over.

**`this server is not the leader, and release operations run on the leader; retry the operation`** (503)
: A leader change. Retry.

**`release "web": the operation was interrupted by a leader change; the new leader marks the release failed`** (503), an operation `Interrupted`
: What was applied so far stays. Apply the stack again (releases already done come back unchanged), or
  upgrade or roll back the release.

**`Permission denied: the token may not write job "web" (namespace "apps"), so it can't be a resource of the release`** (403)
: The token must be allowed to write every resource of the release; nothing was applied. See
  [permissions](/docs/rigger/permissions).

**`the pack requires Norca >= 0.3.0, the servers run 0.2.4`**, **`the pack requires the feature "object-limits", which the servers don't provide`**
: The `requires` block of the module. Upgrade the cluster, or install an older version of the module.

**Required module missing: `The module postgres-demo requires the module example/rustfs >= 0.2.0: the stack has none that fits, and none is deployed in the namespace data. Add or install it.`**
: Add the module to the stack, install it in the namespace first, or turn off the setting its `when`
  names.

**`Unexpected response code: 500 (No path to region)`**
: The stack names no region, so it is of `global`, and the cluster has no region `global`. Set `region`
  in its `rigger` block.

**`the generated values of the stack were written by another run since the plan; plan again`**
: Two applies of the same stack ran at once. Run the apply again.

**A release shows `Drifted`**
: Something changed or deleted one of its resources outside the release. `rigger release status <name>`
  lists them. Upgrade or roll back to apply the release again; drift is never corrected on its own.

**`rigger stack plan` exits with 2**
: There are changes. 0 is no change, 1 an error. A CI job that checks for drift tests for 2.

## Modules and values

**No value for a variable: `The variable "node" has no default; give it a value.`**
: Give it in a values file (`-f`), with `--var`, or with `RIGGER_VAR_node`.

**`var.count must be a number: ...`**, a failed `validation` or `rule`
: The value does not fit the variable; the message names it. `rigger module render -f <values>` checks
  values without a cluster.

**`The module "web" has no variable "replicas".`**
: A value for a variable the module does not have, usually a misspelling; the error suggests the closest
  name.

**`A sensitive value can't be used in ...`**
: A sensitive variable (or a generated value) is used outside an item of a Variable resource. Put it into
  a Variable and let the job read it at run time.

**`...: can be used only in the data of a task template`**
: `secret_ref`, `variable_ref`, `service_address` or `service_addresses` outside a template. Move it into
  the `data` of a `template` block.

**"Unknown file", "Unknown directory", "One resource per file", "Label and file name differ"**
: The files of a module are named after what they hold; see the
  [module language](/docs/rigger/module-language). Plain files go under `files/`.

**"Version of a local source"**
: A `./` module of a stack, or a child module, has no `version`; remove it.

**"Source outside the root"**
: A `../` source leaves the directory the stack or module was loaded from. With the deployer's
  `run_on: server` only the stack directory is copied; keep the modules inside it.

## Publishing

| Message | What to do |
| --- | --- |
| `the module has changes that are not committed` | Commit first: the commit of `HEAD` is what is signed and tagged. |
| `the version is tagged already; a tag is never moved, publish a new version` | Raise the version in `metadata.hcl`. |
| `module publish without --to tags the module in its git repository; it is in none` | `git init` the registry, or publish `--to oci://...`. |
| `RIGGER_KEY_PASSWORD holds the password of the private key; set it (an empty value is a key without a password)` | Set `RIGGER_KEY_PASSWORD`. |
| `a module is published with the version of its metadata; it has none` | Add `version` to the `module` block. |

## Offline use

A network that can't reach GitHub or the git hosts of the modules:

1. **On a machine with access**, sync the stack and make a bundle:

   ```shell
   rigger stack sync ./platform
   rigger bundle create ./platform -o platform.riggerbundle
   ```

2. **Carry the bundle and the stack directory** (with its `rigger.lock.hcl`) into the closed network.
3. **Import the bundle** into the cache of the machine that applies, or into the cluster:

   ```shell
   rigger bundle import platform.riggerbundle            # for the program
   rigger bundle import platform.riggerbundle --server   # for the servers (object write on rigger.norca.io/Registry)
   ```

4. **Apply** as usual: `rigger stack apply ./platform` or `... --server`. The bundle serves exactly what
   the lock file pins; nothing else.

Other ways:

- **A mirror of the global registry**: point the `source` of the cluster's registry `global` at it, and
  `RIGGER_GLOBAL_REGISTRY` of the program. Mirror the repositories of the modules too, and register them.
- **A checkout of a registry**: `rigger install ./norca-registry/modules/rustfs --name rustfs` installs a
  module by its path, without any registry.
- **Built-in modules** (`builtin/<name>`) need no network at all.
