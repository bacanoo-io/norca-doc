---
title: "Command: pack test"
linkTitle: "pack test"
description: "The pack test command runs the test hooks of a release."
---

The `pack test` command runs the hook jobs with the `test` role (job meta `pack.hook = "test"`) of
the deployed revision of a [release](/docs/features/packages/releases#hooks-and-tests), and records the
result in `status.lastTest` of the release and in its event log.

## Usage

```plaintext
norca pack test <release> [options]
```

## General options

This command works on releases only; it uses the [Norca cluster options](/docs/commands/pack#norca-cluster-options).

## Test options

- `--timeout=<duration>` `(default: 5m)` - How long the servers wait for the test hooks.

## Examples

```shell
norca pack test redis
```
