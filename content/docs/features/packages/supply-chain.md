---
title: "Supply chain: versions, lock file, signatures, trust, bundles"
linkTitle: "Supply chain"
weight: 4
description: "How Rigger pins and verifies what it installs: versions by tags and constraints, the lock file of a stack, the global registry, signing keys and the trust of a stack, OCI sources, and bundles for a cluster without a network."
---

## What and why

A stack names its modules by source and version constraint. Rigger resolves each to **one version at
one commit with one digest**, checks who signed it, and writes that into the lock file of the stack.
An install then takes exactly what the lock file names, on every machine and on the servers.

```shell
norca rigger stack sync .             # resolve, fetch, verify, write rigger.lock.hcl
norca rigger stack sync . -upgrade    # take the newest version that meets each constraint
```

## Versions and the lock file

- **A version is a tag.** A module of a registry repository is tagged `<name>/v<version>`
  (`nats/v2.0.0`). A version is strict semver; a constraint such as `~> 1.2` picks the newest version
  that meets it.
- **`rigger stack sync` writes `rigger.lock.hcl`**: for each module the version, the repository, the
  tag, the commit, the tree digest of the module and, when the stack trusts keys, who signed it. Keep
  the file in version control; it is not edited.
- **A moved tag or other content is refused.**
- A module of the stack's own directory (`./modules/...`) has no entry, and neither has a child
  module: the digest of the module that calls it covers its files.

```hcl {filename="rigger.lock.hcl"}
module "example/nats" {
  version    = "1.0.0"
  constraint = "~> 1.0"
  repository = "github.com/example/rigger-registry"
  path       = "modules/nats"
  ref        = "nats/v1.0.0"          # the tag
  commit     = "<the commit of the tag>"
  digest     = "sha256:<the tree digest of the module>"
  signers    = ["sha256:<a key of the trust of the stack that signs it>"]
}
```

## The global registry

`source = "norca/nats"` in a stack is the module `nats` of the namespace `norca` of the **global
registry**, [norca-global-registry](https://github.com/bacanoo-io/norca-global-registry), unless the
stack names a registry `norca` of its own. The global registry holds entries, not code: for every
listed version, where its source is (the repository, tag and commit of its author), its tree digest
and its signatures. The code stays in the repositories of its authors.

- Rigger takes the newest version that meets the constraint and is not blocked, fetches it from the
  repository of its author at the listed commit, and **refuses it unless its tree digest is the listed
  one and a key of its namespace signs it.**
- A listed version never changes, so a lock file stays valid.
- The warnings of the registry are shown by `rigger stack sync` and `rigger stack plan`; a blocked
  version fails with its reason.
- `RIGGER_GLOBAL_REGISTRY` points Rigger to another registry of this shape: a git address, or a
  directory such as a checkout.

The servers of a cluster read the global registry and registry repositories as
[registries of the cluster](/docs/api/rigger-registries), at the commit of their last sync.

## Keys and signatures

```shell
norca rigger key generate -out acme                   # acme.key (encrypted with RIGGER_KEY_PASSWORD) and acme.pub
norca rigger key sign modules/redis -key acme.key     # sign the tree digest of the module
norca rigger key verify modules/redis -key acme.pub
```

- The keys are of the cosign format. A signature is a file `.rigger-signatures/<key ID>.json` in the
  module, over its tree digest; it is what the
  [admission of releases](/docs/features/packages/releases#signatures-in-protected-namespaces)
  verifies.
- **Publishing signs and tags.** `rigger module publish <dir> -key acme.key` signs the module, commits
  the signature and tags the version in its git repository; `rigger stack publish` does the same for
  a stack with a `metadata.hcl`. The tag is not pushed: push it yourself. The global registry lists a
  tag once it passes its checks.

  ```shell
  norca rigger module publish modules/redis -key acme.key
  git push origin redis/v1.0.0
  ```

- Signatures are key-based. Keyless signing is not supported.

## Trust

A stack says which keys the modules of a registry must be signed with:

```hcl {filename="stack.hcl"}
rigger {
  name = "platform"

  registry "example" {
    source = "github.com/example/rigger-registry"
  }

  trust {
    registry          = "example"
    require_signature = true
    public_keys       = [file("keys/example-registry.pub")]
  }
}
```

- The lock file records the signers. A stack without a `trust` block records none.
- The stack's own modules in `./modules` are part of its repository and need no signature.
- **A registry of the cluster has `trustedKeys` too**: with them, the servers install a version of
  the registry only when one of the keys signs it; they hold beside the `trust` of a stack. See the
  [install API](/docs/api/rigger-install#install-a-module).
- **In protected namespaces** an admission policy can require signed releases; see
  [signatures in protected namespaces](/docs/features/packages/releases#signatures-in-protected-namespaces).

## Sources and credentials

| Source | Read by |
| --- | --- |
| The global registry, git repositories | the `rigger` program and the servers (the servers only from [registered sources](/docs/api/rigger-stacks#where-the-servers-fetch-from)) |
| `oci://` repositories (`rigger module publish -to oci://host/repository` pushes a module there) | the `rigger` program, on the machine it runs on |
| Directories | the `rigger` program; the servers take a module or a stack sent as files |

**An address carries no credentials, and a credential goes to its host only, over https.** The
program takes them from [`rigger login`](/docs/commands/rigger/login) or from `RIGGER_GIT_*` and
`RIGGER_OCI_*`; the servers from the Variable that the `authSecret` of a registry names.

## Bundles for a cluster without a network

A **bundle** is one archive with the modules of a stack from git sources, as its lock file pins
them:

```shell
norca rigger stack sync ./shop
norca rigger bundle create ./shop -o shop.riggerbundle
norca rigger bundle inspect shop.riggerbundle
norca rigger bundle import shop.riggerbundle            # into the cache of this machine
norca rigger bundle import shop.riggerbundle -server    # into the cluster, for its servers
```

A bundle serves only what the lock file of the stack pins: the repository, the commit and the
digest. What the servers check and keep is described in
[bundles for a cluster without a network](/docs/api/rigger-stacks#bundles-for-a-cluster-without-a-network).

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
