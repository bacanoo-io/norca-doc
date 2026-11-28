---
title: "Command: rigger release"
linkTitle: "rigger release"
description: "The rigger release command lists, shows, rolls back, tests and uninstalls releases, one release at a time, without a stack."
---

The `rigger release` command works on one [release](/docs/rigger/releases), without a
stack, through the [release API](/docs/api/releases).

## Usage

```plaintext
norca rigger release list [--namespace ns]
norca rigger release status <name> [--namespace ns]
norca rigger release history <name> [--namespace ns]
norca rigger release rollback <name> [revision] [--namespace ns] [--adopt]
norca rigger release test <name> [--namespace ns] [--timeout d]
norca rigger release uninstall <name> [--namespace ns]
```

| Command | What it does |
| --- | --- |
| `release list` | Lists the releases of the namespace. |
| `release status` | Shows the current revision of the release and what drifted. |
| `release history` | Lists the revisions of the release. |
| `release rollback` | Makes a revision current again: the one given, else the previous one. |
| `release test` | Runs the tests of the current revision: the jobs of its modules with `hook { on = "test" }`. Prints each hook job with its status and ends with exit code 1 when a test failed; a release without test hooks passes. The servers keep the result as the last test of the release. |
| `release uninstall` | Uninstalls the release. |

The table has the columns `NAMESPACE`, `RELEASE`, `REVISION`, `STATUS`, `MODULE` and `OWNER` (the
stack that owns the release).

## Release Options

- `--namespace`: The namespace of the release. Defaults to `default`. `list` takes `*` for all
  namespaces.

- `--region`: The region to talk to.

- `--adopt`: `rollback`: restore a revision of another manager or stack.

- `--timeout`: `test`: how long to wait for the tests. Defaults to the servers' default.

## Examples

```shell
$ norca rigger release list --namespace apps
$ norca rigger release status test-app --namespace apps
$ norca rigger release history test-app --namespace apps
$ norca rigger release rollback test-app 1 --namespace apps
$ norca rigger release test test-app --namespace apps
test apps/test-app: revision 3 passed
  test apps/test-app-smoke: complete
$ norca rigger release uninstall test-app --namespace apps
```
