---
title: "Command: rigger"
linkTitle: "rigger"
description: "The rigger command runs Rigger, the package manager of Norca: it installs modules and stacks as releases, and manages registries, keys and bundles."
---

The `rigger` command runs **Rigger**, the package manager of Norca. It installs modules (packages
written in typed HCL) and stacks (several modules with their values) as
[releases](/docs/features/packages/releases). The standalone `rigger` program has the same commands, so
`norca rigger stack apply` and `rigger stack apply` are one command. See
[Package management](/docs/features/packages) for the concepts.

## Usage

Usage: `norca rigger [flags] <command>`

`norca rigger help` prints the commands with their arguments. The following commands are available:

- [`rigger stack`](/docs/commands/rigger/stack) - Sync, validate, plan, apply, show, destroy and publish a stack
- [`rigger install`](/docs/commands/rigger/install) - Install or upgrade one release of a module of a directory
- [`rigger release`](/docs/commands/rigger/release) - List, show, roll back and uninstall releases, without a stack
- [`rigger operation`](/docs/commands/rigger/operation) - Follow, cancel and show an apply or a destroy the servers run
- [`rigger registry`](/docs/commands/rigger/registry) - List, sync and search the registries of the cluster
- [`rigger module`](/docs/commands/rigger/module) - Validate, test, render and publish a module
- [`rigger fmt`](/docs/commands/rigger/fmt) - Format `.hcl` files
- [`rigger key`](/docs/commands/rigger/key) - Generate signing keys, sign and verify
- [`rigger bundle`](/docs/commands/rigger/bundle) - Carry the modules of a stack to a cluster without a network
- [`rigger login`](/docs/commands/rigger/login) - Keep or forget the credentials of a host of git or OCI sources
- [`rigger index`](/docs/commands/rigger/registry-index) - Keep a registry of the shape of the global registry
- `rigger version` - Print the version of Rigger
- `rigger help` - Print the usage

The `rigger` program also has `rigger operator init`, which writes the project of an operator; see
[scaffolding an operator](/docs/features/operator-framework/controllers#scaffolding-an-operator).
`norca rigger` does not have it.

## Flags

These flags come before the command:

- `-log-format`: The format of the log on standard error: `text` (a tree of operations) or `json`.
  Defaults to `text`.

- `-log-level`: The lowest level logged: `debug`, `info`, `warn` or `error`. Defaults to `info`.

## The cluster

**The cluster is that of `NORCA_ADDR` and `NORCA_TOKEN`.** The commands that talk to a cluster take
`-region`, and those that work on releases take `-namespace`.

By default Rigger fetches and evaluates modules on the machine it runs on and sends the resources of
each release to the cluster. With `-server` (or `RIGGER_SERVER=1`), `stack plan`, `stack apply`,
`stack status`, `stack destroy`, `install` and `bundle import` go to the servers of the cluster, which
fetch and evaluate; see [the stacks API](/docs/api/rigger-stacks#from-the-command-line).

## Sources

A stack names the source of each module:

- `<namespace>/<name>` that names no registry of the stack is a module of the global registry,
  `github.com/bacanoo-io/norca-global-registry`, or of `RIGGER_GLOBAL_REGISTRY` (a git address or a
  directory).
- Git repositories are read without the `git` program, so the credential helpers and `~/.ssh/config`
  of git do not apply. An `ssh://` or `user@host:path` repository authenticates with the keys of the
  ssh agent and the known hosts of the user (`SSH_KNOWN_HOSTS`, else `~/.ssh/known_hosts`); an https
  repository with the credentials of its host, else anonymously.
- **A credential goes to its host only, over https**: those of [`rigger login`](/docs/commands/rigger/login),
  else the ones of the environment below.

## Environment

| Variable | Meaning |
| --- | --- |
| `NORCA_ADDR`, `NORCA_TOKEN` | The cluster and the ACL token. |
| `NORCA_NAMESPACE` | The default of `-namespace` of the stack commands. |
| `RIGGER_SERVER` | `1` sends the commands that have `-server` to the servers. |
| `RIGGER_VAR_<name>` | The value of a variable, as `-var name=value` gives it; a `-var` wins over it. A name that is no variable is a warning. |
| `RIGGER_GIT_HOST`, `RIGGER_GIT_USERNAME`, `RIGGER_GIT_PASSWORD` | The credentials of the git sources of one host. |
| `RIGGER_OCI_HOST`, `RIGGER_OCI_USERNAME`, `RIGGER_OCI_PASSWORD` | The credentials of the OCI sources of one host. |
| `RIGGER_KEY_PASSWORD` | The password of a private signing key. |
| `RIGGER_GLOBAL_REGISTRY` | Another global registry: a git address or a directory. |
| `RIGGER_CREDENTIALS_FILE` | The file `rigger login` keeps credentials in, instead of `rigger/credentials.json` of the configuration directory of the user. |
| `RIGGER_CACHE_DIR` | The cache of fetched modules, instead of `rigger` in the cache directory of the user. |

A password in the environment without its `_HOST` is an error.

## Examples

```shell
$ norca rigger install ./my-module -name web
$ norca rigger release status web
$ norca rigger registry sync global
$ norca rigger stack sync .
$ norca rigger stack plan . -f values/dev.vars.hcl
$ norca rigger stack apply . -f values/dev.vars.hcl
```
