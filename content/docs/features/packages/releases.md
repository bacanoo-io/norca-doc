---
title: "Releases: revisions, server-side apply, hooks, drift"
linkTitle: "Releases"
weight: 5
description: "Releases of Rigger: rigger.norca.io/Release objects with revision history, the fixed order of an apply, atomic install and upgrade, hooks and tests, rollback, drift detection, uninstall and signature enforcement."
---

An install of a module is a **release**. Rigger evaluates the module and sends the resources it
gives to the servers through the [release API](/docs/api/releases). The servers apply them in a fixed
order, record an immutable revision of the release, and can roll it back, test it, detect drift and
uninstall it. Who evaluates is a choice: the `rigger` program on the machine it runs on, or the
servers themselves (`--server`, the [install API](/docs/api/rigger-install), the
[catalog](/docs/features/packages/rigger-catalog)).

The full documentation is in the [Rigger](/docs/rigger) section: [lifecycle](/docs/rigger/lifecycle)
for the commands, [releases on the servers](/docs/rigger/releases) for the release object, the order
of an apply, atomic mode, hooks, drift and ownership, and [permissions](/docs/rigger/permissions).

## Quick start

```shell
norca rigger install ./example/modules/test-app --name web                # install: revision 1
norca rigger install ./example/modules/test-app --name web --var count=3  # upgrade: revision 2
norca rigger release history web                                          # revisions
norca rigger release rollback web 1                                       # revision 3 = content of 1
norca rigger release status web                                           # the current revision, and what drifted
norca rigger release uninstall web                                        # delete everything, in reverse order
```

A [stack](/docs/rigger/writing-a-stack) installs several releases together and owns them:
`norca rigger stack apply` installs, upgrades and (with `--prune`) removes them, and
`norca rigger stack status` shows their revisions and drift.

## In brief

- **A release** is an object of the kind `rigger.norca.io/Release` in the namespace of the install;
  its revisions are objects of `rigger.norca.io/ReleaseRevision` named `<release>.<n>`. Only the
  release API writes them.
- **Order:** quotas, namespaces, ACL policies, Variables, object kinds, admission policies, external
  services, custom objects, jobs; deletion in reverse. A release has at most 256 resources.
- **Requirements:** `requires { norca, features }` of a module are checked by the servers, also in a
  plan.
- **Install, upgrade, rollback, uninstall** run on the leader, one operation per release at a time,
  with the caller's token: every resource passes admission, quotas and ACLs. A rollback applies the
  content of a kept revision as a new revision.
- **Atomic mode** restores what a failed install or upgrade changed; it is the default in production
  namespaces (meta `environment = "production"` or `"prod"`).
- **Hooks** are batch jobs that run before or after an install, an upgrade or a delete, or as tests of
  the release.
- **Drift** of the resources is detected (`release status`, a check every 5 minutes, the `Drifted`
  condition) and never corrected automatically.
- **Ownership:** a resource belongs to one release, a release to one stack; taking one over needs
  `--adopt`.
- **Signatures:** an admission policy with `trusted_keys` admits only signed releases in its
  namespaces.

## HTTP API

| Operation | HTTP |
| --- | --- |
| List, details | `GET /v1/releases?namespace=`, `GET /v1/release/:name` |
| Install, upgrade | `PUT /v1/release/:name` |
| Plan | `POST /v1/release/:name/plan` |
| Revisions | `GET /v1/release/:name/history`, `GET /v1/release/:name/revision/:n` |
| Rollback | `POST /v1/release/:name/rollback` |
| Tests | `POST /v1/release/:name/test?timeout=` |
| Drift | `GET /v1/release/:name/drift` |
| Uninstall | `DELETE /v1/release/:name?propagation=background\|orphan&no_hooks=&timeout=` |

The Go client is `client.Releases()` in `github.com/bacanoo-io/norca/norca/api`. The endpoints are
described in the [Releases HTTP API](/docs/api/releases).

## CLI

| Command | Purpose |
| --- | --- |
| [`norca rigger install`](/docs/commands/rigger/install) | Install or upgrade one release of a module, of a directory or by its source |
| [`norca rigger stack apply`](/docs/commands/rigger/stack) | Install, upgrade and prune the releases of a stack |
| [`norca rigger stack status`](/docs/commands/rigger/stack) | Show the releases of a stack, their revision and drift |
| [`norca rigger release`](/docs/commands/rigger/release) | List, show, roll back and uninstall releases |
