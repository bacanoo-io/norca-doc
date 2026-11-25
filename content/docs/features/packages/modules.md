---
title: "Modules and stacks"
linkTitle: "Modules and stacks"
weight: 1
description: "What a module and a stack of Rigger are made of: the files named after what they hold, variables with validation and rules, values resolved at install time and at run time, secrets, tests, and the stack file with its values and lock."
---

A **module** is a package: a directory of HCL files with its variables, its jobs and other resources,
and its tests. A **stack** names several modules with their values; Rigger installs each as a
[release](/docs/features/packages/releases). The examples of the language are in the Norca repository:
[rigger/examples](https://github.com/bacanoo-io/norca/blob/main/rigger/examples/README.md) (a small
module, a registry with larger modules, and stacks) and the test application of the
[deployment examples](/docs/getting-started/examples),
[example/modules/test-app](https://github.com/bacanoo-io/norca/blob/main/example/modules/test-app/README.md).

## Files

**Files are named after what they hold**, so a directory listing says what a module installs. A block
in a file of another name is an error.

| File | Holds |
| --- | --- |
| `metadata.hcl` | the module (`module` block) or the published stack (`stack` block): name, version, license, `requires`, form tabs |
| `variables.hcl` | `variable` and `rule` blocks |
| `locals.hcl` | `locals` and `check` blocks |
| `modules.hcl` | calls of child modules |
| `outputs.hcl` | `output` blocks |
| `<name>.norca.hcl` | one job |
| `<name>.acl.hcl` | one ACL policy |
| `<name>.var.hcl` | one Norca Variable |
| `<name>.kind.hcl`, `.admission.hcl`, `.namespace.hcl`, `.quota.hcl`, `.external.hcl`, `.object.hcl` | one resource of that kind |
| `files/*.tftpl` | a text in the template syntax of HCL, read with `templatefile()`; a template can't call `templatefile()` itself |
| `files/*` (other) | a plain file, read with `file()` |
| `examples/*.vars.hcl`, `values/*.vars.hcl` | values of variables |
| `tests/*.riggertest.hcl` | tests |
| `stack.hcl` | a stack: the `rigger` block and the modules it installs |
| `secrets.hcl` | the secrets a stack creates once |
| `rigger.lock.hcl` | the lock of a stack |

A file or a directory whose name starts with a dot is no content of a module.

## A module

```hcl {filename="metadata.hcl"}
module {
  name        = "web"
  version     = "0.1.0"
  description = "A stateless web service with health checks."
  license     = "MPL-2.0" # of the software the module installs
  category    = "application"
  keywords    = ["web", "http"]

  requires {
    norca    = ">= 0.3.0"
    features = ["releases"]
  }
}
```

```hcl {filename="variables.hcl"}
variable "count" {
  type        = number
  default     = 2
  description = "Instances of the service."

  validation {
    min     = 1
    max     = 50
    integer = true
  }

  ui {
    tab    = "general"
    widget = "slider"
  }
}

variable "log_level" {
  type    = string
  default = "info"

  validation {
    one_of = ["debug", "info", "warn", "error"]
  }
}

rule "database_needs_its_secret" {
  condition     = var.database == null || var.database_secret != ""
  error_message = "database needs database_secret: the path of the secret with the credentials."
}
```

What to look for:

- **No templates.** Conditions and loops are `dynamic` blocks, `for` expressions and `enabled`;
  configuration files are built from data with an encoder (`jsonencode`, `yamlencode`, `tomlencode`,
  `natsconf`); longer texts use the template syntax of HCL itself.
- **Install time and run time.** `var.*`, `local.*`, `module.*` and `rigger.*` are resolved by Rigger.
  Everything else inside a job (`${NORCA_PORT_client}`, `${attr.kernel.name}`, the `{{ }}` of a task
  template) belongs to the cluster and passes through. `runtime()`, `runtime_env()`, `secret_ref()`
  and `service_address()` name values that the cluster resolves on the node.
- **Checks before anything runs:** `validation` in variables, `rule` across variables, `check` over
  evaluated values. The `ui` blocks of the variables and the tabs of `metadata.hcl` lay out the
  install form of the [catalog](/docs/features/packages/rigger-catalog).
- **Secrets are never values.** A variable with a `secret` block names where the secret store holds
  the secret; the task reads it at run time. A sensitive value goes only into an item of a Variable,
  where it becomes a secret item.
- **Dependencies:** `requires` in `metadata.hcl` (see [requirements](/docs/features/packages/releases#requirements)),
  and the outputs of one module as values of another in a stack.
- **Hooks:** a job with a `hook` block runs before or after an install, an upgrade or a delete, or as
  a test of the release (see [hooks and tests](/docs/features/packages/releases#hooks-and-tests)).

A module is checked without a cluster:

```shell
norca rigger module validate ./modules/web     # its files, its icon, its tests, its example values rendered
norca rigger module test ./modules/web         # the tests of tests/*.riggertest.hcl
norca rigger module render ./modules/web -f examples/with-database.vars.hcl -release shop
norca rigger fmt -check ./modules/web
```

`render` prints the evaluated resources and outputs as JSON; a job is decoded by Norca's own job
decoder. Secret items are named, never shown.

### Tests

A test evaluates the module with its values and checks assertions over the resources it gives, or
expects an error:

```hcl {filename="tests/web.riggertest.hcl"}
test "defaults" {
  release = "web"

  assert {
    condition     = resource.job.web.group.web.count == 2
    error_message = "the default is two instances"
  }
}

test "a database without its secret is refused" {
  values = {
    database = { service = "postgres", name = "shop" }
  }

  expect_error = "database needs database_secret"
}
```

## Stacks

A stack is a `stack.hcl` with a `rigger` block and the modules it installs. Each `module` block is
one release, in the region and the namespace of the stack unless the module names its own namespace:

```hcl {filename="stack.hcl"}
rigger {
  name      = "platform" # recorded in every release as its owner
  region    = "eu"
  namespace = "shop"     # default namespace of the releases

  registry "example" {
    source = "github.com/example/rigger-registry"
  }
}

module "postgres" {
  source  = "example/postgres"
  version = "~> 0.3"

  values = {
    databases = [{ name = "shop", extensions = ["pgcrypto"] }]
  }

  atomic  = true
  timeout = "10m"
}

module "shop-api" {
  source = "./modules/shop-api"

  values = {
    count    = var.api_count
    database = module.postgres.databases["shop"]
  }
}
```

- **The source of a module** is `<namespace>/<name>` of the global registry (or `<registry>/<name>`
  of a `registry` block of the stack), a git address, `builtin/<name>` for a module built into
  Rigger, or a directory of the stack itself (`./modules/...`), which has no registry, no version and
  no signature.
- **A module takes** `source`, `version`, `namespace`, `values`, `enabled`, `depends_on`, `atomic`,
  `wait`, `timeout` and `max_history`.
- **Outputs wire modules together**: a module that takes `module.<name>.<output>` is installed after
  that module is ready.
- **A stack without a region is of `global`.** A stack is applied in the region its `rigger` block
  names.
- **Values per environment** are files of `values/` (`-f values/dev.vars.hcl`), `-var name=value`
  and `RIGGER_VAR_<name>`.
- **`secrets.hcl`** names secrets that the stack creates once in the secret store of the cluster;
  `!generate:<name>` generates a value that is kept on a second apply:

  ```hcl {filename="secrets.hcl"}
  secret "postgres/apps/shop" {
    items = {
      user     = "shop"
      password = "!generate:postgres-shop"
    }
  }
  ```

```shell
norca rigger stack sync .       # resolve the versions, fetch and verify the modules, write rigger.lock.hcl
norca rigger stack validate .   # evaluate the stack without a cluster
norca rigger stack plan .       # what an apply would change
norca rigger stack apply .      # install or upgrade, release after release, in the order of the dependencies
norca rigger stack status .     # the releases of the stack, their revision, drift
```

**A stack owns its releases**, by its namespace and name. `stack apply -prune` uninstalls the
releases the stack owns and no longer has; `stack destroy` uninstalls them all. A release that
another stack owns or another manager applied is taken over only with `-adopt`.

A stack with a `metadata.hcl` (a `stack` block) can be published and applied by its name, or taken
as a part of another stack; see the [stacks API](/docs/api/rigger-stacks) and
[`rigger stack`](/docs/commands/rigger/stack). The lock file, signatures and trust are described in
[supply chain](/docs/features/packages/supply-chain).

## CLI

| Task | Command |
| --- | --- |
| Check, test and render a module | [`norca rigger module`](/docs/commands/rigger/module) |
| Format the files | [`norca rigger fmt`](/docs/commands/rigger/fmt) |
| Sync, plan and apply a stack | [`norca rigger stack`](/docs/commands/rigger/stack) |
| Install one module, of a directory or by its source | [`norca rigger install`](/docs/commands/rigger/install) |
