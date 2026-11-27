---
title: "Supply chain: versions, lock file, signatures, trust, bundles"
linkTitle: "Supply chain"
weight: 4
description: "How Rigger pins and verifies what it installs: versions by tags and constraints, the lock file of a stack, the global registry, signing keys and the trust of a stack, OCI sources, and bundles for a cluster without a network."
---

A stack names its modules by source and version constraint. Rigger resolves each to **one version at
one commit with one digest**, checks who signed it, and writes that into the lock file of the stack.
An install then takes exactly what the lock file names, on every machine and on the servers.

The full documentation is in the [Rigger](/docs/rigger) section:
[versions and lock files](/docs/rigger/versions), [registries and sources](/docs/rigger/registries)
and [publishing and signing](/docs/rigger/publishing).

## In brief

- **A version is a tag**, `<name>/v<version>` in a registry repository (`nats/v2.0.0`), strict semver,
  never moved. A constraint picks the newest version that meets it: `~> 1.2` is `>= 1.2.0, < 2.0.0`,
  `~> 1.2.3` is `>= 1.2.3, < 1.3.0` ([`~>` exactly](/docs/rigger/versions#tilde-arrow-exactly)).
- **The lock file** `rigger.lock.hcl`, written by `rigger stack sync`, records for each module the
  version, the repository, the tag, the commit, the tree digest and the signers. **A moved tag or
  other content is refused.** Keep it in version control.
- **The global registry**, [norca-global-registry](https://github.com/bacanoo-io/norca-global-registry),
  is an index: for every listed version of `<namespace>/<name>` the repository, tag and commit of its
  author, its tree digest and its signatures. Rigger refuses a version unless its tree digest is the
  listed one and a key of its namespace signs it. A listed version never changes.
- **Keys and signatures:** cosign-format keys (`rigger key generate`); a signature of the tree digest in
  `.rigger-signatures/<key ID>.json` of the module; `rigger module publish --key` signs, commits and
  tags a version (the tag is pushed by hand). Keyless signing is not supported.
- **Trust:** the `trust` block of a stack names the keys the modules of a registry must be signed with;
  a registry of the cluster has `trustedKeys`; an admission policy with `trusted_keys` admits only
  signed releases in protected namespaces.
- **Sources and credentials:** the global registry and git repositories are read by the program and
  (when registered) by the servers; `oci://` sources and directories by the program only. An address
  carries no credentials; a credential goes to its host only, over https
  ([`rigger login`](/docs/commands/rigger/login), `RIGGER_GIT_*`, `RIGGER_OCI_*`, the `authSecret` of a
  registry of the cluster).
- **Bundles** carry the modules of a stack, as its lock file pins them, into a cluster without a
  network.

```shell
norca rigger stack sync .                              # resolve, fetch, verify, write rigger.lock.hcl
norca rigger stack sync . --upgrade                    # take the newest version that meets each constraint
norca rigger key generate --out acme                   # acme.key (encrypted with RIGGER_KEY_PASSWORD) and acme.pub
norca rigger module publish modules/redis --key acme.key
git push origin redis/v1.0.0
norca rigger bundle create ./shop -o shop.riggerbundle
norca rigger bundle import shop.riggerbundle --server
```

## CLI and API

| Task | Command or endpoint |
| --- | --- |
| Resolve and pin versions | [`norca rigger stack sync`](/docs/commands/rigger/stack) |
| Keys and signatures | [`norca rigger key`](/docs/commands/rigger/key) |
| Publish a module or a stack | [`norca rigger module publish`](/docs/commands/rigger/module), [`norca rigger stack publish`](/docs/commands/rigger/stack) |
| Bundles | [`norca rigger bundle`](/docs/commands/rigger/bundle), [`/v1/rigger/bundle`](/docs/api/rigger-stacks#bundles-for-a-cluster-without-a-network) |
| Credentials of sources | [`norca rigger login`](/docs/commands/rigger/login) |
| Keep a registry of the shape of the global registry | [`norca rigger index`](/docs/commands/rigger/registry-index) |
| Registries of the cluster | [`norca rigger registry`](/docs/commands/rigger/registry), [Rigger Registries HTTP API](/docs/api/rigger-registries) |
