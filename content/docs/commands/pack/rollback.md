---
title: "Command: pack rollback"
linkTitle: "pack rollback"
description: "The pack rollback command applies an earlier revision of a release as a new revision."
---

The `pack rollback` command applies the resources of an earlier revision of a
[release](/docs/features/packages/releases) as a new revision. Without a revision, the revision deployed
before the current one is restored. Revision numbers are those of [`pack history`](/docs/commands/pack/history);
only kept revisions (`--max-history`) can be restored. In a multi-region install, `rollback` works on
one region (`--region`), as revision numbers are per region.

## Usage

```plaintext
norca pack rollback <release> [revision] [options]
```

## General options

This command works on releases only; it uses the [Norca cluster options](/docs/commands/pack#norca-cluster-options).

## Rollback options

- `--atomic=<string>` - `"true"` or `"false"`; if not set, production namespaces are atomic.

- `--detach` `(default: false)` - Do not wait for the deployments of the jobs.

- `--dry-run` `(default: false)` - Show the changes without rolling back.

- `--timeout=<duration>` `(default: 5m)` - How long the servers wait for deployments and hooks.

## Examples

```shell
# Roll the release "redis" back to the previous revision.
norca pack rollback redis

# Preview, then roll back to revision 2.
norca pack rollback redis 2 --dry-run
norca pack rollback redis 2
```
