---
title: "Stack language reference"
linkTitle: "Stack language"
weight: 5
description: "Every file, block and attribute of a Rigger stack: the rigger block with registries and trust, module blocks, stack blocks (parts), variables, locals, checks and outputs, secrets.hcl and generated values, values files, metadata.hcl of a published stack, and the lock file rigger.lock.hcl."
---

A stack is a directory with a `stack.hcl`. Walk-through: [writing a stack](/docs/rigger/writing-a-stack).

| File or directory | Holds |
| --- | --- |
| `stack.hcl` | One `rigger` block, `module` blocks (releases) and `stack` blocks (parts). **Required.** |
| `variables.hcl` | `variable` and `rule` blocks, as in a [module](/docs/rigger/module-language#variableshcl). |
| `locals.hcl` | `locals` and `check` blocks. |
| `outputs.hcl` | `output` blocks. |
| `secrets.hcl` | `secret` blocks. |
| `metadata.hcl` | A `stack` block and an optional `ui` block: the stack is a published stack. |
| `rigger.lock.hcl` | The lock file, written by `rigger stack sync`. |
| `modules/` | The stack's own modules (`source = "./modules/<name>"`). |
| `values/*.vars.hcl` | Values per environment. |
| `keys/` | Public keys for `trust`. |
| `examples/`, `files/` | Example values, files read with `file()`. |

Any other `.hcl` file or directory is an error; other files (a `README.md`, an icon) are allowed.
Files and directories whose name starts with a dot are not part of the stack, and are never sent to
the servers.

## The rigger block

```hcl
rigger {
  name             = "platform"     # required: the owner of the releases; lower case, digits, -
  region           = "eu"           # default global
  namespace        = "shop"         # default namespace of the releases; default default
  required_version = ">= 0.3.0"     # a constraint on the Norca version of the cluster

  registry "example" {              # <name>/<module> is modules/<module> of this git repository
    source = "github.com/example/rigger-registry"
  }

  trust {
    registry          = "example"   # leave out: the default rule for every source without one
    require_signature = true        # an unsigned module is refused
    public_keys       = [file("keys/example-registry.pub")]
  }
}
```

- `stack.hcl` has exactly one `rigger` block ("One rigger block").
- **A stack is applied in its region**, and a stack without `region` is of `global`. A stack sent to
  the servers of another region is refused.
- A `registry` block names a **git** repository; each name once ("Duplicate registry"). A source
  `<name>/<module>` whose `<name>` is no registry of the stack is the module of the global registry.
- One `trust` block per registry, and one without `registry` ("Duplicate trust"). The keys are PEM
  public keys of the cosign format (`rigger key generate` writes them). The lock file records which of
  them signed each module.

## module blocks: releases

```hcl
module "<release>" {
  source      = "example/postgres"           # required
  version     = "~> 0.3"                     # not for ./ sources
  namespace   = "data"                       # default the stack's
  values      = { node = var.node }
  enabled     = var.with_database
  depends_on  = [module.nats, stack.data]
  atomic      = true
  wait        = true                         # default true
  timeout     = "10m"
  max_history = 20
}
```

The label is the name of the release: lower case letters, digits and `-`, at most 63. Another
attribute is an error ("A module of a stack takes source, version, namespace, values, enabled,
depends_on, atomic, wait, timeout and max_history").

| Attribute | Type | Meaning |
| --- | --- | --- |
| `source` | constant string | See [sources](#sources). |
| `version` | constant string | A [version constraint](/docs/rigger/versions#constraints). A `./` source has none ("Version of a local source"). |
| `namespace` | expression | The namespace of the release. |
| `values` | expression | An object, one attribute per variable of the module. May read `var.*`, `local.*`, `module.*`, `stack.*` and contain `"!generate:<name>"`. |
| `enabled` | expression | `false` leaves the release out: it is not installed, its outputs are `null`, and **a release installed before stays installed** (shown as `disabled` by a plan, never pruned). |
| `depends_on` | list | `module.<name>` and `stack.<part>` the release is installed after. |
| `atomic` | constant bool | Atomic install and upgrade. Without it the namespace decides (production namespaces are atomic). |
| `wait` | constant bool | Wait until the release is ready (deployments healthy) before the next. |
| `timeout` | constant duration | How long to wait. |
| `max_history` | constant number | Revisions kept, 0 or more; 0 leaves it to the servers (10). At most 100. |

**Order.** A release is installed after every release it reads or names in `depends_on`; releases that
are independent go by name. A destroy goes the other way. A cycle is an error ("Values refer to each
other").

## stack blocks: parts

A part is a **published stack** of a registry, applied as a part of this one:

```hcl
stack "data" {
  source     = "acme/data-platform"         # required: <namespace>/<name> or a git address
  version    = "~> 1.2"
  values     = { database_node = "worker-1" }
  depends_on = [module.network]
}
```

- A part takes `source`, `version`, `values` and `depends_on`.
- **The releases of a part are named `<part>-<release>`**, in the region of the stack; its generated
  values are named `<part>-<name>`. A release of the stack and one of a part of the same name are an
  error ("Duplicate release").
- The stack reads the outputs of a part as `stack.<part>.<output>`, and its modules are installed after
  the part's releases.
- A part has no parts of its own: a published stack has no `stack` blocks.

## Sources

| Source | Is |
| --- | --- |
| `./modules/<name>` | A module of the stack's own directory. No version, no registry, no signature, no lock entry. It must lie inside the stack (`../` out of it is "Source outside the root"). |
| `<registry>/<name>` | `modules/<name>` of the git repository of `registry "<registry>"`, versions tagged `<name>/v<version>`. |
| `<namespace>/<name>` | A module of the global registry (when no registry of the stack has that name). |
| `github.com/acme/modules//modules/web`, `https://...`, `ssh://...`, `git@host:path`, `file://...` | A git repository; after `//` the directory of the module, tagged `<last element of the directory>/v<version>` (`web/v1.0.0`); without `//`, a repository of one module, tagged `v<version>`. |
| `oci://<host>/<repository>` | An OCI repository, tagged by version. Read by the program only. |
| `builtin/<name>` | A module built into Rigger (`builtin/redis`), of the one version it ships. |
| `dir://<path>` | A directory on the machine. Read by the program only. |

**An address carries no credentials**: a user or a password in an https address and a password in an
ssh address are refused. Credentials are given apart ([`rigger login`](/docs/commands/rigger/login),
`RIGGER_GIT_*`, the `authSecret` of a registry of the cluster).

## variables.hcl, locals.hcl, outputs.hcl

As in a module: `variable` and `rule` blocks, `locals` and `check` blocks, `output` blocks. A stack's
`rigger.*` is `rigger.stack`, `rigger.region` and `rigger.namespace`. Its outputs are what a stack that
takes it as a part reads.

The `ui` block of a variable and the `ui` tabs of `metadata.hcl` lay out the form of the stack in
the web UI's catalog.

## secrets.hcl

```hcl
secret "postgres/apps/shop" {
  items = {
    user     = "shop"
    password = "!generate:postgres-shop"
  }
  overwrite = false
}
```

- The label is the path of a secret in the cluster's built-in secret store, in the namespace of the
  stack. The stack creates it **once**, before any release, and leaves it as it is on a later apply,
  unless `overwrite = true` (then its items are written at every apply).
- `items` is an object of strings. It may read `var.*` and `local.*`.

## Generated values

A string `"!generate:<name>"`, in the `values` of a module or the `items` of a secret, is a random value
of 32 letters and digits (about 190 bits). The stack generates it at its first apply, keeps it in the
secret `rigger/stacks/<stack>/generated` of the secret store, and uses the same value on every later
apply. `<name>` is letters, digits, `-` and `_`, at most 128. A generated value is sensitive.

## Values files

`values/<env>.vars.hcl` sets the stack's variables (`-f values/prod.vars.hcl`). The precedence, from
the weakest: the default, the files of `-f` in order, `RIGGER_VAR_<name>`, `--var`. `rigger stack
validate` without `-f` evaluates the stack with each file of `values/`.

## metadata.hcl of a published stack

```hcl
stack {
  name        = "data-platform"      # the name of the rigger block
  version     = "1.2.0"              # required
  description = "..."
  license     = "MPL-2.0"
  category    = "platform"
  keywords    = ["postgres", "nats"]

  requires {
    norca    = ">= 0.3.0"
    features = ["releases", "secret-store"]
  }
}

ui {
  tab "database" { label = "Database" }
}
```

A published stack carries its own modules in `modules/` and a lock file that pins every module of a
source; `rigger stack publish` signs and tags it. The global registry lists a stack only when every
registry module it uses is listed there too, at the version its lock file pins.

## The lock file

`rigger.lock.hcl` is written by `rigger stack sync` and never edited by hand. Keep it in version
control with the stack.

```hcl
module "example/postgres" {          # the source as the stack writes it
  version    = "0.3.0"
  constraint = "~> 0.3"
  repository = "github.com/example/rigger-registry"
  path       = "modules/postgres"
  ref        = "postgres/v0.3.0"     # the tag
  commit     = "dd25e479b41ff63f9b0bc89c72b4305375708aab"
  digest     = "sha256:b3c7a8489808ab819f0c726f8e37f4213a2fd4828df40bdee16e6d6a515d4a33"
  signers    = ["sha256:2071efdb9fa0fe44c8c03a505d6005f747c2beda32bbe12847371a8a46238907"]
}

stack "acme/data-platform" {         # a part
  version = "1.2.0"
  # ... the same fields
}
```

| Field | Meaning |
| --- | --- |
| `version`, `constraint` | The version taken, and the constraint of the stack it met. |
| `repository`, `path`, `ref`, `commit` | Where it was found: the repository, the directory in it, the tag, the commit of the tag. |
| `digest` | The tree digest of the module (`sha256:...`). |
| `signers` | The key IDs of the trust of the stack that signed it; absent without a `trust` block. |

A module of `./modules` has no entry, nor has a child module: the digest of the module that calls it
covers its files. See [versions and lock files](/docs/rigger/versions#the-lock-file) for what is
checked against it.
