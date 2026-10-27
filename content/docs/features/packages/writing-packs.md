---
title: "Writing packs and pack registries"
linkTitle: "Writing packs"
weight: 2
description: "How to write your own packs and pack registries: the registry and pack layout, metadata.hcl, variables.hcl, templates, helper templates, dependencies, testing and publishing."
origin: "Nomad Pack v0.4.2 docs/writing-packs.md (MPL 2.0, (c) HashiCorp, Inc.), modified"
---

This guide walks through the steps of writing your own packs and pack registries. For basic use see
[Using norca pack](/docs/features/packages/pack). Norca's additions to the format (resources other than
jobs, requirements, the variables schema, hooks) are described in
[Releases](/docs/features/packages/releases#extended-package-format).

`norca pack generate registry <name> --with-sample-pack` and `norca pack generate pack <name>`
create the skeletons described below.

## Step one: create a registry

First, make a pack registry: a repository that holds the structure, templates and metadata of your
packs.

The [Norca pack registry](https://github.com/bacanoo-io/norca-registry) is a complete example: packs
with Norca's extended package format (object kinds, ACL and admission policies,
`values.schema.json`) and its local checks (`scripts/check-packs.sh`).

Each registry should have a `README.md` file that describes the packs in it, and a top-level
directory named `packs` that contains a subdirectory for each pack. Conventionally, the pack
subdirectory name matches the pack name.

The top level of a pack registry looks like this:

```plaintext
.
├── README.md
└── packs
    ├── <PACK-NAME-A>
    │   └── ...pack contents...
    ├── <PACK-NAME-B>
    │   └── ...pack contents...
    └── ...packs...
```

## Step two: add a pack

To add a new pack, create a new directory in the `packs` directory of the registry. It contains:

- A `README.md` file with a human-readable description of the pack, often including its
  prerequisites and dependencies.
- A `metadata.hcl` file with information about the pack.
- A `variables.hcl` file that defines the variables of the pack.
- An optional, but highly encouraged, `CHANGELOG.md` file that lists the changes of each version.
- An optional `outputs.tpl` file that defines an output printed when the pack is deployed.
- A `templates` subdirectory with the templates the resources are rendered from.
- Optionally a `values.schema.json` file, a JSON Schema for the variable values
  ([variables schema](/docs/features/packages/releases#variables-schema)).

### metadata.hcl

The `metadata.hcl` file contains key information about the pack. It has the following blocks and
attributes:

- `app { url }` - The HTTP(S) URL of the homepage of the application, as a quick reference to its
  documentation.
- `app { author }` - Optional author of the application.
- `pack { name }` - The name of the pack.
- `pack { description }` - A short overview of the application the pack deploys.
- `pack { version }` - The version of the pack.
- `pack { url }`, `pack { alias }` - Optional URL of the pack and a default alias.
- `pack { requires { norca, features } }` - (Norca) The Norca version and the server features the pack
  needs; `nomad_fork` is accepted as an alias of `norca`. See
  [requirements](/docs/features/packages/releases#extended-package-format).
- `dependency "<name>" { source, ref, alias, enabled }` - The dependencies of the pack on other packs.
  Several dependencies can be given.
- `variables_schema` - (Norca) A JSON Schema for the variable values, usually
  `file("values.schema.json")`.
- `regions` - (Norca) The regions to install the pack in by default
  ([multi-region installs](/docs/features/packages/releases#multi-region-installs)).

An example `metadata.hcl` file:

```hcl {filename="metadata.hcl"}
app {
  url = "https://github.com/example/hello_world_server"
}

pack {
  name        = "hello_world"
  description = "This pack contains a single job that renders hello world, or a different greeting, to the screen."
  version     = "0.3.2"

  requires {
    norca = ">= 0.1.0"
  }
}

variables_schema = file("values.schema.json")
```

### variables.hcl

The `variables.hcl` file defines the variables needed to render all templates of the `templates`
directory. Variables are written in HCL, with a description, a type and an optional default.

An example `variables.hcl` file:

```hcl {filename="variables.hcl"}
variable "datacenters" {
  description = "A list of datacenters in the region which are eligible for task placement."
  type        = list(string)
  default     = ["dc1"]
}

variable "region" {
  description = "The region where the job should be placed."
  type        = string
  default     = "global"
}

variable "app_count" {
  description = "The number of apps to be deployed"
  type        = number
  default     = 3
}

variable "resources" {
  description = "The resource to assign to the application."
  type = object({
    cpu    = number
    memory = number
  })
  default = {
    cpu    = 500,
    memory = 256
  }
}
```

Never take secrets from pack variables: their values end up in the shell history and, for
releases, in the revision. Read them in the job from the
[built-in secret store](/docs/features/secrets) or Variables, or pass them with `--var-secret` to a
Variables template ([secrets](/docs/features/packages/releases#extended-package-format)).

### outputs.tpl

`outputs.tpl` is an optional file that defines an output printed when the pack is deployed.

Output files have access to the pack variables and the template functions. A simple example:

```plaintext {filename="outputs.tpl"}
Congrats on deploying [[ meta "pack.name" . ]].

There are [[ var "app_count" . ]] instances of your job now running on Norca.
```

### README and CHANGELOG

No specific format is required for the `README.md` or `CHANGELOG.md` files. The packs of the Norca
pack registry describe what the pack deploys, its prerequisites, variables, checks and limitations,
and the license of the software it references.

## Step three: write the templates

Each file at the top level of the `templates` directory with the extension `.nomad.tpl` defines a
job. The file name before the extension can be any UTF-8 text. Norca adds further extensions for
namespaces, quotas, ACL policies, Variables, object kinds, admission policies and custom objects (for
example `controller.acl.hcl.tpl`); see the
[extended package format](/docs/features/packages/releases#extended-package-format).

Helper templates, which can be included in other templates, have names starting with an underscore
`_` and the extension `.tpl`.

When deploying, `norca pack` renders each resource template with the variables provided, and the
rendered resources are applied to the cluster.

### Template basics

Templates use the Go template syntax (`text/template`), so they can contain logic where necessary.
Unlike the default Go template syntax, `norca pack` uses `[[` and `]]` as delimiters, so the
`{{ }}` of job `template` blocks pass through unchanged.

The functions `var`, `vars`, `meta` and `metas` read the variables and the metadata of the pack from
the template context `.`; `must_var` and `must_meta` fail if the key does not exist.

An example template using the variables above:

```hcl {filename="templates/hello_world.nomad.tpl"}
job "hello_world" {
  region      = [[ var "region" . | quote ]]
  datacenters = [[ var "datacenters" . | toStringList ]]
  type        = "service"

  group "app" {
    count = [[ var "app_count" . ]]

    network {
      port "http" {
        static = 80
      }
    }

    [[/* this is a go template comment */]]

    task "server" {
      driver = "docker"
      config {
        image        = "registry.example.internal/hello_world:1.0"
        network_mode = "host"
        ports        = ["http"]
      }

      resources {
        cpu    = [[ var "resources.cpu" . ]]
        memory = [[ var "resources.memory" . ]]
      }
    }
  }
}
```

This is a relatively simple template that mostly sets variables. Templates can use control
structures such as `if`, `range` and `with`, and pipelines:

```plaintext
datacenters = [ [[ range $idx, $dc := var "datacenters" . ]][[ if $idx ]],[[ end ]][[ $dc | quote ]][[ end ]] ]
```

Packs written for the legacy Nomad Pack syntax (variables as `.pack_name.variable`) can be rendered
with `--parser-v1` while they are migrated.

### Template functions

Besides the standard Go template functions, all functions of the
[Sprig](https://masterminds.github.io/sprig/) library are available: string manipulation,
cryptographic functions, data conversion (for instance to and from JSON) and more.

Custom functions are also provided:

- `nomadRegions` returns the regions of the cluster (`/v1/regions`).
- `nomadNamespaces` returns the namespaces (`/v1/namespaces`).
- `nomadNamespace` takes a namespace name and returns that namespace (`/v1/namespace/:namespace`).
- `spewDump` dumps the entirety of the passed object as a string, with the types and values. This
  uses the `spew.Sdump` function.
- `spewPrintf` formats the supplied arguments into a string according to the supplied format. This
  uses the `spew.Sprintf` function.
- `fileContents` reads a file on the local host, relative to the directory `norca pack` is invoked
  in, and returns its contents as a string. `fileRelative` reads a file relative to the pack
  directory (`[[ fileRelative "files/app.conf" . ]]`).
- `packPath` returns the path of the pack being rendered.
- `toStringList` renders a list as an HCL list of quoted strings.
- `tpl` renders a template string with the current template context, useful for dynamic templates
  stored in variables.

A custom function within a template is called like any other:

```plaintext
[[ nomadRegions ]]
[[ nomadRegions | spewDump ]]
```

All functions are described in [Template functions](/docs/features/packages/functions).

### Helper templates

Complex packs often reuse template snippets across several resources. For instance, if a pack
defines two jobs that use the same `region` logic, a helper template can hold that logic.

Helper template names start with an underscore `_` and end in `.tpl`. A helper called
`_region.tpl` could contain:

```plaintext {filename="templates/_region.tpl"}
[[- define "region" -]]
[[- if var "region" . -]]
region = [[ var "region" . | quote ]]
[[- end -]]
[[- end -]]
```

Then in the templates `job_a.nomad.tpl` and `job_b.nomad.tpl`, render the helper by its name:

```hcl
job "job_a" {
  type = "service"

  [[ template "region" . ]]

  ...etc...
}
```

### Pack dependencies

Packs can depend on content from other packs.

First, packs must declare their dependencies in `metadata.hcl`. A pack with a dependency looks like
this:

```hcl {filename="metadata.hcl"}
app {
  url = "https://some-url-for-the-application.dev"
}

pack {
  name        = "simple_service"
  description = "This pack contains a simple service job, and depends on another pack."
  version     = "0.2.1"
}

dependency "demo_dep" {
  source = "git://source.git/packs/demo_dep"
}
```

The dependency name label must match the `name` of the dependency pack, as given in its
`metadata.hcl`; `alias` gives the dependency another name in the template context (for example to
use the same pack twice), and `enabled = false` leaves it out. Dependencies with an `oci://` source are pulled from OCI registries
and verified against the trust policy
([supply chain](/docs/features/packages/supply-chain#packlock)).

The templates of `simple_service` can then use the helper templates of `demo_dep`, passing the
dependency's context (`.demo_dep`) so that `var` and `meta` read its values:

```plaintext
[[ template "demo_dep.data" .demo_dep ]]
```

`norca pack deps vendor` copies the dependencies into the `deps/` directory of the pack and records
their digests in `pack.lock`.

## Step four: test the pack

While writing a pack, test it by passing the directory path as the pack name to the `run`, `plan`,
`render`, `info`, `stop` or `destroy` commands. Relative paths are supported.

For instance, if your current working directory is the directory of the pack and `norca` is on your
path, run:

```shell
norca pack render .
norca pack plan .
norca pack run .
```

Packs used this way show up in the output with a development registry and ref.

`norca pack fmt` formats the HCL templates and files of a pack (`-check` only reports, `-recursive`
descends into directories). Rendered jobs can be validated without an agent with
`norca job validate`; the Norca pack registry runs both in its `scripts/check-packs.sh`.

## Step five: publish your registry

To share your packs, push the git repository to a URL that the clients can reach, or publish the
packs to an OCI registry with `norca pack push`, optionally signed
([supply chain](/docs/features/packages/supply-chain)).

If you wish to share packs for infrastructure that runs on Norca, consider adding them to the
[Norca pack registry](https://github.com/bacanoo-io/norca-registry) (its README lists the checks a pack
needs).

If you don't want to host a pack registry in version control, you can work locally with pack
directories.

## Step six: deploy your pack

Add your registry using the `norca pack registry add` command:

```shell
norca pack registry add my_packs github.com/<YOUR_ORG>/<YOUR_REPO>
```

Deploy your packs:

```shell
norca pack run hello_world --var app_count=1 --registry=my_packs
```

You can now write and share your own packs for Norca.

---

Origin: adapted from `docs/writing-packs.md` of Nomad Pack v0.4.2 (MPL 2.0, (c) HashiCorp, Inc.),
modified for Norca.
