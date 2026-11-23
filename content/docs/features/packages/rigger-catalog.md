---
title: "The catalog of Rigger in the web UI"
linkTitle: "Rigger catalog"
weight: 6
description: "The Catalog and Registries tabs of the Packages page: the modules of a Rigger registry at its last sync, searched on the servers, and installed from a form built from their variables."
---

## What and why

The **Packages** page of the web UI shows **Rigger**, the package manager, on two tabs:

- **Catalog**: the modules of one [registry](/docs/api/rigger-registries) at its last good sync, and the
  install form of each.
- **Registries**: the registries of the cluster, when each was last synced, and their settings.

A registry may list very many modules, so the catalog is **searched on the servers** a page at a time.
It is never loaded whole into the browser. Packs are no longer shown or installed in the UI; the
[pack manager](/docs/features/packages/catalog) still works from the command line and the API.

## The catalog

| Control | What it does |
| --- | --- |
| Registry | The registry searched; `global` first when the cluster has it. |
| Search | Found in `<namespace>/<name>` and in the description. |
| Category | One of the fixed categories of a module: application, database, messaging, observability, platform, networking, security, storage, developer-tools, ai, other. |
| Keyword | The modules with the keyword. |
| The whole index | A registry with `display = "selected"` shows what is selected first; the switch shows everything its index has. |

- **Each card shows the icon of its category**, the newest version, the description, the license and
  the keywords. **The icon of a module is fetched only for the module opened**, never for a page of
  cards.
- **The age of the index is shown.** An index older than 7 days gets a warning: newer versions are
  offered after the next sync. A registry never synced offers nothing until it is synced.

## The install form

**Install** opens the form of the newest version, built by the servers from the variables of the module
(tabs, groups, widgets, conditional fields, validation). **Plan** shows what an install would change;
**Install** applies the release and waits until it is ready. The values are sent as JSON
(`ValuesJSON` of the [install API](/docs/api/rigger-install)), the same values as a values file of HCL.

- **A sensitive variable** (`sensitive = true`) is a password field. Its value goes to the install and
  never into a revision; the **CLI command** tab shows it as `<secret>`.
- **A variable with a `secret { path, item }` block** is read by the job from the secret store at run
  time. The form takes no value for it and lists where the job reads it, so it can be put there first.
- **Take over the release** is needed when the release name belongs to a release that the pack manager
  applied or another stack owns. The plan says so; an install without it is refused.
- **A version the cluster cannot run** (its `requires` names a Norca version or feature the cluster
  lacks) is shown with what is missing, and can't be installed.
- The **CLI command** tab shows the same install as a call of the HTTP API. The `rigger` program
  installs a module of a directory, not one of a registry by name.

## The page of a release

A release Rigger applied shows the module and its version, its source, the registry of the cluster it
was installed from, its digest and signature, and the stack that owns it.

- **Upgrade** opens the install form of the module with the values of the deployed revision, for a
  release installed from a registry of the cluster that no stack owns. A sensitive value is not kept
  with a release: enter it again, or the module takes its default.
- **A release of a stack** says which stack (and part) owns it: the stack applies, upgrades and removes
  it, so change the stack and apply it.
- A release of a module sent as files is upgraded with the `rigger` program.

## Registries

The **Registries** tab lists each registry with its status, what its last good sync found, when that
was and of which commit, and the credentials Variable it uses. **Sync** fetches it now; a sync never runs
on its own. **Add registry** and the edit button write the object
`rigger.norca.io/Registry` (type, source, what the catalog shows, the credentials Variable, the trusted
keys) and sync it. An edit keeps the selection of the registry and is refused when someone changed the
registry since it was read.
