---
title: "Configuration and limits"
linkTitle: "Configuration and limits"
weight: 13
description: "How to configure Rigger: the rigger program and norca rigger (the cluster, flags, environment variables, credentials, key files, cache), the servers (the rigger block of the agent, the bus settings of operation logs and bundles), the /v1/rigger HTTP API, and the limits of modules, stacks, fetches, bundles and releases."
---

## The rigger program and norca rigger

**The `rigger` program has no configuration file.** It is set by flags and by the environment; the only
files it keeps are the credentials of `rigger login` and its cache.

### The cluster

The commands that talk to a cluster use the settings of the `norca` command: `NORCA_ADDR`,
`NORCA_TOKEN`, `NORCA_REGION`, `NORCA_NAMESPACE` and the TLS settings (`NORCA_CACERT`, ...). `search`,
`show`, `module`, `fmt`, `key`, `index`, `stack sync` and `stack validate` need no cluster.

| Flag | Meaning |
| --- | --- |
| `--namespace` | The namespace of a release (default `default`; for stack commands `NORCA_NAMESPACE`). A stack in a directory names its own. |
| `--region` | The region to talk to. A stack is applied in the region of its `rigger` block. |
| `--server` | Send `install`, `stack plan`, `apply`, `status`, `destroy` and `bundle import` to the servers. Default `RIGGER_SERVER`. |
| `--log-level` | `debug`, `info`, `warn`, `error` (default `info`). |
| `--log-format` | `text` (a tree of operations) or `json`. The log goes to standard error. |

A flag is written `--name`; the one-dash form `-name` is read the same, and flags may come before or
after the arguments. `rigger help <command>` (or `--help`) shows the flags and examples of a command,
`rigger help environment` the environment below.

### Environment

| Variable | Meaning |
| --- | --- |
| `RIGGER_SERVER` | `1`: the commands that take `--server` go to the servers. |
| `RIGGER_VAR_<name>` | The value of the variable `<name>` of a module or stack: over the files of `-f`, under `--var`. A name that is no variable is a warning. Not read for a module the servers fetch. |
| `RIGGER_GLOBAL_REGISTRY` | The global registry: a git address or a directory (default `github.com/bacanoo-io/norca-global-registry`). |
| `RIGGER_CACHE_DIR` | The cache of fetched repositories, modules and registries (default `rigger` in the user's cache directory). |
| `RIGGER_CREDENTIALS_FILE` | The file of `rigger login` (default `rigger/credentials.json` in the user's configuration directory). |
| `RIGGER_GIT_HOST`, `RIGGER_GIT_USERNAME`, `RIGGER_GIT_PASSWORD` | Credentials of the git sources of one host, when `rigger login` has none for it. |
| `RIGGER_OCI_HOST`, `RIGGER_OCI_USERNAME`, `RIGGER_OCI_PASSWORD` | Credentials of the OCI sources of one host, likewise. |
| `RIGGER_KEY_PASSWORD` | The password of a private key, for `key generate`, `key sign`, `module publish` and `stack publish`; empty for a key without a password. |
| `SSH_AUTH_SOCK`, `SSH_KNOWN_HOSTS` | The ssh agent and known hosts for `ssh://` and `user@host:path` repositories (default `~/.ssh/known_hosts`). |

### Files

| File | Written by | Holds |
| --- | --- | --- |
| `~/.config/rigger/credentials.json` (the user's configuration directory) | `rigger login`, `rigger logout` | Credentials per host, readable by the user only. |
| `~/.cache/rigger/` (the user's cache directory) | every fetch | Mirrors of repositories, trees of commits, registries, imported bundles. Safe to delete. |
| `<name>.key`, `<name>.pub` | `rigger key generate` | A key pair; the private key encrypted with `RIGGER_KEY_PASSWORD`. |
| `.rigger-signatures/<key ID>.json` | `rigger key sign`, `module publish` | A signature of a module or stack. |
| `rigger.lock.hcl` | `rigger stack sync` | The lock file of a stack. |

### Shell completion

```shell
source <(rigger completion bash)                                # also zsh, fish, powershell
```

`norca rigger` has no completion.

## The servers

Rigger on the servers needs no setting to work; the leader of each region runs it. Three settings
bound what it keeps:

```hcl
server {
  enabled = true

  # What a server writes into its cache for one fetched commit of a git repository.
  rigger {
    fetch_tree_max_bytes = "1GiB"
    fetch_file_max_bytes = "128MiB"
    fetch_tree_max_files = 100000
  }

  # The logs of stack operations and the bundles, on the system bus.
  bus {
    rigger_logs_max_bytes    = "256MiB"
    rigger_logs_max_age      = "720h"
    rigger_bundles_max_bytes = "1GiB"
  }
}
```

- The [`rigger` block](/docs/configuration/rigger) bounds one fetched commit of a registry, module or
  stack. A commit past a limit is not written; the sync or install fails with "the tree of the commit is
  past a limit of the fetcher". Each server has its own cache (`<data_dir>/server/rigger/cache`), so set
  it on every server; a change needs a restart.
- The [`bus` block](/docs/configuration/bus) keeps the full log of every stack operation
  (`rigger_logs_*`) and the imported bundles (`rigger_bundles_max_bytes`). A server without the bus
  keeps operation logs only in its own log.
- **The registries of the cluster** are objects (`rigger.norca.io/Registry`), not settings: see
  [registries of the cluster](/docs/rigger/registries#registries-of-the-cluster).

## The HTTP API

| Endpoint | Does | Reference |
| --- | --- | --- |
| `GET /v1/releases`, `GET /v1/release/:name` | List and read releases | [Releases](/docs/api/releases) |
| `PUT /v1/release/:name`, `POST /v1/release/:name/plan` | Apply or plan a release (the program sends its resources here) | [Releases](/docs/api/releases) |
| `GET /v1/release/:name/history`, `/revision/:n`, `/drift` | Revisions, drift | [Releases](/docs/api/releases) |
| `POST /v1/release/:name/rollback`, `/test`; `DELETE /v1/release/:name` | Roll back, test, uninstall | [Releases](/docs/api/releases) |
| `PUT /v1/rigger/install` | The servers install one module | [Rigger Installs](/docs/api/rigger-install) |
| `GET /v1/rigger/registry/:name/module`, `/icon`, `/stack` | A version of a module or stack for a form | [Rigger Installs](/docs/api/rigger-install), [Rigger Stacks](/docs/api/rigger-stacks) |
| `PUT /v1/rigger/registry/:name/sync`, `GET .../search` | Sync and search a registry | [Rigger Registries](/docs/api/rigger-registries) |
| `PUT /v1/rigger/stack/plan`, `/status`, `/apply`, `/destroy` | The servers run a stack | [Rigger Stacks](/docs/api/rigger-stacks) |
| `PUT /v1/rigger/operation/:name/cancel`, `GET .../log` | An operation of a stack | [Rigger Stacks](/docs/api/rigger-stacks#operations) |
| `PUT /v1/rigger/bundle`, `GET /v1/rigger/bundles`, `DELETE /v1/rigger/bundle/:name` | Bundles of the cluster | [Rigger Stacks](/docs/api/rigger-stacks#bundles-for-a-cluster-without-a-network) |
| `/v1/objects/rigger.norca.io/<Kind>` | Read releases, revisions, registries and operations as objects | [Custom Objects](/docs/api/objects) |

The Go client is `client.Releases()` and `client.Rigger()` of `github.com/bacanoo-io/norca/norca/api`.

## Limits

| What | Limit | Set by |
| --- | --- | --- |
| All files of a module | 16 MiB | the engine |
| One file of a module or stack | 1 MiB | the engine |
| Resources of an evaluated module | 1000 | the engine |
| Resources of one release | 256 | the servers |
| Nesting of child modules | 8 | the engine |
| Modules of a module or stack (children counted each call) | 1000 | the engine |
| One evaluation | 30 seconds | the engine |
| Signature files of a module | 64, each at most 64 KiB | the engine |
| The icon of a module | PNG, 64 by 64 pixels, 32 KiB | the engine |
| One fetched commit, the program | 4 GiB, 1 GiB a file, 1,000,000 files | the program |
| One fetched commit, a server | 1 GiB, 128 MiB a file, 100,000 files | [`rigger` block](/docs/configuration/rigger) |
| A layer of an OCI source | 256 MiB | fixed |
| A bundle unpacked by the program | 4 GiB | fixed |
| A bundle imported into the cluster | 64 MiB, 1000 modules, 512 MiB unpacked | the servers |
| The bundles of a cluster | `bus.rigger_bundles_max_bytes` (1 GiB) | the servers |
| The rendered content of a revision | about 224 KiB compressed | the servers |
| Revisions kept of a release | 10 by default, at most 100 (`max_history`) | the stack |
| Waiting for a release to be ready | 5 minutes by default, at most 2 hours | `timeout`, `--timeout` |
| One install by the servers | 10 minutes | the servers |
| Operations kept per stack | the last 10 | the servers |
| A search page | 50 by default, at most 500 | `--limit` |
