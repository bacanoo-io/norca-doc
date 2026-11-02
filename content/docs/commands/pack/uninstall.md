---
title: "Command: pack uninstall"
linkTitle: "pack uninstall"
description: "The pack uninstall command uninstalls a release and deletes its resources."
---

The `pack uninstall` command uninstalls a [release](/docs/features/packages/releases): it runs its
`pre-delete` hooks, deletes its resources in the reverse of the application order, runs its
`post-delete` hooks, and deletes the release with its revisions.

In a multi-region install, `uninstall` alone uninstalls the release of the local (or `--region`)
region and warns that the install has other regions; `--all-regions` or `--regions` uninstall in
reverse order, the global region last.

## Usage

```plaintext
norca pack uninstall <release> [options]
```

## General options

This command works on releases only; it uses the [Norca cluster options](/docs/commands/pack#norca-cluster-options).

## Uninstall options

- `--all-regions` `(default: false)` - Uninstall the release in all regions of its multi-region install.

- `--no-hooks` `(default: false)` - Do not run the `pre-delete` and `post-delete` hooks.

- `--orphan` `(default: false)` - Keep the resources of the release; only the release and its revisions are deleted.

- `--regions=<string>` - Comma separated regions to uninstall the release in, the global region of a multi-region install last.

- `--timeout=<duration>` `(default: 5m)` - How long the servers wait for the hooks.

## Examples

```shell
# Uninstall the release "redis" and delete its resources in reverse order.
norca pack uninstall redis

# Delete only the release record and keep the resources.
norca pack uninstall redis --orphan

# Uninstall a multi-region install everywhere.
norca pack uninstall test-app --namespace=apps --all-regions
```
