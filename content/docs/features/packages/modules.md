---
title: "Modules and stacks"
linkTitle: "Modules and stacks"
weight: 1
description: "What a module and a stack of Rigger are made of: the files named after what they hold, variables with validation and rules, values resolved at install time and at run time, secrets, tests, and the stack file with its values and lock."
---

A **module** is a package: a directory of HCL files with its variables, its jobs and other resources
(namespaces, quotas, ACL policies, Variables, object kinds, admission policies, external services,
custom objects), its outputs and its tests. A **stack** names several modules with their values,
wires them through their outputs and pins their versions in a lock file; Rigger installs each module
as a [release](/docs/features/packages/releases).

The full documentation is in the [Rigger](/docs/rigger) section: walk-throughs of
[writing a module](/docs/rigger/writing-a-module) and [writing a stack](/docs/rigger/writing-a-stack),
and the reference of the [module language](/docs/rigger/module-language), the
[stack language](/docs/rigger/stack-language) and the
[expressions and functions](/docs/rigger/expressions-and-functions). The examples of the language are
in the Norca repository:
[rigger/examples](https://github.com/bacanoo-io/norca/blob/main/rigger/examples/README.md) (a small
module, a registry with larger modules, and stacks) and the test application of the
[deployment examples](/docs/getting-started/examples),
[example/modules/test-app](https://github.com/bacanoo-io/norca/blob/main/example/modules/test-app/README.md).

## A module in brief

**Files are named after what they hold**, so a directory listing says what a module installs:

```plaintext
web/
  metadata.hcl              the module block: name, version, license, requirements, form tabs
  variables.hcl             variables with types, validation and form hints; rules
  locals.hcl                locals and checks
  modules.hcl               calls of child modules
  web.norca.hcl             a job; <name>.acl.hcl, .var.hcl, .kind.hcl, ... one resource each
  outputs.hcl               what a stack reads back
  files/                    plain files and templates (*.tftpl)
  examples/*.vars.hcl       example values
  tests/*.riggertest.hcl    tests
```

- **No templates.** Conditions and loops are `dynamic` blocks, `for` expressions and `enabled`;
  configuration files are built from data with an encoder (`jsonencode`, `yamlencode`, `tomlencode`,
  `natsconf`); longer texts use the template syntax of HCL itself.
- **Install time and run time.** `var.*`, `local.*`, `module.*` and `rigger.*` are resolved by Rigger;
  everything else inside a job (`${NORCA_PORT_client}`, the `{{ }}` of a task template) belongs to the
  cluster. `runtime()`, `runtime_env()`, `secret_ref()` and `service_address()` name values that the
  cluster resolves on the node.
- **Checks before anything runs:** `validation` in variables, `rule` across variables, `check` over
  evaluated values. The `ui` blocks lay out the install form of the
  [catalog](/docs/features/packages/rigger-catalog).
- **Secrets are never values of a release**: a sensitive value goes only into an item of a Variable,
  where it becomes a secret item.
- **Hooks:** a job with a `hook` block runs before or after an install, an upgrade or a delete, or as a
  test of the release.

```shell
norca rigger module validate ./modules/web     # its files, its icon, its tests, its example values rendered
norca rigger module test ./modules/web         # the tests of tests/*.riggertest.hcl
norca rigger module render ./modules/web -f examples/with-database.vars.hcl --release shop
norca rigger fmt --check ./modules/web
```

## A stack in brief

A stack is a `stack.hcl` with a `rigger` block and the modules it installs, each one release:

```hcl {filename="stack.hcl"}
rigger {
  name      = "platform" # recorded in every release as its owner
  region    = "eu"
  namespace = "shop"     # default namespace of the releases
}

module "postgres" {
  source  = "norca/postgres"
  version = "~> 0.4.1"
}

module "shop-api" {
  source = "./modules/shop-api"

  values = {
    database_service = module.postgres.service
  }
}
```

- A module that reads `module.<name>.<output>` is installed after that module is ready.
- `rigger stack sync` pins the versions in `rigger.lock.hcl`; `stack plan`, `stack apply`,
  `stack status` and `stack destroy` work on the releases of the stack, which the stack owns.
- Values per environment are files of `values/` (`-f values/dev.vars.hcl`), `--var name=value` and
  `RIGGER_VAR_<name>`; `secrets.hcl` names secrets the stack creates once, with generated values
  (`!generate:<name>`).
- A stack with a `metadata.hcl` is published, signed and versioned like a module, and is applied by its
  name or taken as a part of another stack.

## CLI

| Task | Command |
| --- | --- |
| Check, test and render a module | [`norca rigger module`](/docs/commands/rigger/module) |
| Format the files | [`norca rigger fmt`](/docs/commands/rigger/fmt) |
| Sync, plan and apply a stack | [`norca rigger stack`](/docs/commands/rigger/stack) |
| Install one module, of a directory or by its source | [`norca rigger install`](/docs/commands/rigger/install) |
