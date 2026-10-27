---
title: "Command: pack upgrade"
linkTitle: "pack upgrade"
description: "The pack upgrade command upgrades an existing release of a pack."
---

The `pack upgrade` command upgrades an existing [release](/docs/features/packages/releases) of a
pack: the servers apply the rendered resources as a new revision. It fails if the release does not
exist or the servers do not support releases; use [`pack run`](/docs/commands/pack/run) to install.

It takes the same options as `pack run`.

## Usage

```plaintext
norca pack upgrade <pack-name> [options]
```

## General options

This command takes the [operation options](/docs/commands/pack#operation-options) and the [Norca cluster options](/docs/commands/pack#norca-cluster-options).

## Run options

- `--check-index=<uint>` - If set, the job is only registered or updated if the passed job modify index matches the server side version. If zero, the job is only registered if it does not yet exist. Used for client-side deployments, usually together with `norca job plan`.

- `--consul-namespace=<string>` - Not supported: a job that sets a Consul namespace is rejected by the servers ("consul namespace in a job is not supported"). Services, Connect and templates use the namespace of the [`consul`](/docs/configuration/consul) block of the agent configuration.

- `--consul-token=<string>` - If set, the Consul token is stored in the job before it is sent to the servers. Overrides `CONSUL_HTTP_TOKEN` and the token in the job.

- `--deploy-override` `(default: false)` - Force the deployment over jobs that are currently deployed by another pack deployment or not by a pack.

- `--detach` `(default: false)` - Do not wait for the deployments; return after the registration.

- `--lock=<string>` `(default: verify)` - How to handle the `pack.lock` file of the pack: `verify` checks the digests of the pack and its vendored dependencies if the pack has a lock file, `require` also fails if it has none, `update` (re)writes the lock file of a pack in a local directory, and `ignore` skips the check. Also set by `NORCA_PACK_LOCK` (or `NOMAD_PACK_LOCK`). See [pack.lock](/docs/features/packages/supply-chain#packlock).

- `--policy-override` `(default: false)` - Has no effect: Norca has no Sentinel policies, and [admission policies](/docs/features/admission-control) cannot be overridden. Accepted for compatibility.

- `--preserve-counts` `(default: false)` - Keep the existing task group counts when updating a job.

- `--ref=<string>` - Ref of the pack: a git ref (tag, SHA, `latest`) of the registry, or the pack version for OCI registries. Without it, a pack of a git registry is used at the [default ref](/docs/commands/pack#refs-and-deployment-names) of the registry (the ref it was last added or updated with), and a pack of an OCI registry at its newest version. An explicit `--ref`, including `--ref=latest`, is used as given and makes the default deployment name `pack@ref`. Not supported with a pack directory.

- `--registry=<string>` `(default: default)` - Name of the registry that contains the pack.

- `--vault-namespace=<string>` - If set, the Vault namespace is stored in the job before it is sent to the servers.

- `--vault-token=<string>` - If set, the Vault token is stored in the job before it is sent to the servers. Overrides `VAULT_TOKEN` and the token in the job.

- `--verbose` `(default: false)` - Show verbose deployment monitoring output, including allocation details.

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
# Upgrade the release of the redis pack with a new variable value.
norca pack upgrade redis --var="redis_image_version=7"

# Upgrade a release to a new tag of the Norca pack registry: move the default ref of
# the registry, then upgrade the release "nats" (named after the pack).
norca pack registry update norca --ref=<new tag>
norca pack upgrade nats --registry=norca -f nats.hcl

# The same with an explicit ref: --name keeps the release name "nats" (pack@ref otherwise).
norca pack upgrade nats --registry=norca --ref=<new tag> --name=nats -f nats.hcl
```
