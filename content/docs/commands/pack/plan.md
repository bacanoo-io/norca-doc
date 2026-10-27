---
title: "Command: pack plan"
linkTitle: "pack plan"
description: "The pack plan command shows the effects of installing or updating a pack."
---

The `pack plan` command determines the effects of submitting a new or updated pack, without
changing anything. With [releases](/docs/features/packages/releases), the servers report per resource
whether it is created, updated, unchanged or deleted, with the job diffs, and check the pack's
requirements and the admission policies. Against older servers the jobs are planned with the job plan
endpoint.

The command returns one of the following exit codes:

- `0` - No objects will be created or destroyed.
- `1` - Objects will be created or destroyed.
- `255` - An error occurred determining the plan.

The exit codes can be changed with the flags below or the `NORCA_PACK_PLAN_EXIT_CODE_*` environment
variables (see [plan exit codes](/docs/features/packages/pack#plan-exit-codes)).

## Usage

```plaintext
norca pack plan <pack-name> [options]
```

## General options

This command takes the [operation options](/docs/commands/pack#operation-options) and the [Norca cluster options](/docs/commands/pack#norca-cluster-options).

## Plan options

- `--deploy-override` `(default: false)` - Plan a deployment over jobs that are currently deployed by another pack deployment or not by a pack.

- `--diff` `(default: true)` - Show the diff between the remote and the planned job.

- `--exit-code-error=<int>` `(default: 255)` - Exit code when there is an error. Also set by `NORCA_PACK_PLAN_EXIT_CODE_ERROR` (or `NOMAD_PACK_PLAN_EXIT_CODE_ERROR`); the flag takes precedence.

- `--exit-code-makes-changes=<int>` `(default: 1)` - Exit code when the plan shows changes. Also set by `NORCA_PACK_PLAN_EXIT_CODE_MAKES_CHANGES` (or `NOMAD_PACK_PLAN_EXIT_CODE_MAKES_CHANGES`).

- `--exit-code-no-changes=<int>` `(default: 0)` - Exit code when the plan shows no changes. Also set by `NORCA_PACK_PLAN_EXIT_CODE_NO_CHANGES` (or `NOMAD_PACK_PLAN_EXIT_CODE_NO_CHANGES`).

- `--lock=<string>` `(default: verify)` - How to handle the `pack.lock` file of the pack: `verify` checks the digests of the pack and its vendored dependencies if the pack has a lock file, `require` also fails if it has none, `update` (re)writes the lock file of a pack in a local directory, and `ignore` skips the check. Also set by `NORCA_PACK_LOCK` (or `NOMAD_PACK_LOCK`). See [pack.lock](/docs/features/packages/supply-chain#packlock).

- `--policy-override` `(default: false)` - Has no effect: Norca has no Sentinel policies, and [admission policies](/docs/features/admission-control) cannot be overridden. Accepted for compatibility.

- `--ref=<string>` - Ref of the pack to plan. Without it, a pack of a git registry is used at the [default ref](/docs/commands/pack#refs-and-deployment-names) of the registry (the ref it was last added or updated with), and a pack of an OCI registry at its newest version. An explicit `--ref`, including `--ref=latest`, is used as given and makes the default deployment name `pack@ref`. Not supported with a pack directory.

- `--registry=<string>` `(default: default)` - Name of the registry that contains the pack.

- `-v, --verbose` `(default: false)` - Increase the diff verbosity.

## Release options

- `--atomic=<string>` - `"true"` restores the previous revision if any step of the release fails (resources, deployments, hooks); `"false"` leaves a failed release as far as it got. If not set, production namespaces (namespace meta `environment = "production"` or `"prod"`, or `pack.atomic`) are atomic.

- `--client-side` `(default: false)` - Deploy the jobs from the client, as Nomad Pack does, instead of letting the servers apply the release; the servers only record the revision. Also set by `NORCA_PACK_CLIENT_SIDE=1` (or `NOMAD_PACK_CLIENT_SIDE`).

- `--max-history=<int>` `(default: 10 for new releases)` - Number of revisions to keep (at most 100).

- `--regions=<string>` - Comma separated regions to install the release in, in one operation: the servers apply it on the leader of every region (the authoritative region first) and report the result per region. Overrides `regions` of `metadata.hcl`. See [multi-region installs](/docs/features/packages/releases#multi-region-installs).

- `--take-ownership` `(default: false)` - Take over resources that belong to another release.

- `--timeout=<duration>` `(default: 5m)` - How long the servers wait for deployments and hooks (at most 2h).

- `--var-secret=<path>:<item>=<value>` - A secret Variables item. Secret items are written to the Variable but never stored in the release. Can be repeated.

## Examples

```shell
# Plan a pack with the default deployment name, the pack name "example".
norca pack plan example

# Plan a pack of a registry added with --ref=v0.1.0 (the pack at v0.1.0, release "nats").
norca pack plan nats --registry=norca

# Plan without showing the diff.
norca pack plan example --diff=false

# Plan in CI without failing on changes.
norca pack plan example --exit-code-makes-changes=0

# Plan a pack under development.
norca pack plan .
```
