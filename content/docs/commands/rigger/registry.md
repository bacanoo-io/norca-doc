---
title: "Command: rigger registry"
linkTitle: "rigger registry"
description: "The rigger registry command lists, syncs and searches the registries of the cluster, and chooses what a registry shows in the web UI."
---

The `rigger registry` command works on the **registries of the cluster**: objects of the kind
`rigger.norca.io/Registry`, which list modules and stacks. See the
[registries API](/docs/api/rigger-registries) for the object and its status.

**A registry is never synced on its own.** `sync` fetches the index of one now; searches and installs
read the registry at its last sync.

## Usage

```plaintext
norca rigger registry list
norca rigger registry status <name>
norca rigger registry sync <name>
norca rigger registry search <name> [text] [-kind module|stack] [-category c] [-keyword k] [-offset n] [-limit n]
norca rigger registry select <name> module|stack <namespace>/<name>
norca rigger registry unselect <name> module|stack <namespace>/<name>
```

| Command | What it does |
| --- | --- |
| `registry list` | Lists the registries of the cluster. |
| `registry status` | Shows one registry and its last sync. |
| `registry sync` | Fetches the index of the registry now. |
| `registry search` | Lists the modules and stacks of a registry at its last sync. |
| `registry select`, `registry unselect` | Change what a registry with `display = "selected"` shows in the web UI. The UI changes with the next sync. |

## Registry Options

- `-region`: The region to talk to.

- `-kind`: `search`: `module` or `stack`.

- `-category`: `search`: one category: `application`, `database`, `messaging`, `observability`,
  `platform`, `networking`, `security`, `storage`, `developer-tools`, `ai` or `other`.

- `-keyword`: `search`: the modules and stacks with the keyword.

- `-offset`: `search`: the first match to show.

- `-limit`: `search`: how many matches to show. Defaults to 50, at most 500.

## Examples

```shell
$ norca rigger registry list
$ norca rigger registry sync global
$ norca rigger registry status global
$ norca rigger registry search global nats -kind module
$ norca rigger registry select global module norca/nats
$ norca rigger registry unselect global module norca/nats
```
