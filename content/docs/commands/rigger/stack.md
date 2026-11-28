---
title: "Command: rigger stack"
linkTitle: "rigger stack"
description: "The rigger stack command syncs, validates, plans, applies, shows, destroys and publishes a stack: the modules of a region with their values."
---

The `rigger stack` command works on a **stack**: a directory with a `stack.hcl` that names modules
with their values. Rigger installs each module as a release, in the region of the stack, and keeps
their versions in the lock file `rigger.lock.hcl`. See [the stack language](/docs/rigger/stack-language).

## Usage

```plaintext
norca rigger stack sync [dir] [--upgrade]
norca rigger stack validate [dir] [-f values] [--var name=value]
norca rigger stack plan [dir] [-f values] [--var name=value] [--json]
norca rigger stack apply [dir] [-f values] [--var name=value] [--prune] [--adopt]
norca rigger stack status [dir] [--json]
norca rigger stack destroy [dir]
norca rigger stack publish [dir] [-f values] [--var name=value] [--key name.key]
```

| Command | What it does |
| --- | --- |
| `stack sync` | Resolves the versions of the modules of the stack, fetches and verifies them, and writes `rigger.lock.hcl`. |
| `stack validate` | Evaluates the stack without a cluster, with each file of `values/` when none is given. |
| `stack plan` | Shows what an apply would change. **The exit code is 2 when there are changes.** |
| `stack apply` | Plans and applies, release after release. |
| `stack status` | Shows the releases of the stack, their revision and their drift. |
| `stack destroy` | Uninstalls the releases of the stack. |
| `stack publish` | Validates a stack with `metadata.hcl` and its lock file (with the values of `-f` and `--var`, or each file of `values/`), signs it, commits the signature and tags the version in its git repository. The tag is not pushed. A stack with a variable without a default is published with `-f`. |

**What a plan shows.** For each release its action (`install`, `upgrade`, `unchanged`, `remove`), and for
an install or an upgrade the servers' dry run of it: each resource that would be created, updated or
deleted. A change the servers would refuse carries a `refused:` line with their reason (a resource the
token may not write, a job with policies the token does not hold, a resource they reject), so a bad
resource is found before any release of the stack is applied. A job that changes shows the fields that
change (`group web: Count: "1" -> "3"`); the values of its `Env` and `Template` are not shown. A new
release whose namespace does not exist yet (the stack creates it, or a stack applied before it does) is
shown as created, without checks, with a warning.

Every command but `sync` and `publish` takes, instead of a directory, a **published stack**:
`<namespace>/<name>` of the global registry or a git address, with `--version`.

With `--server` (or `RIGGER_SERVER=1`), `plan`, `apply`, `status` and `destroy` go to the servers of the
cluster, which fetch and evaluate. An apply or a destroy runs there as an operation whose log the
command follows. **Ctrl-C cancels the operation before its next release; a second Ctrl-C leaves it
running.** See [`rigger operation`](/docs/commands/rigger/operation) and
[the stacks API](/docs/api/rigger-stacks#from-the-command-line).

## Stack Options

- `-f`, `--values`: A file of values of the stack (`values/dev.vars.hcl`). May be given more than once.

- `--var`: A value of the stack, `name=value`. May be given more than once. The value of a string,
  number or bool variable is the text as it is; the value of a list or an object is HCL:
  `'tags=["a", "b"]'`. An environment variable `RIGGER_VAR_<name>` gives a value the same way; a
  `--var` wins over it.

- `--json`: `plan` and `status`: write the plan or the status as JSON.

- `--prune`: `apply`: uninstall the releases the stack owns and no longer has.

- `--adopt`: `apply`: take over releases that another manager applied or another stack owns. Without
  it such an apply is refused.

- `--upgrade`: `sync`: take the newest version that meets each constraint, not the locked one.

- `--version`: A published stack: the version constraint (`"~> 1.2"`). Without it the newest version
  is taken.

- `--key`: `publish`: the private key the version is signed with. Its password is read from
  `RIGGER_KEY_PASSWORD`.

- `--server`: Send the command to the servers of the cluster, which evaluate it. Defaults to
  `RIGGER_SERVER`.

- `--namespace`: With `--server`, or for a published stack: the namespace of the stack. Defaults to
  `NORCA_NAMESPACE`.

- `--region`: The region to talk to. Defaults to the region of the stack.

## Examples

```shell
$ norca rigger stack sync my-stack
$ norca rigger stack plan my-stack -f values/dev.vars.hcl
$ norca rigger stack apply my-stack -f values/dev.vars.hcl
$ norca rigger stack status my-stack
```

A published stack of the global registry:

```shell
$ norca rigger stack plan acme/data-platform --version "~> 1.2" -f my.vars.hcl
```

An apply that the servers run:

```shell
$ norca rigger stack apply ./shop --server --var replicas=3
```
