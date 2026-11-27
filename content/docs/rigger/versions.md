---
title: "Versions, constraints and lock files"
linkTitle: "Versions and lock files"
weight: 7
description: "How Rigger versions modules and stacks: strict semver versions as git tags, version constraints and the exact meaning of ~>, pre-releases, the lock file of a stack and what is checked against it, upgrading, and the versions of the global registry."
---

## Versions

**A version is strict semver**: `MAJOR.MINOR.PATCH`, optionally with a pre-release (`1.2.0-rc.1`) and
build metadata (`1.2.0+build.5`). Numbers have no leading zeros. The `version` of `metadata.hcl` is
written without a `v` (`1.2.0`, not `v1.2.0` or `1.2`).

- **Precedence** is that of semver: `1.2.0-rc.1` < `1.2.0` < `1.2.1` < `1.10.0`. A pre-release is
  lower than its release; build metadata is ignored when versions are compared.
- **A version of a registry repository is a git tag**: `<name>/v<version>` for a module in
  `modules/<name>` (or a stack in `stacks/<name>`), `v<version>` for a repository of one module at its
  root. `rigger module publish` and `rigger stack publish` make the tag from the version of the
  metadata; the tag must name the version the metadata says.
- **A tag is never moved.** A changed module is a new version; `rigger module publish` refuses a
  version that is tagged already ("the version is tagged already; a tag is never moved, publish a
  new version").
- **The global registry lists a version once and never changes it.** A faulty version gets a warning
  or, in four cases (malicious code, exposed secrets, a compromised key, a legal requirement), is
  blocked; it is answered by a newer version.
- A built-in module (`builtin/<name>`) has the one version the program or the servers ship.

## Constraints

A constraint is one or more conditions separated by commas; a version must meet all of them:

```hcl
version = "~> 1.2"
version = ">= 1.2.0, < 1.5.0"
version = ">= 0.3, != 0.3.4"
```

| Operator | Meaning |
| --- | --- |
| `= 1.2.0` or `1.2.0` | Exactly this version. |
| `!= 1.2.0` | Any version but this one. |
| `> 1.2.0`, `>= 1.2.0` | Newer than, or at least. |
| `< 2.0.0`, `<= 1.9.0` | Older than, or at most. |
| `~> 1.2`, `~> 1.2.3` | At least this version, below the next major (two parts) or the next minor (three parts). |

**A partial version** (`1`, `1.2`) is filled with zeros, and is allowed only with `~>`, `>=`, `<` and
`=`.

### `~>` exactly {#tilde-arrow-exactly}

`~>` takes the version given as the lower bound. The upper bound depends on **how many parts are
written**:

- **One or two parts: up to the next major.** `~> X.Y` is `>= X.Y.0, < (X+1).0.0`.
- **Three parts: up to the next minor.** `~> X.Y.Z` is `>= X.Y.Z, < X.(Y+1).0`.

| Constraint | Meets | Does not meet |
| --- | --- | --- |
| `~> 1.2` | `1.2.0`, `1.2.7`, `1.9.0` | `1.1.9`, `2.0.0` |
| `~> 1.2.3` | `1.2.3`, `1.2.9` | `1.2.2`, `1.3.0` |
| `~> 1` | `1.0.0`, `1.9.0` | `2.0.0` |
| `~> 0.2` | `0.2.0`, `0.2.5`, **`0.3.0`**, `0.9.1` | `0.1.9`, `1.0.0` |
| `~> 0.2.0` | `0.2.0`, `0.2.5` | `0.3.0` |

> [!IMPORTANT]
> **For a `0.x` module, `~> 0.2` takes `0.3.0` too**: two parts always mean "up to the next major".
> A module of the [Norca registry](/docs/rigger/norca-registry) raises its minor version for a
> change that breaks a running install while its major version is 0. Pin such a module with three
> parts (`~> 0.2.0`) to stay on one minor version.

### Pre-releases

**A pre-release is taken only when the constraint asks for one**: when one of its conditions (other
than `!=`) names a pre-release. `>= 1.0.0` never takes `1.1.0-rc.1`; `>= 1.1.0-rc.1` does.

An upper bound keeps out the pre-releases of its own version: `< 2.0.0` does not take `2.0.0-rc.1`.

### Which version is taken

The **newest version that meets the constraint** and is not blocked by the global registry. Without a
constraint (no `version`, no `--version`), the newest release (no pre-release). When none meets it:
`no version meets the constraint "~> 3.0"`.

## The lock file

`rigger stack sync` resolves every module and part of a stack that comes from a source and writes
`rigger.lock.hcl` next to `stack.hcl`: the version, the constraint, the repository, the path, the tag,
the commit, the tree digest and the signers (see the [format](/docs/rigger/stack-language#the-lock-file)).
**Commit it with the stack.** Every other command (`validate`, `plan`, `apply`, `status`, `destroy`,
`publish`, `bundle create`, and the servers) installs exactly what it names.

What is checked against it, and the error when it does not hold:

| Check | Error |
| --- | --- |
| Every module of a source has an entry. | `<source> has no entry in rigger.lock.hcl; run rigger stack sync.` |
| The locked version meets the constraint of the stack. | "Lock file out of date": `the locked version 1.0.0 does not meet "~> 2.0"; run rigger stack sync.` |
| The tag still points to the locked commit. | `the tag points to another commit than the lock file records` |
| The content has the locked tree digest. | `the content of <source> <version> is not what the lock file records (<locked>, now <digest>)` |
| A locked signer still verifies. | `<source> <version>: the lock file records a signature of <key ID>, which no longer verifies; run rigger stack sync` |
| A built-in module is still of the locked version. | `builtin/redis is version 0.4.2 in this program, not 0.4.1: a lock file that records 0.4.1 is written again with rigger stack sync --upgrade` |

**A moved tag or other content is refused, never taken.** A version that the lock file pins is
fetched at its commit; when its source can't be reached, the copy in the cache (or a
[bundle](/docs/rigger/registries#bundles)) serves it, verified against the same digest. A refusal is
never answered from the cache.

## Upgrading

```shell
rigger stack sync                  # keep the locked versions; add entries for new modules
rigger stack sync --upgrade        # take the newest version that meets each constraint
git diff rigger.lock.hcl           # what changes
rigger stack plan                  # which releases would be upgraded
rigger stack apply
```

- To move to a new major (or, for `0.x`, minor) version, change the constraint in `stack.hcl`, then
  sync.
- **The servers move only with a sync of their registry.** A stack applied with `--server`, the
  install API and the catalog read a registry of the cluster at its last sync; a newer version is not
  offered until `rigger registry sync <name>`. The version a stack installs is still the one its lock
  file names.
- **One release without a stack** is upgraded by installing it again with the same `--name`:
  `rigger install norca/nats --version "~> 2.0" --name nats` takes the newest version that meets the
  constraint now.

## The versions of the global registry

`rigger show <namespace>/<name>` lists every version, newest first, with its signers; `rigger search`
shows the newest. A version listed with a warning (an advisory) is installed with that warning shown
by `stack sync`, `stack plan`, `show` and `install`; a blocked version fails with its reason. See
[registries and sources](/docs/rigger/registries#the-global-registry).
