---
title: "Command: pack diff"
linkTitle: "pack diff"
description: "The pack diff command shows the drift of a release from its live resources."
---

The `pack diff` command compares the deployed revision of a
[release](/docs/features/packages/releases#drift-detection) with the live state of its resources.
Resources that were deleted or changed outside the release are listed, the `Drifted` condition of the
release is updated, and the command exits with `2`. Drift is never corrected automatically; upgrade or
roll back to restore the revision.

## Usage

```plaintext
norca pack diff <release> --live [options]
```

## General options

This command works on releases only; it uses the [Norca cluster options](/docs/commands/pack#norca-cluster-options).

## Diff options

- `--live` `(default: false)` - Compare the deployed revision with the live state of the resources (drift detection).

## Examples

```shell
# Check whether the resources of the release "redis" were changed by hand.
norca pack diff redis --live
```
