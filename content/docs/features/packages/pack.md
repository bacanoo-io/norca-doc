---
title: "Using norca pack"
linkTitle: "Using norca pack"
weight: 1
description: "How to add pack registries and render, plan, run, inspect, stop and destroy packs with norca pack, and how to pass variables."
origin: "Nomad Pack v0.4.2 docs/detailed-usage.md (MPL 2.0, (c) HashiCorp, Inc.), modified"
---

This page goes into detail on the use of `norca pack`, the package manager built into the `norca`
binary. For an overview see [Package management](/docs/features/packages); for writing your own packs
and registries see [Writing packs](/docs/features/packages/writing-packs).

`norca pack` talks to the cluster at `NORCA_ADDR` (or `NOMAD_ADDR`, or `--address`). With ACLs
enabled, a token with the right permissions must be set in `NORCA_TOKEN` (or `NOMAD_TOKEN`, or
`--token`). All subcommands are listed by `norca pack --help`; every subcommand has its own
`--help` and a page in the [`norca pack` reference](/docs/commands/pack).

## The pack cache

`norca pack` keeps the registries you add, and the packs downloaded from OCI registries, in a local
cache: `nomad/packs` below the user cache directory (`~/.cache/nomad/packs` on Linux,
`~/Library/Caches/nomad/packs` on macOS, `%LocalAppData%\nomad\packs` on Windows), or the directory
named by `NORCA_PACK_CACHE_DIR`. It holds one directory per registry, ref and pack:

```plaintext
nomad/packs
└── <REGISTRY>
    └── <REF>
        └── <PACK-NAME>@<REF>
            └── ...files containing pack contents...
```

A registry added without `--ref` is cached under the ref `latest` (its default branch); a registry
added with `--ref=v0.1.0` under `v0.1.0`. Several refs of a registry can be cached side by side. The
ref a registry was last added or updated with is its default ref (recorded in
`<cache>/<registry>/default-ref`), which pack commands without `--ref` use.

The cache is needed for `norca pack` to work, but do not change its files by hand; use the
`registry` commands instead.

No registry is added automatically. Add one with `registry add` (see below), for example the
[Norca pack registry](/docs/features/packages/registry). Commands without `--registry` use the
registry named `default`, so a registry added under that name can be used without the flag.

## List

The `list` command lists the packs available in the cache, with their registry and ref.

```shell
norca pack list
```

`--registry` and `--ref` filter the list.

## Adding registries and packs

The `registry` command has several subcommands for interacting with registries.

Registries are added with `registry add`. Any git based registry that the `go-getter` library
supports works, as do OCI registries (`oci://...`, see [supply chain](/docs/features/packages/supply-chain)).

For instance, to add the entire [Norca pack registry](https://github.com/bacanoo-io/norca-registry),
run the following command to download the registry:

```shell
norca pack registry add norca https://github.com/bacanoo-io/norca-registry
```

To add a single pack from the registry, use the `--target` flag.

```shell
norca pack registry add norca https://github.com/bacanoo-io/norca-registry --target=nats
```

To download a single pack or an entire registry at a specific version or SHA, use the `--ref` flag.
Pin release tags in anything but experiments:

```shell
norca pack registry add norca https://github.com/bacanoo-io/norca-registry --ref=v0.1.0
norca pack run nats --registry=norca
```

The pack commands (`render`, `plan`, `run`, `info`, `status`, ...) without `--ref` use the packs at
the default ref of the registry, here `v0.1.0` (if the pack is cached at it; otherwise `latest`, then
the only cached ref), and name the deployment and the release after the pack (`nats`). An explicit
`--ref` selects another cached ref, and the default deployment name is then `pack@ref`. See
[refs and deployment names](/docs/commands/pack#refs-and-deployment-names).

> [!NOTE]
> Deployments that earlier versions ran without `--name` and `--ref` are named `pack@latest`
> (release `pack-latest`); manage them with `--ref=latest` or `--name=<pack>@latest`.

The Nomad Pack Community Registry is added the same way
(`norca pack registry add community github.com/hashicorp/nomad-pack-community-registry`); its packs
target Nomad and do not use Norca's extensions.

`registry list` shows the cached registries with their refs (and the configured OCI registries);
`registry update` downloads a ref of a registry that was added before, taking the source from the
cache. Without `--ref` it refreshes `latest`; with `--ref=<tag>` it adds that tag next to the cached
refs. Either way that ref becomes the default ref of the registry:

```shell
norca pack registry list
norca pack registry update norca --ref=<tag>
```

To remove a registry or pack from your local cache, use the `registry delete` command. This command
also supports the `--target` and `--ref` flags.

```shell
norca pack registry delete norca
```

## Render

At times you may want to render the job specifications and other resources of a pack without
deploying them. This is useful when writing a pack, debugging deployments, integrating `norca pack`
into a CI/CD pipeline, or if you have another mechanism for deploying to Norca.

The `render` command takes the `--var` and `--var-file` (`-f`) flags that `run` takes.

The `--to-dir` (`-o`) flag names a directory where the rendered templates are written in addition to
standard output; `--auto-approve` (`-y`) lets the command overwrite existing files there.

`--render-output-template` additionally renders the output template (`outputs.tpl`). Some output
templates rely on a deployment for information; in these cases, the output template may not be
rendered with all necessary information.

```shell
norca pack render hello_world --to-dir ./tmp --var message=hola --render-output-template
```

Rendering needs no cluster unless a template uses one of the
[functions that query the cluster](/docs/features/packages/functions#nomad-api).

## Run

To deploy the resources of a pack, use the `run` command.

```shell
norca pack run hello_world
```

Against servers that support [releases](/docs/features/packages/releases), `run` installs or upgrades
a release: the servers apply all rendered resources (jobs and the other resource templates) in a
fixed order and record a revision. Against older servers, or with `--client-side`, the jobs are
registered from the client, as Nomad Pack always did.

By passing a `--name` value to `run`, every resource of the pack is deployed with that deployment
name, which also names the release. If no name is given, a name derived from the pack (and its ref)
is used. This allows managing several deployments of the same pack:

```shell
norca pack run hello_world --name hola-mundo
```

It is also possible to run a local pack directly from the pack directory by passing in the directory
instead of the pack name:

```shell
norca pack run .
```

Packs used this way show up with a development registry and ref in `status` and `list` output.

### Variables

Each pack defines a set of variables that can be provided by the user. Values for variables can be
passed to `run` (and `render`, `plan`, `upgrade`, `stop`, `destroy`, `status`) with the `--var` flag,
in HCL syntax, as often as needed:

```shell
norca pack run hello_world --var message=hola
norca pack run hello_world --var 'datacenters=["dc1","dc2"]'
```

Values can also be provided in a variables file, with `--var-file` or `-f` (repeatable):

```shell
norca pack run hello_world -f ./my-variables.hcl
```

These files set overrides for the variables defined in the pack:

```hcl {filename="my-variables.hcl"}
message = "bonjour"

count = 3

datacenters = [
  "eu-1a",
  "eu-1b",
]

service_tags = ["web", "public"]
```

Environment variables named `NOMAD_PACK_VAR_<variable>` set variables too. `${...}` in a variables
file must be written as `$${...}` to reach the job unchanged.

To see the type, default and description of each variable, run the `info` command;
`generate var-file` writes a variables file with all variables and their defaults as a starting
point:

```shell
norca pack info hello_world
norca pack generate var-file hello_world --to-file ./my-variables.hcl
```

By default, a variable that has no default and no value is an error
(`--allow-unset-vars` or `NORCA_PACK_ALLOW_UNSET_VARS=true` suppresses it), and so is an override
for a variable the pack does not define (`--ignore-missing-vars` suppresses it). Packs with a
[variables schema](/docs/features/packages/releases#variables-schema) are validated against it before
rendering.

## Plan

If you do not want to deploy the pack immediately, but want details on how it will be deployed, run
the `plan` command. It asks the servers for a dry run: with releases, the servers report per
resource whether it is created, updated, unchanged or deleted, with the job diffs; against older
servers the jobs are planned with the job plan endpoint.

```shell
norca pack plan hello_world
```

By passing a `--name` value to `plan`, `norca pack` compares with the deployment of that name. If no
name is provided, the default deployment name is used.

```shell
norca pack plan hello_world --name hola-mundo
```

The `plan` command takes the `--var` and `-f` flags like the `run` command.

```shell
norca pack plan hello_world --var message=hallo
norca pack plan hello_world -f ./my-variables.hcl
```

### Plan exit codes

The `plan` command returns different exit codes depending on the result of the plan:

- `0` - Plan completed with no changes
- `1` - Plan completed and changes will be made
- `255` - An error occurred during the plan

These exit codes can be overridden using flags or environment variables. Flags take precedence over
environment variables.

#### Using flags

```shell
norca pack plan hello_world --exit-code-no-changes=0 --exit-code-makes-changes=0 --exit-code-error=1
```

#### Using environment variables

The following environment variables override the default exit codes (the `NOMAD_PACK_` names are
accepted as a fallback):

- `NORCA_PACK_PLAN_EXIT_CODE_NO_CHANGES` - Exit code when the plan shows no changes (default: 0)
- `NORCA_PACK_PLAN_EXIT_CODE_MAKES_CHANGES` - Exit code when the plan shows changes (default: 1)
- `NORCA_PACK_PLAN_EXIT_CODE_ERROR` - Exit code when there is an error (default: 255)

```shell
export NORCA_PACK_PLAN_EXIT_CODE_NO_CHANGES=0
export NORCA_PACK_PLAN_EXIT_CODE_MAKES_CHANGES=0
export NORCA_PACK_PLAN_EXIT_CODE_ERROR=1

norca pack plan hello_world
```

This is useful in CI/CD pipelines where a successful plan with changes must not be treated as a
failure. With `NORCA_PACK_PLAN_EXIT_CODE_MAKES_CHANGES=0`, the command exits with code `0` even when
changes will be made, so the pipeline continues.

## Status

To see a list of the packs currently deployed (this may include packs that are stopped but not yet
removed), run the `status` command:

```shell
norca pack status
```

To see the status of the jobs of a specific pack, use the `status` command with the pack name. For a
release, it shows the release details: phase, revision, conditions and resources, with one row per
region for [multi-region installs](/docs/features/packages/releases#multi-region-installs).

```shell
norca pack status hello_world
norca pack status hello_world --name hola-mundo
```

## Destroy

To remove the resources deployed by a pack, run the `destroy` command with the pack name. A pack
installed as a release is uninstalled by the servers (the same as
[`norca pack uninstall`](/docs/commands/pack/uninstall)); `--client-side` deletes only its jobs from
the client.

```shell
norca pack destroy hello_world
```

If you deployed the pack with a `--name` value, pass the name you gave the pack. For instance, if you
deployed with:

```shell
norca pack run hello_world --name hola-mundo
```

destroy the contents of that pack with:

```shell
norca pack destroy hello_world --name hola-mundo
```

If you deployed the pack with variable overrides that change the job name, pass the same overrides.
For example, if you deployed with:

```shell
norca pack run hello_world --name hola-mundo --var job_name=spanish
```

destroy it with:

```shell
norca pack destroy hello_world --name hola-mundo --var job_name=spanish
```

It is possible to deploy several instances of a pack under the same `--name` with different job
names through variable overrides. The following commands create two jobs, one named "spanish" and
one named "hola":

```shell
norca pack run hello_world --name hola-mundo --var job_name=spanish
norca pack run hello_world --name hola-mundo --var job_name=hola
```

If you run `destroy` without the variable overrides, it destroys both jobs, since by default
`norca pack` targets all jobs belonging to the pack and deployment name:

```shell
# This destroys both jobs: "spanish" and "hola"
norca pack destroy hello_world --name hola-mundo
```

If you only want to destroy one of the jobs, include the variable overrides so that `norca pack`
knows which job to target:

```shell
# This destroys the job named "spanish"
norca pack destroy hello_world --name hola-mundo --var job_name=spanish
```

## Stop

To stop the jobs of a pack without removing them from the cluster, use the `stop` command:

```shell
norca pack stop hello_world --name hola-mundo
```

The `destroy` command is the same as `stop --purge`. For releases, prefer
[`uninstall`](/docs/commands/pack/uninstall), which also removes the non-job resources and the
release.

## The hello_world pack

The examples on this page use the `hello_world` sample pack. Generate a registry that contains it
with:

```shell
norca pack generate registry my-registry --with-sample-pack
norca pack run ./my-registry/packs/hello_world
```

---

Origin: adapted from `docs/detailed-usage.md` of Nomad Pack v0.4.2 (MPL 2.0, (c) HashiCorp, Inc.),
modified for Norca.
