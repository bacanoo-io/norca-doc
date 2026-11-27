---
title: "Writing a module, end to end"
linkTitle: "Writing a module"
weight: 2
description: "A module from the first file to a signed version in a registry: the layout, metadata, variables with types, validation and rules, locals, a job, a Variable with a secret item, a hook, outputs, examples and tests; rigger fmt, module validate, render and test; installing it; publishing, signing and getting it listed in the global registry."
---

This page builds the module `web` of the Norca repository's examples,
[rigger/examples/module/web](https://github.com/bacanoo-io/norca/tree/main/rigger/examples/module/web),
and borrows two parts from modules of the [Norca registry](/docs/rigger/norca-registry). The
snippets are copied from those modules, which the tests of Rigger load, validate, render and test.
Every block is described in the [module language](/docs/rigger/module-language).

## 1. Start from a scaffold

The `rigger` program writes a complete, commented project to start from:

```shell
rigger generate examples ~/start --owner acme
```

It writes a registry repository with two modules (`webapp` has every kind of file a module may have,
`cache` is smaller), a library module and a published stack; a stack of your own that installs from
that registry; an index of the shape of the global registry; and the Registry object that registers
the registry in a cluster. Its `README.md` lists every command in order, from `git init` to
`rigger stack apply`. The generator only writes files: it runs no git, signs nothing and needs no
network or cluster. (`norca rigger` has no generators; they are in the `rigger` program only. For an
operator, `rigger operator init` scaffolds a controller project with its module; see
[scaffolding an operator](/docs/features/operator-framework/controllers#scaffolding-an-operator).)

Or start with an empty directory. A module needs one file, `metadata.hcl`; the rest is added as the
module grows. The layout of `web` at the end of this page:

```plaintext
web/
  metadata.hcl            name, version, license, requirements
  variables.hcl           variables and rules
  locals.hcl              computed values
  web.norca.hcl           the job "web"
  outputs.hcl             what a stack or a user reads back
  examples/
    with-database.vars.hcl
  tests/
    web.riggertest.hcl
  README.md
```

**The name of a file says what it holds.** A job lives in `<name>.norca.hcl`, an ACL policy in
`<name>.acl.hcl`, a Variable in `<name>.var.hcl`, and so on: one resource per file, its block
labelled like the file. A block in a file of another name is an error, so a directory listing says
what a module installs.

## 2. Metadata

```hcl {filename="metadata.hcl"}
# A small module: one web service behind a native service with checks.

module {
  name        = "web"
  version     = "0.1.0"
  description = "A stateless web service with health checks, optionally using a database and a message bus."
  url         = "https://example.org/web"
  license     = "MPL-2.0" # of the software the module installs
  category    = "application"
  keywords    = ["web", "http"]

  requires {
    norca    = ">= 0.3.0"
    features = ["releases"]
  }
}
```

- `name` is lower case letters, digits and `-`, at most 63. `version` is strict semver (`0.1.0`, not
  `0.1` and not `v0.1.0`); publishing tags it.
- `category` is one of `application`, `database`, `messaging`, `observability`, `platform`,
  `networking`, `security`, `storage`, `developer-tools`, `ai`, `other`. The catalog filters on it.
- `requires` names the Norca version and the server features the module needs; the servers refuse
  the release (also in a plan) when they can't provide them. A `module "<name>"` block in it names
  another module that must be installed in the namespace or be in the same stack.
- An optional `ui` block next to `module` lays out the tabs of the install form (see
  [metadata.hcl](/docs/rigger/module-language#metadatahcl)).

## 3. Variables

Each variable has a type, an optional default, a description, and checks that run before anything
is evaluated:

```hcl {filename="variables.hcl"}
variable "image" {
  type        = string
  default     = "ghcr.io/example/web:1.4.2"
  description = "Container image of the service."

  validation {
    pattern = "^[a-z0-9./_-]+:[A-Za-z0-9._-]+$"
  }

  ui {
    tab   = "general"
    group = "Image"
  }
}

variable "image_digest" {
  type        = string
  default     = ""
  description = "Digest of the image (sha256:...). Empty runs the tag."

  validation {
    pattern = "^(|sha256:[0-9a-f]{64})$"
  }

  ui {
    tab   = "general"
    group = "Image"
  }
}

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

variable "datacenters" {
  type        = list(string)
  default     = ["*"]
  description = "Datacenters the instances may run in."

  validation {
    min_items = 1
  }
}

variable "resources" {
  type = object({
    cpu    = optional(number, 200)
    memory = optional(number, 128)
  })
  default     = {}
  description = "CPU (MHz) and memory (MiB) of an instance."

  ui {
    tab = "resources"
  }
}

variable "log_level" {
  type        = string
  default     = "info"
  description = "Log level of the service."

  validation {
    one_of = ["debug", "info", "warn", "error"]
  }
}

# Where the service finds what it depends on. A stack fills these from the
# outputs of other modules.

variable "database" {
  type = object({
    service = string
    name    = string
  })
  default     = null
  description = "Native service name and database name of a PostgreSQL the service uses."

  ui {
    tab = "connections"
  }
}

variable "database_secret" {
  type        = string
  default     = ""
  description = "Path of the secret with the database credentials (items user, password)."

  # The value is a path in the secret store, never the secret.
  validation {
    pattern = "^([a-z0-9_-]+/)*[a-z0-9_-]*$"
  }

  ui {
    tab    = "connections"
    widget = "secret-path"
  }
}

rule "database_needs_its_secret" {
  condition     = var.database == null || var.database_secret != ""
  error_message = "database needs database_secret: the path of the secret with the credentials."
}
```

(The module has one more variable, `bus`, of the same shape as `database`.)

- **Types** are those of HCL: `string`, `number`, `bool`, `list(...)`, `set(...)`, `map(...)`,
  `object({...})` with `optional(type, default)` attributes, `tuple([...])`, `any`.
- **`validation`** checks one value: `pattern`, `min_length`/`max_length`, `min`/`max`/`integer`,
  `min_items`/`max_items`, `unique`/`unique_by`, `one_of`/`item_of`, `key_pattern`, and nested
  `attribute "<name>"` and `item` blocks. A value that fails is refused before evaluation, with the
  name of the variable.
- **`rule`** checks several variables together.
- **`ui`** gives the install form of the web UI its tabs, groups, labels and widgets. It changes
  nothing of an install.
- A variable **without a default is required**: an install without a value for it fails with
  "No value for a variable".

## 4. Locals

```hcl {filename="locals.hcl"}
locals {
  name = rigger.release

  # Environment built from data: only what is configured appears.
  env = merge(
    {
      LOG_LEVEL = var.log_level
      HTTP_ADDR = "0.0.0.0:8080"
    },
    var.database == null ? {} : {
      DB_SERVICE = var.database.service
      DB_NAME    = var.database.name
    },
    var.bus == null ? {} : {
      NATS_SERVICE = var.bus.service
    },
  )
}
```

`rigger.release` is the name of the release being installed; `rigger.namespace`, `rigger.region`,
`rigger.module.name` and `rigger.module.version` are the other facts. **Name jobs after the release**,
so that two releases of the module in one namespace do not meet.

There are no templates in a module. Conditions and loops are `dynamic` blocks, `for` expressions and
the `enabled` meta-argument; configuration files are built from data with an encoder (`jsonencode`,
`yamlencode`, `tomlencode`, `natsconf`); longer texts use HCL's own template syntax
(`%{ if }`, `%{ for }`) or `templatefile()` of a file under `files/`.

## 5. The job

A job file holds one `job` block in Norca's job specification, with Rigger's values in it:

```hcl {filename="web.norca.hcl"}
job "web" {
  id          = local.name
  name        = local.name
  type        = "service"
  datacenters = var.datacenters

  update {
    max_parallel     = 1
    min_healthy_time = "10s"
    auto_revert      = true
  }

  group "web" {
    count = var.count

    network {
      port "http" {
        to = 8080
      }
    }

    # Only with a database: the task may read its credentials.
    dynamic "secret_access" {
      for_each = var.database == null ? [] : [var.database_secret]
      content {
        path = secret_access.value
      }
    }

    service {
      name     = local.name
      port     = "http"
      provider = "nomad"

      check {
        name     = "ready"
        role     = "readiness"
        type     = "http"
        path     = "/healthz"
        interval = "10s"
        timeout  = "2s"
      }

      check {
        name     = "alive"
        role     = "liveness"
        type     = "http"
        path     = "/livez"
        interval = "30s"
        timeout  = "2s"
      }
    }

    task "web" {
      driver = "docker"

      config {
        image = image_ref(var.image, var.image_digest)
        ports = ["http"]
      }

      env = local.env

      # The credentials reach the task at run time; the {{ }} below is the
      # task template of the cluster, Rigger only fills in the path.
      dynamic "template" {
        for_each = var.database == null ? [] : [var.database_secret]
        content {
          destination = "secrets/db.env"
          env         = true
          data        = <<-EOT
            {{ with nomadSecret "${template.value}" }}
            DB_USER={{ .user }}
            DB_PASSWORD={{ .password }}
            {{ end }}
          EOT
        }
      }

      resources {
        cpu    = var.resources.cpu
        memory = var.resources.memory
      }
    }
  }
}
```

What to look for:

- **Install time and run time.** `var.*`, `local.*`, `module.*` and `rigger.*` are resolved by
  Rigger. Everything else (`${NORCA_PORT_http}`, `${attr.kernel.name}`, the `{{ }}` of a task
  template) belongs to the cluster and passes through unchanged.
- **`image_ref(image, digest)`** pins the image by its digest when one is given.
- A job is decoded by Norca's own job decoder, so `module validate` reports the errors a server
  would.
- Values that only exist on the node are written with the runtime functions: `runtime("node.datacenter")`,
  `runtime_env("NORCA_TASK_DIR")`, `secret_ref(path, item)`, `variable_ref(path, item)` and
  `service_address(name)`. The postgres module of the Norca registry, for example, writes the
  address of its server and its password into a task template:

  ```hcl
  template {
    destination = "secrets/pg.env"
    env         = true
    data        = <<-EOT
      PGHOST=${service_address(local.job, { port = false })}
      PGPASSWORD=${secret_ref(local.superuser_secret, "password", { quote = false })}
    EOT
  }
  ```

  See [runtime references](/docs/rigger/expressions-and-functions#runtime-references).

## 6. A Variable with a secret item

**A sensitive value never goes into a job and never into the record of a release.** It may only be
an item of a Variable resource, where it becomes a secret item: the servers write it to the Variable
and keep it out of every revision. The `redis` module of the Norca registry does it this way:

```hcl {filename="variables.hcl (redis)"}
variable "redis_password" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Password of Redis; goes into the Norca Variable only, never into the release history."

  ui {
    tab     = "security"
    group   = "Authentication"
    order   = 2
    show_if = "auth_enabled"
  }
}
```

```hcl {filename="auth.var.hcl (redis)"}
variable "auth" {
  enabled = var.auth_enabled

  path = local.auth_path

  items {
    user     = "default"          # the user of Redis the password belongs to
    password = var.redis_password # sensitive: a secret item of the release
  }
}
```

`enabled` is a meta-argument: with `false` the resource is not part of the release. The job reads the
Variable at run time (`{{ with nomadVar "..." }}` in a task template). A sensitive value used anywhere
else is an error: "A sensitive value can't be used in ...".

## 7. A hook

A batch job with a `hook` block runs at a phase of the release instead of being installed as a
service. From `postgres-demo` of the Norca registry (abbreviated):

```hcl {filename="databases.norca.hcl"}
job "databases" {
  enabled = length(var.databases) > 0

  id   = "${local.job}-databases"
  name = "${local.job}-databases"
  type = "batch"

  hook {
    on      = ["post-install", "post-upgrade"]
    weight  = 10
    timeout = "5m"
    delete  = "on-success"
  }

  # group "databases" { ... }
}
```

`on` takes `pre-install`, `post-install`, `pre-upgrade`, `post-upgrade`, `pre-delete`,
`post-delete` and `test`. See [hooks and tests](/docs/rigger/releases#hooks-and-tests).

## 8. Outputs

```hcl {filename="outputs.hcl"}
output "service" {
  value       = rigger.release
  description = "Native service name of the web service."
}
```

A stack reads an output as `module.<release>.<output>` and passes it to another module. `module render`
prints the outputs with the resources.

## 9. Example values and tests

A values file sets variables; every file of `examples/` is evaluated by `module validate`:

```hcl {filename="examples/with-database.vars.hcl"}
count     = 3
log_level = "debug"

database = {
  service = "postgres"
  name    = "shop"
}

database_secret = "postgres/apps/shop"
```

A test evaluates the module with values and checks assertions over the resources (`resource.<block>.<name>`)
and outputs (`output.<name>`), or expects an error:

```hcl {filename="tests/web.riggertest.hcl"}
test "defaults" {
  release = "web"

  assert {
    condition     = resource.job.web.group.web.count == 2
    error_message = "the default is two instances"
  }

  assert {
    condition     = length(resource.job.web.group.web.secret_access) == 0
    error_message = "without a database the task reads no secret"
  }
}

test "with a database" {
  release = "shop"

  values = {
    database        = { service = "postgres", name = "shop" }
    database_secret = "postgres/apps/shop"
  }

  assert {
    condition     = resource.job.web.id == "shop" && resource.job.web.name == "shop"
    error_message = "the job is named after the release, so two releases of the module do not meet"
  }

  assert {
    condition     = resource.job.web.group.web.task.web.env.DB_NAME == "shop"
    error_message = "the database name reaches the environment"
  }
}

test "a database without its secret is refused" {
  values = {
    database = { service = "postgres", name = "shop" }
  }

  expect_error = "database needs database_secret"
}
```

## 10. Check it without a cluster

```shell
rigger fmt web                      # format the files (--check: only report)
rigger module validate web          # files, icon, tests parsed, every example and the defaults rendered
rigger module test web              # run tests/*.riggertest.hcl
rigger module render web -f web/examples/with-database.vars.hcl --release shop --namespace apps
```

`module validate` evaluates the module with every file of `examples/` and, when every variable has a
default, with no values; it decodes each job with Norca's decoder, and warns of a variable that changes
nothing. `module render` prints the resources and outputs as JSON; secret items are named, never shown.

## 11. Install it

```shell
norca rigger install ./web --name shop --namespace apps -f web/examples/with-database.vars.hcl
norca rigger release status shop --namespace apps
norca rigger install ./web --name shop --namespace apps --var count=4     # an upgrade: revision 2
norca rigger release rollback shop --namespace apps                       # back to revision 1, as revision 3
```

A module of a directory has no registry, no version check and no signature: it is installed as it is
on the disk. See [lifecycle](/docs/rigger/lifecycle).

## 12. Publish a version

A version of a module is a **signed git tag** in a registry repository:

```plaintext
my-registry/                     a git repository
  modules/web/                   the module; tag web/v0.1.0
  modules/cache/                 another; tag cache/v1.2.0
  modules/lib/placement/         a library module the others call (../lib/placement)
  stacks/shop/                   a published stack; tag shop/v1.0.0
```

(A repository of one module keeps it at the root and tags `v<version>`.)

```shell
export RIGGER_KEY_PASSWORD='a long password'
rigger key generate --out keys/acme               # keys/acme.key (encrypted) and keys/acme.pub
cd my-registry
git add -A && git commit -s -m "web 0.1.0"
rigger module publish modules/web --key ../keys/acme.key
rigger key verify modules/web --key ../keys/acme.pub
git push origin main web/v0.1.0
```

`module publish` validates the module as it is in the commit of `HEAD` (not the files on disk), signs
its tree digest into `modules/web/.rigger-signatures/<key ID>.json`, commits the signature, and tags
that commit `web/v0.1.0`. **It pushes nothing.** A tag is never moved: a changed module is a new
version. Keep the private key out of every repository.

Anyone can now install the version from the repository:

```shell
rigger show github.com/acme/my-registry//modules/web
rigger install github.com/acme/my-registry//modules/web --version "~> 0.1" --name shop
```

A stack names the repository as a registry and the module as `<registry>/web`; see
[writing a stack](/docs/rigger/writing-a-stack). An OCI registry is the other way to publish:
`rigger module publish modules/web --to oci://registry.example.com/acme/web`.

## 13. Get it listed in the global registry

The global registry lists a version once it passes its checks, as `<namespace>/<name>`:

1. Ask for a namespace with the issue form *Request a namespace* of
   [norca-global-registry](https://github.com/bacanoo-io/norca-global-registry): the owner, the
   repositories and their layout, and your public keys. The maintainers add
   `namespaces/<namespace>.json` and `keys/<namespace>/`.
2. Publish and push tags as above.
3. The *Update* workflow of the global registry lists every new tag of your repositories that
   validates, whose metadata names the tag's name and version, that a key of your namespace signs,
   and that is not blocked. A tag that fails stays out and is shown in the summary of the run.

Then `source = "acme/web"` in a stack, `rigger install acme/web` and `rigger show acme/web` find it,
and the servers offer it after the next `rigger registry sync global`. A listed version never changes;
a faulty one is answered by a newer one. See [publishing and signing](/docs/rigger/publishing).
