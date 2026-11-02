---
title: "Command: pack history"
linkTitle: "pack history"
description: "The pack history command lists the revisions of a release."
---

The `pack history` command lists the revisions of a [release](/docs/features/packages/releases),
newest first: the action (install, upgrade, rollback), the pack version and the phase of every kept
revision. For a multi-region install it shows the revisions of every region.

## Usage

```plaintext
norca pack history <release> [options]
```

## General options

This command works on releases only; it uses the [Norca cluster options](/docs/commands/pack#norca-cluster-options).

## History options

- `--regions=<string>` - Comma separated regions whose histories to show. By default the regions of a multi-region install are taken from the release.

## Examples

```shell
norca pack history redis
norca pack history test-app --namespace=apps
```
