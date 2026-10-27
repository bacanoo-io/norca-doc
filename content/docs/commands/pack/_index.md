---
title: "Command: pack"
linkTitle: "pack"
description: "The pack command renders, plans, runs and manages packs and pack releases, registries and the pack supply chain."
---

The `pack` command is Norca's package manager: Nomad Pack v0.4.2 built into the `norca` binary, with
Norca's server-side releases, extended package format and supply chain features. A pack is a directory
of parameterized templates and variables; packs are shared through registries. Packs are rendered on
the client; the servers apply the rendered resources as a release. See
[Package management](/docs/features/packages).

## Usage

Usage: `norca pack <subcommand> [options] [args]`

Run `norca pack <subcommand> --help` for help on that subcommand. `norca pack -v` (or `--version`)
prints the version. Unlike most `norca` commands, the `pack` subcommands use double-dash flags
(`--var`, `--registry`); `pack fmt` is the exception.

### Install and manage packs

- [`pack plan`](/docs/commands/pack/plan) - Dry-run a pack install or update to determine its effects
- [`pack render`](/docs/commands/pack/render) - Render the templates of a pack
- [`pack run`](/docs/commands/pack/run) - Run a new pack or update an existing pack
- [`pack upgrade`](/docs/commands/pack/upgrade) - Upgrade an existing release of a pack
- [`pack rollback`](/docs/commands/pack/rollback) - Roll a release back to an earlier revision
- [`pack history`](/docs/commands/pack/history) - List the revisions of a release
- [`pack status`](/docs/commands/pack/status) - Get information on deployed packs and releases
- [`pack diff`](/docs/commands/pack/diff) - Show the drift of a release from its live resources
- [`pack test`](/docs/commands/pack/test) - Run the test hooks of a release
- [`pack uninstall`](/docs/commands/pack/uninstall) - Uninstall a release and delete its resources
- [`pack destroy`](/docs/commands/pack/destroy) - Delete an existing pack
- [`pack stop`](/docs/commands/pack/stop) - Stop a running pack
- [`pack info`](/docs/commands/pack/info) - Get information on a pack
- [`pack list`](/docs/commands/pack/list) - List the packs of the local environment

### Registries

- [`pack registry`](/docs/commands/pack/registry) - Add, delete, list or update registries and packs
  ([`add`](/docs/commands/pack/registry/add), [`delete`](/docs/commands/pack/registry/delete),
  [`list`](/docs/commands/pack/registry/list), [`update`](/docs/commands/pack/registry/update))

### Supply chain

- [`pack push`](/docs/commands/pack/push) - Publish a pack to an OCI registry
- [`pack sign`](/docs/commands/pack/sign) - Sign a pack in an OCI registry
- [`pack verify`](/docs/commands/pack/verify) - Verify the signature of a pack in an OCI registry
- [`pack key`](/docs/commands/pack/key) - Manage pack signing keys ([`generate`](/docs/commands/pack/key/generate))
- [`pack bundle`](/docs/commands/pack/bundle) - Create and import offline pack bundles
  ([`create`](/docs/commands/pack/bundle/create), [`import`](/docs/commands/pack/bundle/import),
  [`inspect`](/docs/commands/pack/bundle/inspect))
- [`pack deps`](/docs/commands/pack/deps) - Manage the dependencies of a pack ([`vendor`](/docs/commands/pack/deps/vendor))

### Authoring

- [`pack generate`](/docs/commands/pack/generate) - Generate a sample registry, pack or variables file
  ([`pack`](/docs/commands/pack/generate/pack), [`registry`](/docs/commands/pack/generate/registry),
  [`var-file`](/docs/commands/pack/generate/var-file))
- [`pack fmt`](/docs/commands/pack/fmt) - Format pack templates and HCL files
- [`pack version`](/docs/commands/pack/version) - Print the version of Norca Pack

## Refs and deployment names

A pack of a git registry is cached once per ref (`<cache>/<registry>/<ref>/<pack>@<ref>`). The
commands that take `--ref` choose the ref like this:

- With `--ref`, including `--ref=latest`, that ref is used as given.
- Without `--ref`, the **default ref** of the registry: the ref it was last added or updated with
  ([`pack registry add`](/docs/commands/pack/registry/add) and
  [`pack registry update`](/docs/commands/pack/registry/update) record it in
  `<cache>/<registry>/default-ref`; `latest` when they ran without `--ref`), if the pack is cached
  at it; otherwise `latest` if the pack is cached there; otherwise the only ref the pack is cached at
  (for caches written before the default ref was recorded). A pack of an OCI registry is used at its
  newest version.

For an OCI registry, the ref is a tag and must follow the
[naming rules](/docs/features/packages/supply-chain#oci-registries) (the OCI tag grammar, no Windows
device names, no trailing dot), whether it comes from `--ref` or from the registry's tag list.

The default deployment name, and so the [release](/docs/features/packages/releases) name, is the
pack name when `--ref` is not given, so a release keeps its name when the registry moves to a new
tag. With an explicit `--ref` it is `pack@ref` (release `pack-ref`); `--name` sets it. A pack in a
local directory is named after the directory.

Deployments that were run without `--name` and `--ref` by earlier versions are named `pack@latest`
(release `pack-latest`): manage them with `--ref=latest` while the pack is cached at `latest`, or
with `--name=<pack>@latest`, which works at any ref.

```shell
norca pack registry add norca https://github.com/bacanoo-io/norca-registry --ref=v0.1.0
norca pack run nats --registry=norca -f nats.hcl      # nats at v0.1.0, release "nats"
norca pack registry update norca --ref=<new tag>
norca pack upgrade nats --registry=norca -f nats.hcl  # the same release at the new tag
```

## Operation options

The commands that render a pack (`render`, `run`, `upgrade`, `plan`, `info`, `status`, `stop`,
`destroy`, `list`) take these options:

- `--var=<key=value>` - An override variable in HCL syntax. Can be given several times.

- `-f, --var-file=<path>` - A variable override file. Can be given several times.

- `--name=<string>` - The deployment name: the unique identifier of this deployed instance of the
  pack, and the name of its release. If not set, the pack name is used, or `pack@ref` if `--ref` is
  given (see [refs and deployment names](#refs-and-deployment-names)). Running `run` again with the
  same name updates the deployment. Pass the same name (or the same `--ref`) to `plan`, `status`,
  `stop`, `destroy` and `upgrade`.

- `--allow-unset-vars` - Suppress errors from unset variables without default values. The same as
  setting `NORCA_PACK_ALLOW_UNSET_VARS` to `1` or `true`.

- `--ignore-missing-vars` - Ignore override variables that the pack does not define, instead of
  failing.

- `--parser-v1` - Use the legacy Nomad Pack template syntax (`.pack_name.variable`), for packs that are
  being migrated to the current syntax.

Environment variables named `NOMAD_PACK_VAR_<variable>` set variables as well.

## Approval options

- `-y, --auto-approve` - Answer confirmation prompts (for example about overwriting files) in the
  affirmative.

## Norca cluster options

The commands that talk to the cluster take these options:

- `--address=<addr>` - The address of the Norca server. Overrides the `NORCA_ADDR` (or `NOMAD_ADDR`)
  environment variable if set.

- `--namespace=<namespace>` - The namespace for queries and actions bound to a namespace, and the
  namespace of releases. Overrides `NORCA_NAMESPACE` (or `NOMAD_NAMESPACE`) if set.

- `--region=<region>` - The region of the servers to forward commands to, and the region of
  releases. Overrides `NORCA_REGION` (or `NOMAD_REGION`) if set.

- `--ca-cert=<path>` - Path to a PEM encoded CA cert file to verify the Norca server TLS certificate.
  Overrides `NORCA_CACERT` (or `NOMAD_CACERT`) if set.

- `--client-cert=<path>` - Path to a PEM encoded client certificate for TLS authentication to the
  Norca server. Must also specify `--client-key`. Overrides `NORCA_CLIENT_CERT` (or
  `NOMAD_CLIENT_CERT`) if set.

- `--client-key=<path>` - Path to an unencrypted PEM encoded private key matching the client
  certificate from `--client-cert`. Overrides `NORCA_CLIENT_KEY` (or `NOMAD_CLIENT_KEY`) if set.

- `--tls-server-name=<name>` - The server name to use as the SNI host when connecting via TLS.
  Overrides `NORCA_TLS_SERVER_NAME` (or `NOMAD_TLS_SERVER_NAME`) if set.

- `--tls-skip-verify` - Do not verify the TLS certificate. This is highly not recommended.
  Verification is also skipped if `NORCA_SKIP_VERIFY` (or `NOMAD_SKIP_VERIFY`) is set.

- `--token=<token>` - The SecretID of an ACL token to authenticate API requests with. Overrides
  `NORCA_TOKEN` (or `NOMAD_TOKEN`) if set.

## OCI registry options

The supply chain commands (`push`, `sign`, `verify`, `bundle create`, `bundle import`) take these
options:

- `--registry=<name>` - Name of a configured OCI registry (see
  [`pack registry add`](/docs/commands/pack/registry/add)). Pack references without an `oci://` prefix
  are looked up in it.

- `--plain-http` - Connect to the OCI registry over plain HTTP instead of HTTPS.

- `--registry-ca-cert=<path>` - Path to a PEM encoded CA certificate to verify the OCI registry with.

- `--registry-tls-skip-verify` - Do not verify the TLS certificate of the OCI registry. Not
  recommended.

- `--registry-username=<string>` - User name for the OCI registry. Overrides
  `NORCA_PACK_REGISTRY_USERNAME` and the docker configuration.

- `--registry-password=<string>` - Password or token for the OCI registry. Prefer the
  `NORCA_PACK_REGISTRY_PASSWORD` environment variable, which does not show up in the process list.

## Environment variables

| Variable | Meaning |
| --- | --- |
| `NORCA_ADDR`, `NORCA_TOKEN`, `NORCA_NAMESPACE`, `NORCA_REGION`, ... | Cluster address and credentials, as for every `norca` command (`NOMAD_*` names are accepted as a fallback) |
| `NOMAD_PACK_VAR_<variable>` | Value of a pack variable |
| `NORCA_PACK_ALLOW_UNSET_VARS` | Same as `--allow-unset-vars` |
| `NORCA_PACK_PLAN_EXIT_CODE_NO_CHANGES`, `NORCA_PACK_PLAN_EXIT_CODE_MAKES_CHANGES`, `NORCA_PACK_PLAN_EXIT_CODE_ERROR` | Exit codes of `pack plan` |
| `NORCA_PACK_CLIENT_SIDE` | Same as `--client-side` |
| `NORCA_PACK_LOCK` | Default of `--lock` |
| `NORCA_PACK_CONFIG` | Path of the client configuration file (OCI registries, trust policies) |
| `NORCA_PACK_CACHE_DIR` | Location of the pack cache |
| `NORCA_PACK_REGISTRY_USERNAME`, `NORCA_PACK_REGISTRY_PASSWORD` | OCI registry credentials |
| `NORCA_PACK_KEY_PASSWORD` (`COSIGN_PASSWORD`) | Password of the signing key |
| `NORCA_PACK_LOG_LEVEL` | Log level of `norca pack` |
| `NORCA_PACK_PLAIN` | Force plain (non-interactive) output |
