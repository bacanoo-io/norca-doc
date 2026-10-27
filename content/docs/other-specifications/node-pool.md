---
title: "Norca Node Pool Specification"
description: "Learn about Norca's Node Pool specification."
upstream:
  path: "website/content/docs/other-specifications/node-pool.mdx"
---

Norca node pools may be specified as HCL files and submitted by the [`norca node
pool apply`][pool-apply] CLI command.

Unlike [Job specifications][jobspecs], Norca node pool specifications do *not*
support HCL2 features like functions.

Example node pool specification, based on the output of [`norca node pool
init`][pool-init]:

```hcl
node_pool "example" {

  description = "Example node pool"

  # meta is optional metadata on the node pool, defined as key-value pairs.
  # The scheduler does not use node pool metadata as part of scheduling.
  meta {
    environment = "prod"
    owner       = "sre"
  }
}
```

Example usage if the above is in a file named `pool.nomad.hcl`:

```shell
$ norca node pool apply ./pool.nomad.hcl
Successfully applied node pool "example"!
```

## Node Pool Specification Parameters

- `description` `(string: <optional>)` - Sets a human readable description for
  the node pool.

- `meta` `(map[string]string: <optional>)` - Sets optional metadata on the node
  pool, defined as key-value pairs. The scheduler does not use node pool
  metadata as part of scheduling.

- `scheduler_config` - Not supported in Norca: a node pool specification
  with a `scheduler_config` block (JSON `SchedulerConfiguration`) is rejected
  with "node pool scheduler_config is not supported". The
  [global scheduler configuration](/docs/commands/operator/scheduler/set-config)
  (scheduling algorithm, memory oversubscription) applies to every node pool;
  set it with `norca operator scheduler set-config`. The templates of
  [`node pool init`][pool-init] contain no scheduler configuration.

[pool-apply]: /docs/commands/node-pool/apply/
[jobspecs]: /docs/job-specification/
[pool-init]: /docs/commands/node-pool/init/
