---
title: "The catalog of Rigger in the web UI"
linkTitle: "Rigger catalog"
weight: 6
description: "The Stacks, Catalog and Registries tabs of the Packages page: the modules and stacks of a Rigger registry at its last sync, searched on the servers, installed or applied from a form built from their variables, and the page of each stack with its operations."
---

## What and why

The **Packages** page of the web UI shows **Rigger**, the package manager, on three tabs:

- **Stacks**: the stacks of the namespace, each with its releases and its last operation.
- **Catalog**: the modules and the stacks of one [registry](/docs/api/rigger-registries) at its last
  good sync, and the form of each.
- **Registries**: the registries of the cluster, when each was last synced, and their settings.

A registry may list very many modules and stacks, so the catalog is **searched on the servers** a page at a time.
It is never loaded whole into the browser.

What the catalog shows comes from [registries of the cluster](/docs/rigger/registries#registries-of-the-cluster),
and an install from the catalog is an install by the servers
([the program or the servers](/docs/rigger/lifecycle#the-program-or-the-servers)); the rest of Rigger
is described in the [Rigger](/docs/rigger) section.

## The catalog

| Control | What it does |
| --- | --- |
| Kind | **Modules** or **Stacks**. |
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
- **Take over the release** is needed when the release name belongs to a release that another manager
  applied or another stack owns. The plan says so; an install without it is refused.
- **A version the cluster cannot run** (its `requires` names a Norca version or feature the cluster
  lacks) is shown with what is missing, and can't be installed.
- **A conditional field** is shown only when its condition holds: `show_if` in the `ui` block of the
  variable, a condition over the other variables written as a string (`show_if = "persistence_enabled"`,
  `show_if = "job_type == \"service\""`). `rigger module validate` warns of a `show_if` that is not
  such a condition, and the form then always shows the field.
- The **CLI command** tab shows the same install as a call of the HTTP API. The `rigger` program
  installs the same module by its name: `norca rigger install <module> -registry <registry> -server`
  (`norca rigger install <namespace>/<name> -server` for the global registry).

## Applying a stack

**Apply** on the card of a stack opens the form of its newest version, built from its `variables.hcl`
(the tabs come from the `ui` block of its `metadata.hcl`, as for a module). A stack names its releases
itself, so the form has no release name; the namespace is that of the stack.

- **Plan** lists the release of each part of the stack and whether it is installed or upgraded, and
  warns of a release that another manager applied or another stack owns (that needs **Take over the
  release**).
- **Apply** starts an apply on the servers as an operation (see the
  [stack API](/docs/api/rigger-stacks#operations)) and opens the page of the stack on it.
- The values are sent as JSON. A value left at its default is not sent; the stack gives it.
- The **CLI command** tab shows the same apply as a call of the HTTP API.

## The page of a stack

**Packages → Stacks** lists each stack that owns a release or has an operation kept in the namespace;
its page shows:

- **Releases**: the releases the stack owns, with their part, module, status and the link to each.
  **Check status** reads the revision and the drift of each from the servers.
- **Operations**: the applies and destroys kept (the last 10). The newest is shown, or the one chosen,
  with its phase, the outcome of each release, its error, and **its log, followed while it runs**.
  When the servers can't read the log, the page says so and follows the phase.
- **Cancel before the next release** stops a running operation between two releases.
- **Apply again** opens the form of the version the stack runs, for a stack of a registry of the
  cluster. A sensitive value is not kept: enter it again, or the stack takes its default.
- **Destroy** uninstalls every release of the stack, as an operation; type the name of the stack to
  confirm.

## The page of a release

A release Rigger applied shows the module and its version, its source, the registry of the cluster it
was installed from, its digest and signature, and the stack that owns it. **Values** shows the
variable values of the deployed revision, read-only.

- **Upgrade** opens the install form of the module with the values of the deployed revision, for a
  release installed from a registry of the cluster that no stack owns. A sensitive value is not kept
  with a release: enter it again, or the module takes its default.
- **A release of a stack** says which stack (and part) owns it: the stack applies, upgrades and removes
  it, so change the stack and apply it on [its page](#the-page-of-a-stack).
- A release of a module sent as files is upgraded with the `rigger` program.
- **A release that the pack manager made** before it was removed is shown with a note that nothing
  upgrades it. It can be rolled back and uninstalled, and a module installed from the Catalog under
  the same name takes it over.

## Registries

The **Registries** tab lists each registry with its status, what its last good sync found, when that
was and of which commit, and the credentials Variable it uses. **Sync** fetches it now; a sync never runs
on its own. **Add registry** and the edit button write the object
`rigger.norca.io/Registry` (type, source, what the catalog shows, the credentials Variable, the trusted
keys) and sync it. An edit keeps the selection of the registry and is refused when someone changed the
registry since it was read.
