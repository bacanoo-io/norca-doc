---
title: Packages
linkTitle: Packages
description: How packages are written, installed, tracked and shown in Norca compared with Nomad v1.6.5 and the separate Nomad Pack v0.4.2. Norca has its own package manager, Rigger, with modules in typed HCL, stacks, server-side releases, registries and signing, and a catalog with an install form in the web UI.
weight: 3
---

Nomad v1.6.5 has no package manager. Packs come from **Nomad Pack v0.4.2**, a separate `nomad-pack`
binary: it renders a pack on the workstation and submits its jobs, and what was installed is known
only from the meta of the jobs. Norca has a package manager of its own, **Rigger**, built into the
`norca` binary as `norca rigger`. Its packages are **modules** written in typed HCL, not packs with
templates. A module can carry more than jobs, an install is a **release** that the servers apply and
record in revisions, modules come from registries and can be signed, and the web UI has a catalog
and an install form. See [Package management](/docs/features/packages) for the full description.

## Comparison

| Area | Nomad v1.6.5 with Nomad Pack v0.4.2 | Norca | Change |
| --- | --- | --- | --- |
| The tool | A separate `nomad-pack` binary, released apart from Nomad | [`norca rigger`](/docs/commands/rigger) in the `norca` binary, and the standalone `rigger` program with the same commands | Changed |
| Package format | A pack: `metadata.hcl`, `variables.hcl`, `templates/`, `outputs.tpl`, `[[ ]]` templates | A [module](/docs/features/packages/modules): HCL files named after what they hold, no templates; conditions and loops are `dynamic` blocks, `for` expressions and `enabled` | Changed |
| What a package installs | Jobs | Jobs, namespaces, quotas, ACL policies, Variables, object kinds, admission policies, external services and custom objects, one resource per file | New |
| Variables | Types and defaults; values from files, `--var` and the environment | Types with optional attributes and defaults; values from files, `-var` and `RIGGER_VAR_<name>`; `validation` blocks, `rule` blocks across variables and `check` blocks, checked before anything is applied | Changed |
| Secrets of a package | Rendered into the job like any value | A variable with a `secret` block names where the secret store holds the secret, and the task reads it at run time; a sensitive value goes only into a secret item of a Variable and is never stored in the release | New |
| Tests of a package | Not available | `tests/*.riggertest.hcl`: values in, assertions over the resources, run with `norca rigger module test` without a cluster | New |
| Several packages together | One pack per run; dependencies vendored into the pack | A [stack](/docs/features/packages/modules#stacks): modules with their values, wired through outputs, applied in the order of their dependencies | New |
| Where the package is evaluated | On the workstation | On the machine the `rigger` program runs on, or by the servers (`-server`, the install API, the web UI) | Changed |
| How it is applied | The client submits each job | The servers apply the resources in a fixed order, with admission, quotas and the caller's ACL, and wait for the deployments ([releases](/docs/features/packages/releases)) | Changed |
| Record of an install | The meta of the jobs (`pack.name`, `pack.deployment_name`) | A `rigger.norca.io/Release` object with immutable revisions: module, version, source, values, resources, phase | New |
| Upgrade | `nomad-pack run` again; job by job | The same install or apply again: one revision, atomic when asked for; resources no longer in the module are deleted | Changed |
| Rollback | Not available | `norca rigger release rollback <release> <revision>` applies the content of a kept revision as a new one | New |
| History, drift and tests | Not available | `release history`, drift against the deployed revision in `release status` and `stack status`, and hook jobs that test a release | New |
| Removal | `nomad-pack destroy` stops the jobs | `norca rigger release uninstall` deletes every resource of the release in reverse order; `stack destroy` uninstalls the releases of a stack | Changed |
| Registries | git repositories, cloned to the workstation | The global registry (entries that list signed versions by namespace), git registries, OCI repositories and directories ([supply chain](/docs/features/packages/supply-chain)) | Changed |
| Pinning and integrity | A git ref | Version constraints and a lock file of the stack (`rigger.lock.hcl`) with the version, commit and tree digest of each module; a moved tag is refused | New |
| Signing | Not available | Key signatures kept with the module, the `trust` of a stack per registry, the keys of a namespace of the global registry, and admission policies that require signed releases in protected namespaces | New |
| Installs without a network | Copy the registry by hand | `norca rigger bundle`: the modules of a stack, as its lock file pins them, in one archive, imported into the cache of a machine or into the cluster | New |
| Registries in the cluster | Not available | [Registries of the cluster](/docs/api/rigger-registries) (`rigger.norca.io/Registry`): the global registry and git registries, synced when someone asks for it | New |
| Web UI | Nothing about packs; the jobs appear as jobs | **Packages**: releases with module, revision, phase, drift and signature; resources, revisions, values and events; rollback, tests, drift check, uninstall; stacks with their operations | New |
| Installing from the web UI | Not available | The [catalog](/docs/features/packages/rigger-catalog) of the registries of the cluster and an **install form** built from the variables of a module or a stack (tabs, widgets, validation, secrets, and the same install as a call of the HTTP API); **Upgrade** with the values of the deployed revision | New |
| Installing packages with the cluster | Separate steps after the install | The [deployer](/docs/deployer/rigger) applies a stack in `apply`, and its [GitOps](/docs/deployer/gitops) bindings apply stacks of Git repositories | New |
| Registry of the project | The Nomad Pack Community Registry | The [Norca registry](/docs/features/packages/registry) with the operations modules (NATS, the mTLS gateway, RustFS, PostgreSQL, Forgejo, OpenObserve, the OpenTelemetry Collector, Traefik, Consul, the operators), listed in the global registry as `norca/<name>` | New |
| Permissions | The ACL of the jobs submitted | `write` on `rigger.norca.io/Release` in the namespace of the release, plus the rights for its resources; `rigger.norca.io/Registry` rules for the registries of the cluster | New |

## Left out or not used

| Item | In Norca | Why |
| --- | --- | --- |
| The separate `nomad-pack` binary and the pack format | Not shipped; packs are not installed | Rigger and its modules replace them |
| Keyless signing | Not supported | Signatures are key-based |
| Syncing a registry on a schedule | Not done | A registry is synced only when someone asks for it |
| Installing one release into several regions with one command | Not done | Rigger installs a release in one region; install it in each |
| `oci://` and directory sources on the servers | Not read | The servers fetch only from registered sources and bundles; the `rigger` program reads them on the machine it runs on |
