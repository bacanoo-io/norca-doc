---
title: "Writing a stack, end to end"
linkTitle: "Writing a stack"
weight: 3
description: "A stack of several modules: registries and trust, module blocks with sources, version constraints and values, references between modules, depends_on and enabled, the values of the stack per environment, secrets and generated values, outputs, the lock file, sync, plan, apply, status, prune and destroy, and stacks published and taken as parts."
---

This page follows the stack `platform` of the Norca repository's examples,
[rigger/examples/stack/platform](https://github.com/bacanoo-io/norca/tree/main/rigger/examples/stack/platform):
a database and a message bus from a registry, and two modules of the stack's own, wired together.
The tests of Rigger sync it, write its lock file and evaluate it with each of its value files.
Every block is described in the [stack language](/docs/rigger/stack-language).

![How the stack platform wires its modules, and the order of an apply](../images/rigger-stack-wiring.svg)

## The files of a stack

```plaintext
platform/
  stack.hcl               the rigger block and the modules (one release each)
  variables.hcl           the values that differ between environments
  outputs.hcl             what the stack gives back
  secrets.hcl             secrets the stack creates once
  rigger.lock.hcl         written by rigger stack sync; kept in version control
  values/
    dev.vars.hcl
    prod.vars.hcl
  keys/
    example-registry.pub  the key the modules of the registry must be signed with
  modules/
    shop-api/             a module of the stack itself
    shop-worker/
```

A stack may have `stack.hcl`, `variables.hcl`, `locals.hcl`, `outputs.hcl`, `secrets.hcl`,
`metadata.hcl` and `rigger.lock.hcl`, and the directories `modules/`, `values/`, `keys/`,
`examples/` and `files/`. Any other `.hcl` file or directory is an error. Files and directories whose
name starts with a dot (`.git`, `.env`) are no part of the stack.

## The rigger block

```hcl {filename="stack.hcl"}
rigger {
  required_version = ">= 0.1.0"
  name             = "platform" # recorded in every release as its owner
  region           = "eu"
  namespace        = "shop" # default namespace of the releases

  registry "example" {
    source = "github.com/example/rigger-registry"
  }

  # Modules of the registry must be signed with this key. The stack's own
  # modules in ./modules are part of this repository and need no signature.
  trust {
    registry          = "example"
    require_signature = true
    public_keys       = [file("keys/example-registry.pub")]
  }
}
```

- **`name`** is the owner of every release of the stack, together with the stack's namespace.
- **`region`**: the stack is applied in this region. **A stack without a region is of `global`**,
  so name the region unless the cluster's region is `global`.
- **`namespace`** is the namespace of a release that names none (default `default`).
- **`required_version`** is a constraint on the Norca version of the cluster, checked before a plan.
- **`registry "<name>"`** makes `<name>/<module>` mean `modules/<module>` of that git repository.
  A `<namespace>/<name>` that names no registry of the stack is a module of the global registry.
- **`trust`** says which keys must sign the modules of a registry (or, without `registry`, of every
  source without a rule of its own). With `require_signature = true` an unsigned module is refused.

## Modules from a registry

```hcl {filename="stack.hcl"}
module "postgres" {
  source  = "example/postgres"
  version = "~> 0.3"

  values = {
    node = var.node

    databases = [
      { name = "shop", extensions = ["pgcrypto"] },
      { name = "reports", owner = "reporting" },
    ]
  }

  atomic  = true
  timeout = "10m"
}

module "nats" {
  source  = "example/nats"
  version = "~> 1.0"

  values = {
    count = 3

    users = [
      {
        name            = "shop"
        publish_allow   = ["shop.>", "$JS.API.>"]
        subscribe_allow = ["shop.>", "_INBOX.>"]
      },
      {
        name            = "audit"
        account         = "AUDIT"
        subscribe_allow = ["norca.>", "_INBOX.>"]
        publish_allow   = ["$JS.norca-eu.API.CONSUMER.>", "$JS.ACK.>"]
      },
    ]

    # The changes of the region, when the servers listen for leaf nodes.
    norca_bus = length(var.bus_servers) == 0 ? null : {
      servers = var.bus_servers
      account = "AUDIT"
    }
  }
}
```

**The label of a `module` block is the name of the release.** A module block takes `source`,
`version`, `namespace`, `values`, `enabled`, `depends_on`, `atomic`, `wait`, `timeout` and
`max_history`:

| Attribute | Meaning |
| --- | --- |
| `source` | Where the module comes from: `<registry>/<name>`, `<namespace>/<name>` of the global registry, a git address, `builtin/<name>`, `oci://...`, or `./modules/<name>` of the stack. |
| `version` | A [version constraint](/docs/rigger/versions#constraints); not allowed for `./` sources. |
| `values` | An object, one attribute per variable of the module. May read `var.*`, `local.*`, `module.*` and `stack.*`. |
| `namespace` | The namespace of the release; default the stack's. |
| `enabled` | `false` leaves the release out of the stack. A release that was installed before **stays installed** and is not pruned; the plan shows it as `disabled`. |
| `depends_on` | `[module.<name>, stack.<part>]`: install after them even without reading their outputs. |
| `atomic` | A failed install or upgrade restores what it changed ([atomic mode](/docs/rigger/releases#atomic-mode-and-production-namespaces)). Without it, a production namespace decides. |
| `wait` | Wait until the release is ready before the next one (default `true`). |
| `timeout` | How long to wait for it (`"10m"`); default that of the servers (5m, at most 2h). |
| `max_history` | How many revisions the servers keep (default 10, at most 100). |

## Modules of the stack itself

A module next to `stack.hcl` is part of the stack: it has **no registry, no version and no
signature**, and the lock file has no entry for it.

```hcl {filename="stack.hcl"}
# The API: installed after the database and the bus are ready, because it
# takes their outputs.
module "shop-api" {
  source = "./modules/shop-api"

  values = {
    count    = var.api_count
    database = module.postgres.databases["shop"]
    bus = {
      service = module.nats.service
      port    = module.nats.client_port
      user    = "shop"
      secret  = "nats/users/shop"
    }
  }
}

# The worker reads the orders the API publishes and writes the reports.
module "shop-worker" {
  source = "./modules/shop-worker"

  values = {
    database = module.postgres.databases["reports"]
    bus      = module.shop-api.bus # the same connection the API uses
    subjects = module.shop-api.order_subjects
  }
}
```

The variable of `shop-api` that takes `module.postgres.databases["shop"]` has the shape of that
output:

```hcl {filename="modules/shop-api/variables.hcl"}
# The shape of an element of the postgres module's output "databases".
variable "database" {
  type = object({
    service = string
    name    = string
    secret  = string
  })
}
```

## References set the order

**A release that reads `module.<name>.<output>` is installed after that release is ready.** With the
references above, an apply installs `nats` and `postgres` first (they read nothing of each other, so
they go by name), then `shop-api`, then `shop-worker`. `depends_on = [module.nats]` adds an order
without a value. A cycle is an error: "Values refer to each other". `stack destroy` uninstalls in the
reverse order.

An output of a release that is `enabled = false` is `null`.

## The values of the stack

The stack's own variables, in `variables.hcl`, are what differs between environments:

```hcl {filename="variables.hcl"}
# Values that differ between environments: `-f values/prod.vars.hcl`.
variable "node" {
  type        = string
  description = "Node with the host volume of the database."
}

variable "bus_servers" {
  type        = list(string)
  default     = []
  description = "Leaf node listeners of the Norca servers; empty: no change data capture."
}

variable "api_count" {
  type    = number
  default = 2
}
```

```hcl {filename="values/prod.vars.hcl"}
node      = "worker-1"
api_count = 4

bus_servers = ["10.0.0.11:4652", "10.0.0.12:4652", "10.0.0.13:4652"]
```

The value of a variable is, from the weakest: its default; the files of `-f` (`--values`), a later
file over an earlier one; `RIGGER_VAR_<name>`; `--var name=value`. A `--var` of a string, number or
bool is the text as it is; a list or an object is written in HCL: `--var 'tags=["a", "b"]'`.
`rigger stack validate` without `-f` evaluates the stack with each file of `values/` in turn.

## Secrets and generated values

`secrets.hcl` names secrets of the cluster's secret store that the stack **creates once**, before
any release, and keeps on a later apply (unless the block says `overwrite = true`):

```hcl {filename="secrets.hcl"}
secret "postgres/superuser" {
  items = { password = "!generate:postgres-superuser" }
}

secret "postgres/apps/shop" {
  items = {
    user     = "shop"
    password = "!generate:postgres-shop"
  }
}
```

A string `"!generate:<name>"`, in a secret or in the values of a module, is a random value of 32
letters and digits that the stack generates at its first apply and keeps in the secret store
(`rigger/stacks/<stack>/generated`); the next apply uses the same value. A generated value is
sensitive: a module can put it only into an item of a Variable.

## Outputs of the stack

```hcl {filename="outputs.hcl"}
output "api_service" {
  value = module.shop-api.service
}
```

A stack that takes this one as a part reads it as `stack.<part>.api_service`.

## Sync: pin the versions

```shell
cd platform
rigger stack sync                 # resolve, fetch, verify, write rigger.lock.hcl
git add rigger.lock.hcl
```

`stack sync` takes the newest version of each module that meets its constraint, fetches it, checks
its tree digest and the signatures the stack trusts, and writes the lock file:

```hcl {filename="rigger.lock.hcl"}
module "example/nats" {
  version    = "1.0.0"
  constraint = "~> 1.0"
  repository = "github.com/example/rigger-registry"
  path       = "modules/nats"
  ref        = "nats/v1.0.0"
  commit     = "dd25e479b41ff63f9b0bc89c72b4305375708aab"
  digest     = "sha256:c8279660cc153e64dd6a277b1863df8c0dfd222bc6ddd4e89202e4f6592c2a60"
  signers    = ["sha256:2071efdb9fa0fe44c8c03a505d6005f747c2beda32bbe12847371a8a46238907"]
}
```

Every other command installs exactly what the lock file names, on every machine and on the servers.
`rigger stack sync --upgrade` moves to the newest versions that meet the constraints. See
[versions and lock files](/docs/rigger/versions).

## Plan, apply, status

```shell
rigger stack validate -f values/prod.vars.hcl      # evaluate without a cluster
rigger stack plan -f values/prod.vars.hcl          # what would change; exit code 2 when something would
rigger stack apply -f values/prod.vars.hcl         # install or upgrade, release after release
rigger stack status                                # the releases, their revision, their drift
```

- **The plan compares the digest** of what each release would apply with the deployed revision:
  `install`, `upgrade`, `unchanged`, `remove` (with `--prune`), or `disabled`. An unchanged release is
  not touched.
- **The apply stops at the first failure.** The next apply goes on where it stopped, because its plan
  skips what is done.
- **`--prune`** uninstalls the releases the stack owns and no longer has.
- **`--adopt`** takes over a release that another stack owns or another manager applied; without it
  such an apply is refused.
- **`--server`** sends the stack to the servers, which fetch, evaluate and apply it as an operation;
  see [lifecycle](/docs/rigger/lifecycle#the-program-or-the-servers).

```shell
rigger stack destroy               # uninstall every release of the stack, in reverse order
```

## Publish a stack, and take one as a part

A stack with a `metadata.hcl` holding a `stack` block is a **published stack**: it is versioned,
signed and tagged like a module, and others apply it by its source. From the registry of the
examples, `stacks/data-platform`:

```hcl {filename="metadata.hcl"}
stack {
  name        = "data-platform"
  version     = "1.2.0"
  description = "A PostgreSQL server and a NATS cluster for the applications of a namespace, with their secrets generated once."
  license     = "MPL-2.0"
  category    = "platform"
  keywords    = ["postgres", "nats", "database", "messaging"]

  requires {
    norca    = ">= 0.3.0"
    features = ["releases", "secret-store"]
  }
}

ui {
  tab "database" { label = "Database" }
  tab "bus" { label = "Message bus" }
}
```

- The name of `metadata.hcl` is the name of the `rigger` block; a published stack has a version.
- **Its modules come from registries by source, or from its own `modules/` directory**; it carries
  its lock file, which must pin every module of a source.
- `rigger stack publish stacks/data-platform --key acme.key` validates it with its lock file (with
  the values of `-f` and `--var`, or each file of `values/`; a variable without a default needs
  `-f`), signs it, commits the signature and tags `data-platform/v1.2.0`.

Apply it by its source, with your own values:

```shell
rigger stack plan acme/data-platform --version "~> 1.2" -f shop.vars.hcl
rigger stack apply acme/data-platform --version "~> 1.2" -f shop.vars.hcl --namespace shop
```

Or take it as a **part** of a stack of your own, with a `stack` block:

```hcl {filename="stack.hcl"}
stack "data" {
  source  = "acme/data-platform"
  version = "~> 1.2"

  values = {
    database_node    = "worker-1"
    bus_applications = ["shop"]
  }
}

module "shop" {
  source = "./modules/shop"

  values = {
    database = stack.data.databases["shop"]
  }
}
```

The releases of a part are named `<part>-<release>` (`data-postgres`, `data-nats`); the modules of the
stack read its outputs as `stack.<part>.<output>` and are installed after its releases. A part's
generated values are named `<part>-<name>`. Parts are one level deep: a published stack has no parts
of its own. The lock file pins a part with a `stack` block.
