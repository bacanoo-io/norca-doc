---
title: "Command: pack render"
linkTitle: "pack render"
description: "The pack render command renders the templates of a pack and prints the results."
---

The `pack render` command renders the templates of a pack with the given variables and prints the
result, without submitting anything. It is useful when writing a pack, for debugging, and in CI/CD
pipelines or with other deployment tools. See [render](/docs/features/packages/pack#render).

Packs with a [variables schema](/docs/features/packages/releases#variables-schema) are validated before
rendering. The command needs a cluster only if a template uses one of the
[cluster functions](/docs/features/packages/functions#nomad-api).

## Usage

```plaintext
norca pack render <pack-name> [options]
```

## General options

This command takes the [operation options](/docs/commands/pack#operation-options) and the [approval options](/docs/commands/pack#approval-options) (to overwrite files in `--to-dir`).

## Render options

- `--lock=<string>` `(default: verify)` - How to handle the `pack.lock` file of the pack: `verify` checks the digests of the pack and its vendored dependencies if the pack has a lock file, `require` also fails if it has none, `update` (re)writes the lock file of a pack in a local directory, and `ignore` skips the check. Also set by `NORCA_PACK_LOCK` (or `NOMAD_PACK_LOCK`). See [pack.lock](/docs/features/packages/supply-chain#packlock).

- `--no-format` `(default: false)` - Do not format the rendered templates before printing them.

- `--ref=<string>` - Ref of the pack to render. Without it, a pack of a git registry is used at the [default ref](/docs/commands/pack#refs-and-deployment-names) of the registry, and a pack of an OCI registry at its newest version. Not supported with a pack directory.

- `--registry=<string>` `(default: default)` - Name of the registry that contains the pack.

- `--render-output-template` `(default: false)` - Also render and print the output template (`outputs.tpl`).

- `--skip-aux-files` `(default: false)` - Leave out the auxiliary files found in the `templates` directory.

- `-o, --to-dir=<string>` - Directory to write the rendered files to, in addition to standard output.

## Examples

```shell
# Render a pack with variables from a file.
norca pack render example --var-file=./overrides.hcl

# Render with variables on the command line.
norca pack render example --var='redis_image_version=latest' \
    --var='redis_resources={"cpu": "1000", "memory": "512"}'

# Render including the output template.
norca pack render example --render-output-template

# Write the rendered files to a directory as well, overwriting existing files.
norca pack render example --to-dir ~/out --auto-approve

# Render a pack under development.
norca pack render .
```
