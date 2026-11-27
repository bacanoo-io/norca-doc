---
title: "Module language reference"
linkTitle: "Module language"
weight: 4
description: "Every file, block and attribute of a Rigger module: metadata.hcl with requirements and form tabs, variables with types, validation, form hints and secret paths, rules, locals and checks, child modules, resource files and their meta-arguments, hooks, outputs, example values and tests."
---

A module is a directory. **Every file is named after what it holds**, and a file or a directory that
is not in the table below is an error ("Unknown file", "Unknown directory"). Files and directories
whose name starts with a dot are not part of the module: the tree digest leaves them out and nothing
of the language reads them (`.rigger-signatures/` holds the signatures for that reason).

| File | Holds |
| --- | --- |
| `metadata.hcl` | The `module` block and the optional `ui` block. **Required.** |
| `variables.hcl` | `variable` and `rule` blocks. |
| `locals.hcl` | `locals` and `check` blocks. |
| `modules.hcl` | `module` blocks: calls of child modules. |
| `outputs.hcl` | `output` blocks. |
| `<name>.<kind>.hcl` | One resource (table below). |
| `files/...` | Data files, read with `file()`; `*.tftpl` files are templates for `templatefile()`. Any depth. |
| `examples/*.vars.hcl` | Values of variables, evaluated by `rigger module validate`. |
| `tests/*.riggertest.hcl` | `test` blocks, run by `rigger module test`. |
| `README.md`, `CHANGELOG.md`, `LICENSE`, `NOTICE` | Documentation. `rigger show --readme` and the catalog show the README. |
| `icon.png` | The icon of the catalog: a PNG of 64 by 64 pixels, at most 32 KiB. |

The resource files:

| File | Block | Object | Applied |
| --- | --- | --- | --- |
| `<name>.quota.hcl` | `quota "<name>"` | Quota | 1st |
| `<name>.namespace.hcl` | `namespace "<name>"` | Namespace | 2nd |
| `<name>.acl.hcl` | `policy "<name>"` | ACL policy | 3rd |
| `<name>.var.hcl` | `variable "<name>"` | Variable | 4th |
| `<name>.kind.hcl` | `kind "<name>"` | Object kind | 5th |
| `<name>.admission.hcl` | `admission "<name>"` | Admission policy | 6th |
| `<name>.external.hcl` | `external "<name>"` | External service | 7th |
| `<name>.object.hcl` | `object "<name>"` | Custom object | 8th |
| `<name>.norca.hcl` | `job "<name>"` | Job | 9th |

`<name>` is lower case letters, digits, `-` and `_`, starting with a letter or digit, at most 63. A
resource file holds **one** block, labelled with the name of the file ("One resource per file",
"Label and file name differ").

## metadata.hcl

```hcl
module {
  name        = "redis"                 # required: lower case letters, digits, -; at most 63
  version     = "0.4.2"                 # strict semver; required to publish
  description = "One Redis server ..."
  url         = "https://redis.io"
  license     = "BSD-3-Clause"          # of the software the module installs
  category    = "database"
  keywords    = ["redis", "cache"]
  icon        = "icon.png"              # default icon.png
  library     = false                   # true: no resources, only called by other modules

  requires {
    norca    = ">= 0.3.0"               # a constraint on the Norca version of the servers
    features = ["releases", "secret-store"]

    module "s3" {                       # another module that must be installed
      source  = "example/rustfs"        # optional; else the label is the module's name
      version = ">= 0.2.0"
      when    = "backup.enabled"        # only when this variable is on
    }
  }
}

ui {
  tab "general" {
    label = "General"
    icon  = "sliders"
  }
  tab "security" {
    label = "Security & Secrets"
    icon  = "lock"
  }
}
```

- **`version`** must be a version Rigger reads back the same: `1.2.0`, `1.2.0-rc.1`; not `1.2` and
  not `v1.2.0`. A module of a stack's own needs none.
- **`category`** is one of `application`, `database`, `messaging`, `observability`, `platform`,
  `networking`, `security`, `storage`, `developer-tools`, `ai`, `other`.
- **`library = true`**: the module computes values for the modules that call it and has no
  resources; a stack can't install it ("Library module").
- **`requires.norca` and `requires.features`** are checked by the servers for every release and
  plan: "the pack requires Norca >= 0.3.0, the servers run ..." or "the pack requires the feature
  ..., which the servers don't provide". The features are `releases`, `release-hooks`,
  `custom-objects`, `admission-cel`, `admission-webhooks`, `admission-release-signatures`, `quotas`,
  `multiregion-deployments`, `native-service-catalog`, `backups`, `secret-store`, `mtls`,
  `object-webhooks`, `object-migrations`, `object-limits`.
- **`requires { module "<name>" }`** is checked before a plan of a stack and of an install by the
  servers: a release of the stack, or one deployed in the namespace, must be of that module (by its
  name, or by `source`) at a version that meets `version`. `when` names a variable (`backup.enabled`
  or `var.backup.enabled`); the requirement counts only when it is not `false`, `null` or `""`.
  Otherwise: "Required module missing".
- **`ui.tab`** blocks are the tabs of the install form, in order: `label` and `icon`. Variables name
  their tab in their own `ui` block.

## variables.hcl

```hcl
variable "<name>" {
  type        = <type>          # default any
  default     = <value>         # none: the variable is required
  description = "..."
  sensitive   = false

  validation { ... }            # at most one
  ui { ... }                    # at most one
  secret {                      # at most one
    path = "app/db"
    item = "password"
  }
}

rule "<name>" {
  condition     = <bool expression over var.*>
  error_message = "..."
}
```

The name of a variable, a rule or a local is lower case letters, digits and `_`, starting with a
letter or `_`.

**`type`** is an HCL type constraint: `string`, `number`, `bool`, `any`, `list(T)`, `set(T)`,
`map(T)`, `tuple([...])`, `object({ name = T, other = optional(T, default) })`. The default must have
the type. Values are converted to the type: a value that can't be is refused with
"`var.<name> must be a <type>`".

**`sensitive = true`** marks the value: it is shown as `(sensitive)`, it can only become an item of a
Variable resource (where it is a secret item, never stored in a revision), and the form shows a
password field. The default of a sensitive variable is never shown by `rigger show`.

**`secret { path, item }`** says that the job reads the value from the secret store at run time.
It is a hint of the install form: the form takes no value for the variable and lists where the
secret is to be put. The variable itself is evaluated like any other.

### validation

Every attribute is optional; all that are given must hold.

| Attribute | For | Holds when |
| --- | --- | --- |
| `pattern` | string | the value matches the regular expression (RE2) |
| `min_length`, `max_length` | string | the length in characters is within the bounds |
| `min`, `max` | number | the number is within the bounds |
| `integer` | number | `true`: the number is whole |
| `min_items`, `max_items` | list, set, map | the number of items is within the bounds |
| `unique` | list | `true`: the items differ |
| `unique_by` | list of objects | the attribute of that name differs between the objects |
| `one_of` | any | the value is one of the list |
| `item_of` | list | every item is one of the list |
| `key_pattern` | map | every key matches the regular expression |
| `attribute "<name>" { ... }` | object, list of objects | the attribute of the object (of each object) meets the nested rules |
| `item { ... }` | list, set, map | every item meets the nested rules |

```hcl
variable "databases" {
  type = list(object({
    name       = string
    owner      = optional(string, "")
    extensions = optional(list(string), [])
  }))
  default = []

  validation {
    unique_by = "name"
    attribute "name" { pattern = "^[a-z][a-z0-9_]{0,62}$" }
  }
}
```

A validation that does not fit the type is an error of the module. A value that fails is refused
before anything is evaluated, naming the variable.

### ui

The hints of the install form of the web UI. They change nothing of an install.

| Attribute | Meaning |
| --- | --- |
| `tab` | The tab of `metadata.hcl` the field is on. |
| `group` | A group of fields within the tab. |
| `order` | The order within the group (default: the order of `variables.hcl`). |
| `label` | The label (default: the name, humanized). |
| `help`, `placeholder` | Text under the field, and in it. |
| `widget` | `switch`, `segmented`, `select`, `number`, `slider` (a number with `min` and `max`), `tags`, `key-value`, `code`, `object-list` (a table, for a list of objects), `datacenter-multiselect`, `namespace-select`, `region-select`, `node-pool-select`, `storage-volume-select`, `secret`. Without one, or with another, the field follows the type: a choice of `one_of` is a segmented control (up to 3) or a select, a bool a switch, a list tags, a map key-value. |
| `unit` | A unit shown with a number (`"MHz"`). |
| `presets` | Values offered with one click. |
| `option_labels` | Labels of the values of `one_of`: `{ bridge = "Bridge (Isolated)" }`. |
| `show_if` | A condition over the other variables, written as a string: `"persistence_enabled"`, `"mode == \"cluster\""`. The field is shown only when it holds. `module validate` warns of a `show_if` that is no such condition, and the form then always shows the field. |

### rule

A `rule` checks the variables together, after each was checked on its own:

```hcl
rule "auth_needs_password" {
  condition     = !var.auth_enabled || var.redis_password != ""
  error_message = "auth_enabled = true needs redis_password: with an empty password Redis accepts every client."
}
```

## locals.hcl

```hcl
locals {
  name      = rigger.release
  auth_path = "nomad/jobs/${var.job_name}"
}

check "memory_of_all_instances" {
  condition     = module.sizing.memory * var.count <= 16384
  error_message = "count instances of this size reserve more than 16 GiB of memory; lower count or size."
}
```

Locals are evaluated in the order of their references, whatever the order they are written in; a
cycle is an error. A `check` is like a rule over evaluated values (locals, the outputs of child
modules): when its condition is false the install stops with its message.

## modules.hcl: child modules

```hcl
module "placement" {
  source = "../lib/placement"

  datacenters  = var.datacenters
  node_pool    = var.node_pool
  constraints  = var.constraints
  image        = var.image
  image_digest = var.image_digest
}
```

- **The source is a directory relative to the module**, `./` or `../`, inside the files the module was
  loaded from (the repository of a registry, the directory of a stack): a child is read from the same
  source as its parent, at the same commit, and covered by its digest. A registry source is not
  allowed here.
- The other attributes are the values of the child's variables. The child's outputs are
  `module.<name>.<output>`.
- A child may have resources of its own; they are part of the parent's release. **A resource of a
  child module sets its own name** (`name`, `path` or `id` in its body).
- Children are at most 8 deep; modules may not call each other in a circle.

## Resource files

The body of a resource block is the object as Norca reads it, with Rigger's expressions in it:

- **`job`**: Norca's job specification (the body of a `job` block of a `.norca.hcl` file), decoded by
  Norca's own job decoder. `id` and `name` default to the label; name them after `rigger.release`.
- **`policy`**: an ACL policy: `name`, `description`, `rules { ... }` (the policy document as HCL),
  and `job_acl` to bind it to a job.
- **`variable`**: a Norca Variable: `path`, `namespace`, `items { ... }`. A sensitive value is allowed
  only here, as an item.
- **`kind`** and **`object`**: an object kind and a custom object, decoded by the same parser as
  `norca object-kind apply` and `norca object apply`.
- **`namespace`**, **`quota`**, **`admission`**, **`external`**: the fields of the namespace, the quota
  specification, the admission policy and the external service, as their own files of Norca have
  them.

A `name` (`path` for a Variable, `id` for a job) left out is the label of the block; a `namespace` left
out is the namespace of the release.

### Meta-arguments

Every resource block takes these, which Rigger removes before the object is decoded:

| Argument | Meaning |
| --- | --- |
| `enabled = <bool>` | `false`: the resource is not part of the release. |
| `count = <number>` | That many copies; `count.index` in the body. |
| `for_each = <map, object, or list/set of strings>` | One copy per key; `each.key` and `each.value` in the body. |
| `hook { ... }` | Jobs only: the job is a hook (below). |

`count` and `for_each` exclude each other. The value of a meta-argument must be known at install time
and not sensitive. **A copy of `count` or `for_each` sets its own name** (`name`, `path` or `id`),
since the label is the same for all. In tests and outputs a resource with `count` is a list, one with
`for_each` an object by key.

### hook

```hcl
job "smoke-test" {
  type = "batch"

  hook {
    on      = ["post-install", "post-upgrade", "test"]
    weight  = 10           # hooks of a phase run by weight, then by job ID
    timeout = "2m"         # default 5m
    delete  = "on-success" # on-success (default), always, never
  }
  # ...
}
```

`on` takes `pre-install`, `post-install`, `pre-upgrade`, `post-upgrade`, `pre-delete`, `post-delete` and
`test`. A hook is a batch or sysbatch job; a `hook` block on another resource is an error. Rigger
writes the block into the job's meta (`pack.hook`, `pack.hook_weight`, `pack.hook_timeout`,
`pack.hook_delete`), which the servers read. See [hooks and tests](/docs/rigger/releases#hooks-and-tests).

## outputs.hcl

```hcl
output "service" {
  value       = var.job_name
  description = "Name of the service in the catalog."
  sensitive   = false
}
```

Outputs are read by a stack (`module.<release>.<output>`), by a parent module, by tests
(`output.<name>`), and printed by `rigger module render`.

## Values files

A values file (`*.vars.hcl`) sets variables with attributes, nothing else:

```hcl
count     = 3
log_level = "debug"
database  = { service = "postgres", name = "shop" }
```

The same files are given with `-f` to `install`, `module render`, `stack plan` and `stack apply`.
The [install API](/docs/api/rigger-install) takes them as `Values`, or as JSON (`ValuesJSON`). A name
that is no variable of the module is an error with a hint for a misspelled name;
`RIGGER_VAR_<name>` of no variable is a warning.

## Tests

```hcl
test "<name>" {
  release   = "web"        # default: the name of the module
  namespace = "default"
  region    = "global"

  values = { ... }         # an object, one attribute per variable

  assert {
    condition     = resource.job.web.group.web.count == 2
    error_message = "the default is two instances"
  }

  expect_error = "database needs database_secret"   # instead of asserts: the evaluation must fail with this text
}
```

An assertion reads `var.*`, `rigger.*`, `resource.<block>.<name>` (the block as written: `job`,
`policy`, `variable`, `kind`, ...; a job as Norca decodes it) and `output.<name>`, and may call the
functions of a module. `rigger module test` runs every test of `tests/` without a cluster and names
each failed assertion with its message.

## Limits of a module

| Limit | Value |
| --- | --- |
| All files of a module | 16 MiB |
| One file | 1 MiB |
| Resources of an evaluated module | 1000 (a release has at most 256) |
| Nesting of child modules | 8 |
| Modules of one module or stack, children counted each time they are called | 1000 |
| Time of one evaluation | 30 seconds |
| Signature files of a module | 64, at most 64 KiB each |
