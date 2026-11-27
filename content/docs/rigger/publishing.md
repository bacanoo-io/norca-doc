---
title: "Publishing and signing"
linkTitle: "Publishing and signing"
weight: 11
description: "How modules and stacks are published: signing keys and their key IDs, signatures of the tree digest in .rigger-signatures, rigger module publish and rigger stack publish, OCI, the trust of a stack, trusted keys of a registry and of admission, getting listed in the global registry, and keeping an index of your own."
---

## Keys and signatures

```shell
export RIGGER_KEY_PASSWORD='a long password'          # empty: a key without a password
rigger key generate --out acme                        # acme.key (encrypted) and acme.pub
rigger key sign modules/web --key acme.key            # sign the tree digest of the module
rigger key verify modules/web --key acme.pub          # check the signature
```

- **The keys are ECDSA P-256 keys of the cosign format**: the private key is PKCS #8, encrypted with
  the password of `RIGGER_KEY_PASSWORD`; the public key is a PEM `PUBLIC KEY`. Keys made by cosign
  work too. `key generate` never overwrites a file, and refuses to run without `RIGGER_KEY_PASSWORD`
  set.
- **The key ID** is `sha256:` and the SHA-256 of the DER encoding of the public key. Lock files,
  index entries and release records name keys by it.
- **What is signed is the tree digest of the module**: the SHA-256 over one line
  `<sha256 of the content>  <path>` per file, sorted by path, over the files of the module and of its
  child modules. Hidden files are left out, so a change of any other file is a new digest. The signed
  statement is a cosign simple-signing payload with the tree digest as its digest, the same statement
  Norca's [admission of releases](/docs/rigger/releases#signatures-in-protected-namespaces) verifies.
- **A signature is a file** `.rigger-signatures/<key ID>.json` in the module, one per key (at most
  64, each at most 64 KiB). It travels with the module from any source: git, OCI, a bundle.
- **Keyless signing is not supported.** Keep private keys out of every repository.

## Publishing a module in git

```shell
git add -A && git commit -s -m "web 0.2.0"
rigger module publish modules/web --key acme.key
git push origin main web/v0.2.0
```

`rigger module publish` (without `--to`):

1. validates the module as `rigger module validate` does, **as the commit of `HEAD` has it** (not the
   files on disk: git may hold them otherwise);
2. refuses a module with uncommitted changes, one that is in no git repository, one without a
   version, and a version that is tagged already;
3. signs the tree digest into `.rigger-signatures/`, commits the signature (and checks that the
   commit changed nothing else of the version);
4. tags that commit `<name>/v<version>` (`v<version>` for a module at the root of the repository), an
   annotated tag.

**Nothing is pushed**: push the branch and the tag together. Without `--key` the version is tagged
unsigned, with a warning: the global registry lists only signed versions. Publishing runs the `git`
program, which must be on the `PATH` with a user name and e-mail.

## Publishing a module to an OCI registry

```shell
rigger login registry.example.com --username robot < token.txt
rigger module publish modules/web --to oci://registry.example.com/acme/web
```

The module is pushed with its child modules and signatures, tagged with its version. Installs read
it as `source = "oci://registry.example.com/acme/web"`, on the machine of the program only: the
servers read no OCI source.

## Publishing a stack

A stack with a `metadata.hcl` holding a `stack` block is published like a module:

```shell
rigger stack sync stacks/data-platform               # its lock file is published with it
git add stacks/data-platform/rigger.lock.hcl && git commit -s -m "data-platform: lock"
rigger stack publish stacks/data-platform --key acme.key -f stacks/data-platform/examples/shop.vars.hcl
git push origin main data-platform/v1.2.0
```

`stack publish` validates the stack with its lock file (which must pin every module of a source),
with the values of `-f` and `--var` or each file of `values/` (a variable without a default needs
`-f`), then signs, commits and tags it.

## Trusting keys

Four places check signatures, each against keys of its own:

| Where | Keys | Effect |
| --- | --- | --- |
| A stack: `trust` in its `rigger` block | `public_keys` per registry, or a default rule | `require_signature = true` refuses an unsigned module; the lock file records the signers. |
| A registry of the cluster: `trustedKeys` | PEM public keys | The servers install a version of the registry only when one of the keys signs it. |
| The global registry: `keys/<namespace>/` | The keys of a namespace | A version is listed, and installed, only when a key of its namespace signs it. |
| An admission policy: `trusted_keys` | PEM public keys | In its namespaces, a release is admitted only with a valid signature of its digest by one of the keys (`resources = ["release"]`). |

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

The stack's own modules in `./modules` are part of its repository and need no signature. See
[signatures in protected namespaces](/docs/rigger/releases#signatures-in-protected-namespaces) for the
admission policy.

## Getting listed in the global registry

1. **Ask for a namespace** with the issue form *Request a namespace* of
   [norca-global-registry](https://github.com/bacanoo-io/norca-global-registry): the owner, the
   repositories and their layout, and the public keys. The maintainers review it and add
   `namespaces/<namespace>.json` (the owner and the repositories) and `keys/<namespace>/`. A namespace
   belongs to whoever owns its source repositories.
2. **Publish versions** in those repositories and push the tags.
3. **The *Update* workflow** of the global registry lists every new tag once it passes the checks: the
   module validates, its metadata names the tag's name and version, a key of the namespace signs it,
   it is not blocked. A tag that fails stays out and is shown in the summary of the run.

A listed stack must build on the registry: every registry module it uses is listed too, at the
version its lock file pins.

The rules of the global registry: a listed version is never changed or removed (the checks of every
pull request refuse it); a version is taken out only for malicious code, exposed secrets, a compromised
key or a legal requirement, by a block in `advisories.json` with its reason; advisories are added,
never taken back.

## The release procedure of the Norca registry

The [Norca registry](/docs/rigger/norca-registry) releases its modules this way, with the key of the
namespace `norca`:

1. Check the branch: no uncommitted change, nothing of the remote branch missing.
2. For every module whose version has no tag yet: `rigger module publish modules/<module> --key norca.key`.
3. `rigger key verify modules/<module> --key norca.pub` for each.
4. Push the branch and the new tags together, in one atomic push.

The *Update* workflow of the global registry then lists each new tag as `norca/<module>`.

## An index of your own

`rigger index` keeps a registry **of the shape of the global registry**, for a mirror or a private
index:

```shell
rigger index update --dir . --namespace acme      # list the tagged, signed, checked versions of acme
rigger index check --dir . --base origin/main     # the files, and that a change only adds
```

- `index update` reads the repositories of each namespace (`namespaces/<namespace>.json`), and adds to
  the entries the versions that are tagged, signed by a key of the namespace and pass the checks.
  `--today` sets the date they are listed on.
- `index check` checks every file and key, that every entry belongs to a namespace, and with `--base`
  that the change since that revision only adds; the added versions (or, without `--base`, all) are
  checked against their sources: the tag, the commit, the digest, the metadata and the signatures.
- `--replace url=path` reads a repository from a local clone.

Point the program at it with `RIGGER_GLOBAL_REGISTRY=<git address or directory>`, and the servers by
setting the `source` of their registry `global` to it.
