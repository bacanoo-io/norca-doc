---
title: "Command: rigger index"
linkTitle: "rigger index"
description: "The rigger index command keeps a registry of the shape of the global registry: it lists the new versions of its namespaces and checks its files."
---

The `rigger index` command is for whoever keeps a registry **of the shape of the global registry**:
a git repository with entries that list, by namespace, the signed versions of modules and stacks.
Installing from a registry does not need it.

## Usage

```plaintext
norca rigger index update [--dir registry] [--namespace ns] [--replace url=path]
norca rigger index check [--dir registry] [--base revision] [--replace url=path]
```

| Command | What it does |
| --- | --- |
| `index update` | Lists, in the entries of the registry, the versions that the repositories of its namespaces have tagged, signed and checked. |
| `index check` | Checks the files of the registry. With `--base`, also that a change only adds, and the added versions against their sources. |

## Index Options

- `--dir`: The checkout of the registry. Defaults to the current directory.

- `--namespace`: `update`: a namespace to update. May be given more than once; without it all
  namespaces are updated.

- `--base`: `check`: the git revision the change is compared with. Without it every version is checked.

- `--replace`: Read the repository `url` from `path`, a clone (`url=path`). May be given more than
  once.

- `--today`: `update`: the day the versions are listed on. Defaults to the current day.

## Examples

```shell
$ norca rigger index update --dir . --namespace acme
$ norca rigger index check --dir . --base origin/main
```
