---
title: "Command: rigger search"
linkTitle: "rigger search"
description: "The rigger search command lists the modules and stacks of a registry without a cluster."
---

The `rigger search` command lists the modules and stacks of a registry. It needs no cluster and
never reads `NORCA_ADDR`: the program fetches the registry itself into its cache, as the servers
sync one, and searches what it read. To search a registry the servers of a cluster have synced, use
[`rigger registry search`](/docs/commands/rigger/registry).

## Usage

```plaintext
norca rigger search [text] [-registry global|builtin|<repository>] [-kind module|stack]
    [-category c] [-keyword k] [-offset n] [-limit n] [-json]
```

**The text** is found in `<namespace>/<name>` or in the description, regardless of case; without
it every module and stack matches. Words are joined with a space.

**What is searched** is set by `-registry`:

- `global` (the default): the global registry, `github.com/bacanoo-io/norca-global-registry`, or
  `RIGGER_GLOBAL_REGISTRY`. A git address is read at the newest commit of its default branch; a
  directory is read as it is.
- `builtin`: the modules built into the program, each of the one version it ships.
- the address of a registry repository: a git address, or a directory of one. It is read at the
  newest commit of its default branch, and the versions are its tags `<name>/v<version>` of that
  commit.

A git repository is fetched into the cache now, so a second search is quick. The commit read is
logged.

The table shows the kind, the name (`<namespace>/<name>` in the global registry, `builtin/<name>`,
the name in a repository), the newest version and the description. When the matches fill more
than one page, a last line says which (`51-100 of 230`). With `-json` each item also has its
`source`, the address [`rigger show`](/docs/commands/rigger/show) and
[`rigger install`](/docs/commands/rigger/install) take: `<repository>//modules/<name>` for a module
of a repository.

## Search Options

- `-registry`: What is searched: `global`, `builtin` or the address of a registry repository.
  Defaults to `global`. A repository in a directory named `global` or `builtin` is given as
  `./global` or `./builtin`.

- `-kind`: `module` or `stack`. Defaults to both.

- `-category`: The modules and stacks of one category: application, database, messaging,
  observability, platform, networking, security, storage, developer-tools, ai or other. The category
  is that of the newest version.

- `-keyword`: The modules and stacks with the keyword.

- `-offset`: The first match to show. Defaults to 0.

- `-limit`: How many matches to show. Defaults to 50, at most 500.

- `-json`: Write the matches as JSON: the registry, the commit, the total, the offset and the items.

## Examples

```shell
$ norca rigger search
$ norca rigger search nats -kind module
$ norca rigger search -category database -json
$ norca rigger search -registry builtin
$ norca rigger search -registry github.com/acme/rigger-modules
```
