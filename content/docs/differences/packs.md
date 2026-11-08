---
title: Packs
linkTitle: Packs
description: How packs are written, installed, tracked and shown in Norca compared with Nomad v1.6.5 and the separate Nomad Pack v0.4.2. The pack format stays; Norca adds server-side releases, OCI registries and signing, cluster registries with a catalog and an install form in the web UI.
weight: 3
---

Nomad v1.6.5 has no package manager. Packs come from **Nomad Pack v0.4.2**, a separate `nomad-pack`
binary: it renders a pack on the workstation and submits its jobs, and what was installed is known
only from the meta of the jobs. Norca builds the same tool into the `norca` binary as `norca pack`
and keeps the pack format, so existing packs work unchanged. On top of it, a pack can carry more
than jobs, an install is a **release** that the servers apply and record in revisions, packs come
from git or OCI registries and can be signed, and the web UI has a catalog and an install form.
See [Package management](/docs/features/packages) for the full description.

## Comparison

| Area | Nomad v1.6.5 with Nomad Pack v0.4.2 | Norca | Change |
| --- | --- | --- | --- |
| The tool | A separate `nomad-pack` binary, released apart from Nomad | [`norca pack`](/docs/features/packages/pack) in the `norca` binary, same version as the cluster | Changed |
| Pack format | `metadata.hcl`, `variables.hcl`, `templates/`, `outputs.tpl`, `[[ ]]` templates | The same; existing packs work unchanged | Kept |
| What a pack installs | Jobs | Jobs, namespaces, quotas, ACL policies, Variables, object kinds, admission policies and custom objects, by the [extension of the template](/docs/features/packages/writing-packs) | New |
| Variables | Types and defaults; values from files, `--var` and the environment | The same, plus constraints, `rule` blocks and an optional JSON Schema, checked by the CLI, the form and the servers | Changed |
| Secrets of a pack | Rendered into the job like any value | A `secret` block sends the value to an item of a Variable: never stored in the release or rendered into the templates | New |
| Where the pack is rendered | On the workstation | On the workstation for `norca pack`; by the leader for installs from the web UI and the API | Changed |
| How it is applied | The client submits each job | The servers apply the rendered resources in a fixed order, with admission, quotas and the caller's ACL, and wait for the deployments ([releases](/docs/features/packages/releases)) | Changed |
| Record of an install | The meta of the jobs (`pack.name`, `pack.deployment_name`) | A `packs.norca.io/Release` object with immutable revisions: pack, version, source, values, resources, phase | New |
| Upgrade | `nomad-pack run` again; job by job | `norca pack upgrade`: one atomic revision; resources no longer in the pack are deleted | Changed |
| Rollback | Not available | `norca pack rollback <release> <revision>` applies the content of a kept revision as a new one | New |
| History, drift and tests | Not available | `history`, `diff --live` (drift against the deployed revision) and hook jobs with `norca pack test` | New |
| Removal | `nomad-pack destroy` stops the jobs | `norca pack uninstall` deletes every resource of the release in reverse order; `destroy` and `stop` remain | Changed |
| Several regions | One region per run | `--regions` installs one release per region and shows a row per region in `status` | New |
| Registries | git repositories, cloned to the workstation | git, OCI (Harbor, Zot, GitHub Container Registry, ...), local directories and offline bundles ([supply chain](/docs/features/packages/supply-chain)) | Changed |
| Pinning and integrity | A git ref | `--ref`, OCI digests and a `pack.lock` of the pack and its dependencies | New |
| Signing | Not available | cosign compatible key signatures, a trust policy per registry, and admission policies that require signed packs in protected namespaces | New |
| Air-gapped installs | Copy the registry by hand | `norca pack bundle`: a signed offline bundle, imported into the cache or uploaded to the cluster | New |
| Registries in the cluster | Not available | [Cluster pack registries](/docs/features/packages/catalog) (`packs.norca.io/Registry`): git, OCI, a directory of the servers, a bundle or uploaded packs; synced on save, periodically or on a push notice | New |
| Web UI | Nothing about packs; the jobs appear as jobs | **Packages**: releases with pack, revision, phase, drift and signature; resources, revisions and events; rollback, tests, drift check, uninstall | New |
| Installing from the web UI | Not available | The **Catalog** of the cluster registries and an **install form** built from `variables.hcl` (tabs, widgets, validation, secrets, a JSON tab and the equivalent CLI command); **Upgrade** with the values of the deployed revision | New |
| Releases installed with the CLI | — | Upgraded in the web UI once the cluster has a registry of their source, or after **Upload the pack to upgrade** | New |
| Installing packs with the cluster | Separate steps after the install | The [deployer](/docs/deployer/packs) registers registries and installs releases in `apply`; an unchanged entry is skipped | New |
| Packs that ship with the product | None | The built-in registry (`builtin`): `redis`, `postgres`, `test-app`, `loadbalancer-operator`, usable without network access | New |
| Pack registry of the project | The Nomad Pack Community Registry | The [Norca pack registry](/docs/features/packages/registry) with the operations packs (NATS, the mTLS gateway, RustFS, PostgreSQL, Forgejo, OpenObserve, the OpenTelemetry Collector, Consul, the operators); the community registry can still be added | New |
| Permissions | The ACL of the jobs submitted | `write` on `packs.norca.io/Release` in the namespace of the release, plus the rights for its resources; `packs.norca.io/Registry` rules for the cluster registries | New |
| CLI against older servers | — | Without the release API, or with `--client-side`, `norca pack` submits the jobs from the client as Nomad Pack does | Kept |

## Left out or not used

| Item | In Norca | Why |
| --- | --- | --- |
| The separate `nomad-pack` binary | Not shipped | The tool is built into `norca` and released with it |
| Network rules in packs (`*.netpol.hcl.tpl`) | Reserved; the release apply rejects them | Not implemented yet |
| Keyless (Sigstore identity) signing and transparency log (Rekor) entries | Not supported | Signatures are key-based cosign signatures, verified against the keys of a registry |
| Signatures of git registries and local directories | Not signed and not verified | Only packs in OCI registries and bundles carry signatures |
| Server-side rendering of `norca pack` | Not done | The CLI renders on the client; the servers render only the packs of cluster registries |
| Credentials of registries whose token service is on another host (Docker Hub) | Not usable with credentials | Credentials go to the host of the source only |
