---
title: "Command: pack stop"
linkTitle: "pack stop"
description: "The pack stop command stops the jobs of a deployed pack."
---

The `pack stop` command stops the jobs of the specified pack deployment. To delete the pack from
the cluster, give `--purge` or use [`pack destroy`](/docs/commands/pack/destroy); for releases, prefer
[`pack uninstall`](/docs/commands/pack/uninstall).

By default, the command stops all jobs of the pack deployment. If the pack was run with variable
overrides that set the job names, pass the same overrides to target the right jobs.

Without `--name` the deployment is the one named after the pack (`pack@ref` with an explicit
`--ref`). Deployments run without `--name` and `--ref` before the default ref was introduced are
named `pack@latest`: target them with `--ref=latest` (or `--name=<pack>@latest`).

## Usage

```plaintext
norca pack stop <pack-name> [options]
```

## General options

This command takes the [operation options](/docs/commands/pack#operation-options) and the [Norca cluster options](/docs/commands/pack#norca-cluster-options).

## Stop options

- `--detach` `(default: false)` - Return immediately instead of monitoring the evaluation. The evaluation ID can be inspected with `norca eval status`.

- `--global` `(default: false)` - Stop a multi-region pack in all its regions. By default only one region is stopped. Ignored for single-region jobs.

- `--purge` `(default: false)` - Purge the jobs from the system. Without it the stopped jobs stay queryable until the garbage collector removes them.

- `--ref=<string>` - Ref of the pack to stop. Without it, a pack of a git registry is used at the [default ref](/docs/commands/pack#refs-and-deployment-names) of the registry (the ref it was last added or updated with), and a pack of an OCI registry at its newest version. An explicit `--ref`, including `--ref=latest`, is used as given and makes the default deployment name `pack@ref`. Not supported with a pack directory.

- `--registry=<string>` `(default: default)` - Name of the registry that contains the pack.

- `--verbose` `(default: false)` - Display full information during evaluation monitoring.

## Examples

```shell
# Stop the deployment "nats" of a registry pack.
norca pack stop nats --registry=norca

# Stop the deployment "dev" of a pack.
norca pack stop example --name=dev

# Stop and purge it.
norca pack stop example --name=dev --purge

# Stop only the job "test" of the deployment "dev".
norca pack stop example --name=dev --var=job_name=test
```
