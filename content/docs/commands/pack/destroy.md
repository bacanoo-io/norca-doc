---
title: "Command: pack destroy"
linkTitle: "pack destroy"
description: "The pack destroy command stops and deletes a deployed pack."
---

The `pack destroy` command stops and deletes the specified pack from the cluster; for packs
deployed from the client it is the same as `norca pack stop <pack name> --purge`. A pack installed as
a [release](/docs/features/packages/releases) is uninstalled by the servers, like
[`pack uninstall`](/docs/commands/pack/uninstall), unless `--client-side` is given.

By default, the command deletes all jobs of the pack deployment. If the pack was run with variable
overrides that set the job names, pass the same overrides to target the right jobs.

Without `--name` the deployment is the one named after the pack (`pack@ref` with an explicit
`--ref`). Deployments run without `--name` and `--ref` before the default ref was introduced are
named `pack@latest`: target them with `--ref=latest` (or `--name=<pack>@latest`).

## Usage

```plaintext
norca pack destroy <pack-name> [options]
```

## General options

This command takes the [operation options](/docs/commands/pack#operation-options) and the [Norca cluster options](/docs/commands/pack#norca-cluster-options).

## Destroy options

- `--client-side` `(default: false)` - Destroy the jobs of the pack from the client, as Nomad Pack does, even if the pack was installed as a release. Also set by `NORCA_PACK_CLIENT_SIDE` (or `NOMAD_PACK_CLIENT_SIDE`).

- `--detach` `(default: false)` - Return immediately instead of monitoring the evaluation. The evaluation ID can be inspected with `norca eval status`.

- `--global` `(default: false)` - Destroy a multi-region pack in all its regions. By default only one region is destroyed. Ignored for single-region packs.

- `--ref=<string>` - Ref of the pack to destroy. Without it, a pack of a git registry is used at the [default ref](/docs/commands/pack#refs-and-deployment-names) of the registry (the ref it was last added or updated with), and a pack of an OCI registry at its newest version. An explicit `--ref`, including `--ref=latest`, is used as given and makes the default deployment name `pack@ref`. Not supported with a pack directory.

- `--registry=<string>` `(default: default)` - Name of the registry that contains the pack.

- `--verbose` `(default: false)` - Display full information during evaluation monitoring.

## Examples

```shell
# Delete the deployment "example" of the pack "example".
norca pack destroy example

# Delete the deployment "dev" of a pack.
norca pack destroy example --name=dev

# Delete only the job "test" of the deployment "dev".
norca pack destroy example --name=dev --var=job_name=test
```
