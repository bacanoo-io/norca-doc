---
title: "Expressions, functions and runtime references"
linkTitle: "Expressions and functions"
weight: 6
description: "What a module and a stack can refer to (var, local, module, stack, rigger, each, count), the functions of Rigger, the encoders that write configuration files, templates, sensitive values, and the runtime references that the cluster resolves on the node: runtime, runtime_env, secret_ref, variable_ref, service_address, service_addresses."
---

Modules and stacks are written in HCL: the expressions, operators, conditionals (`a ? b : c`),
`for` expressions, splats and string templates (`"${...}"`, `%{ if }`, `%{ for }`) of HCL all work.
`dynamic` blocks write repeated nested blocks. This page lists what Rigger adds.

## References

| Reference | In | Is |
| --- | --- | --- |
| `var.<name>` | module, stack | The value of a variable. |
| `local.<name>` | module, stack | A local of `locals.hcl`. |
| `module.<name>.<output>` | module | An output of a child module of `modules.hcl`. |
| `module.<release>.<output>` | stack | An output of a release of the stack; the release is installed first. |
| `stack.<part>.<output>` | stack | An output of a part (a published stack taken as a part). |
| `rigger.release`, `rigger.namespace`, `rigger.region` | module | The release being installed: its name, namespace and region. |
| `rigger.module.name`, `rigger.module.version` | module | The module being installed. |
| `rigger.stack`, `rigger.namespace`, `rigger.region` | stack | The stack: its name, default namespace and region. |
| `each.key`, `each.value` | resource with `for_each` | The key and the element of the copy. |
| `count.index` | resource with `count` | The index of the copy. |
| `resource.<block>.<name>`, `output.<name>` | test | The evaluated resources and outputs. |

**Install time and run time.** These references are resolved by Rigger when it evaluates the module.
Everything else in a job is the cluster's and passes through as it is written: `${NORCA_PORT_http}`,
`${attr.kernel.name}`, `${meta.rack}` in an attribute, the `{{ }}` of a task template. `$${...}` writes
a literal `${...}`, `%%{` a literal `%{`.

## Functions

The functions of HCL's standard library, under the names module authors know from other HCL tools.
**None reads the environment or the network**, and `file()` and `templatefile()` read only the
module's own files.

| Group | Functions |
| --- | --- |
| Numbers | `abs`, `ceil`, `floor`, `log`, `max`, `min`, `parseint`, `pow`, `signum` |
| Strings | `chomp`, `format`, `formatlist`, `indent`, `join`, `lower`, `regex`, `regexall`, `regex_replace`, `replace`, `split`, `strlen`, `strrev`, `substr`, `title`, `trim`, `trimprefix`, `trimsuffix`, `trimspace`, `upper` |
| Collections | `chunklist`, `coalesce`, `coalescelist`, `compact`, `concat`, `contains`, `distinct`, `element`, `flatten`, `index`, `keys`, `length`, `lookup`, `merge`, `range`, `reverse`, `setintersection`, `setproduct`, `setsubtract`, `setunion`, `slice`, `sort`, `values`, `zipmap` |
| Encoding | `csvdecode`, `jsondecode`, `jsonencode`, `yamlencode`, `tomlencode`, `natsconf` |
| Time | `formatdate`, `timeadd` |
| Logic and errors | `alltrue`, `anytrue`, `can`, `try` |
| Types | `tobool`, `tonumber`, `tostring`, `tolist`, `toset`, `tomap`, `issensitive` |
| Files of the module | `file(path)`, `templatefile(path, vars)` |
| Images | `image_ref(image, digest)` |
| Run time | `runtime`, `runtime_env`, `secret_ref`, `variable_ref`, `service_address`, `service_addresses` |

Notes:

- `coalesce` skips empty strings as well as nulls; `length` counts the attributes of an object too.
- `file("files/backup.sh")` returns the content of a file of the module; `templatefile("files/x.tftpl",
  { ... })` renders a file in HCL's template syntax with the variables given. A template can't call
  `templatefile` itself. The path is inside the module; a hidden file is never read.
- `image_ref("ghcr.io/example/web:1.4.2", "sha256:...")` is `ghcr.io/example/web@sha256:...`; with an
  empty digest the image as it is.
- In a stack, `file()` reads the stack's own files (`file("keys/example-registry.pub")`).

## Encoders: configuration files from data

A configuration file of a task is built from data, not from text with holes. From the `nats` module
of the Norca repository's examples
([rigger/examples/registry/modules/nats](https://github.com/bacanoo-io/norca/tree/main/rigger/examples/registry/modules/nats),
abbreviated):

```hcl {filename="locals.hcl"}
locals {
  # null values are left out by the encoder.
  config = {
    server_name = runtime_env("NORCA_ALLOC_NAME")
    listen      = "0.0.0.0:${var.ports.client}"
    http        = "0.0.0.0:${var.ports.monitor}"

    tls      = local.tls ? local.tls_block : null
    accounts = local.auth ? local.accounts_block : null

    cluster = !local.clustered ? null : {
      name      = rigger.region
      listen    = "0.0.0.0:${var.ports.cluster}"
      advertise = runtime_env("NORCA_ADDR_cluster")
      # The other servers, found in the native catalog when the task
      # template renders.
      routes = service_addresses("${local.job}-cluster", { scheme = "nats-route", exclude_self = true })
      tls    = local.tls ? merge(local.tls_block, { verify = true }) : null
    }
  }
}
```

```hcl {filename="nats.norca.hcl"}
template {
  destination   = "secrets/nats.conf"
  perms         = "0600"
  change_mode   = "signal"
  change_signal = "SIGHUP"
  data          = natsconf(local.config)
}
```

The users of `local.accounts_block` carry `password = secret_ref("${var.users_secret_prefix}/${u.name}", "password")`:
the password is read from the secret store when the template renders, quoted for the NATS
configuration.

- `jsonencode`, `yamlencode`, `tomlencode` and `natsconf` (the configuration format of a NATS server)
  write a value. A `null` attribute is left out by `natsconf`. `yamlencode` quotes every string, so
  that no value reads as another type.
- **A runtime reference in the data is quoted for where it sits**: a whole string by the template, a
  part of a string escaped inside the quotes the encoder writes.
- `service_addresses()` in a list is written as the last items of the list, one per instance of the
  service when the task starts.

## Sensitive values

A variable with `sensitive = true`, a value of `"!generate:<name>"`, and anything computed from them
are **sensitive**. A sensitive value:

- is shown as `(sensitive)` in a plan and never stored in a revision of a release;
- may only become an item of a Variable resource, where it is a secret item; anywhere else the
  evaluation fails with "A sensitive value can't be used in ...";
- can't be a meta-argument (`enabled`, `count`, `for_each`) or a hook setting.

`issensitive(value)` tells whether a value is sensitive.

## Runtime references

Some values exist only on the node, when the task starts: an environment variable of the task, a
node attribute, an item of a secret or of a Variable, the address of a service. The runtime functions
return a placeholder that the job decoder writes for where it lands:

- in an attribute of a job, as `${NAME}`, which the client interpolates;
- in the `data` of a task template, as a template action that reads the value when the task starts.

| Function | Gives | Where |
| --- | --- | --- |
| `runtime("<attribute>")` | A node attribute or another value the client fills in: `runtime("node.datacenter")`, `runtime("attr.driver.raw_exec")`, `runtime("meta.rack")`. | Job attributes and templates |
| `runtime_env("<NAME>")` | An environment variable of the task: `runtime_env("NORCA_TASK_DIR")`, `runtime_env("NORCA_ADDR_metrics")`. | Job attributes and templates |
| `secret_ref(path, item, { quote, trim })` | An item of a secret of the built-in secret store. The task fails when the secret has no such item. | Templates only |
| `variable_ref(path, item, { quote, trim })` | An item of a Norca Variable. | Templates only |
| `service_address(name, { scheme, port })` | The address of one instance of a service of the native catalog, `host:port` (`port = false`: the host alone; `scheme = "nats"`: `nats://host:port`). | Templates only |
| `service_addresses(name, { scheme, exclude_self })` | The addresses of all instances, as a list (`exclude_self = true` leaves out the task's own allocation). | Templates only, in an encoder or a string |

Options:

- `quote = "conf"` writes the value as a double-quoted string with `\` and `"` escaped; `quote = "sql"`
  as a single-quoted SQL string with `'` doubled; `quote = false` as it is. Without `quote` the place
  decides: as it is in a plain template, quoted for the format inside an encoder.
- `trim = true` trims white space around the value of a secret or a Variable.

A reference that only a template can resolve, written outside one, is an error of the job ("can be
used only in the data of a task template").

```hcl
constraint {
  attribute = runtime("node.unique.name")
  value     = var.node
}

config {
  args = ["${runtime_env("NORCA_TASK_DIR")}/bootstrap.sh"]
}

template {
  destination = "secrets/pg.env"
  env         = true
  data        = <<-EOT
    PGHOST=${service_address(local.job, { port = false })}
    PGPASSWORD=${secret_ref(local.superuser_secret, "password", { quote = false })}
  EOT
}
```

(From the `consul` and `postgres-demo` modules of the [Norca registry](/docs/rigger/norca-registry).)
The secret and Variable a template reads must be readable by the job: `secret_access` in the group
for a secret, the job's own Variable path (`nomad/jobs/<job>`) or an ACL policy bound to the job for a
Variable.
