---
title: "Namespace Specification"
description: "Learn about Norca's Namespace specification."
upstream:
  path: "website/content/docs/other-specifications/namespace.mdx"
---

Norca Namespaces may be specified as HCL files and submitted by the [`norca
namespace apply`][cli_ns_apply] CLI command.

Unlike [Job specifications][jobspecs], Namespace specifications do *not*
support [HCL2][hcl2] features like functions.

Example namespace specification:

```hcl
name        = "prod-eng"
description = "Namespace for production workloads."

# Attach a resource quota (see the quotas feature page).
quota = "eng"

meta {
  owner = "eng"
}

capabilities {
  enabled_task_drivers  = ["java", "docker"]
  disabled_task_drivers = ["raw_exec"]
}
```

## Namespace Specification Parameters

- `name` `(string: <required>)` - Specifies the namespace to create or update.

- `description` `(string: "")` - Specifies an optional human-readable
  description of the namespace.

- `quota` `(string: "")` - Specifies the name of a quota specification to
  attach to the namespace. See [resource quotas](/docs/features/quotas).

- `meta` `(object: null)` - Optional object with string keys and values of
  metadata to attach to the namespace. Namespace metadata is not used by Norca
  and is intended for use by operators and third party tools.

- `capabilities` <code>([Capabilities](#capabilities-parameters): &lt;optional&gt;)</code> -
  Specifies capabilities allowed in the namespace. These values are checked at
  job submission.

- `node_pool_config` - Not supported in Norca: a namespace specification
  with a `node_pool_config` block is rejected.

### `capabilities` Parameters

- `enabled_task_drivers` `(array<string>: [])` - List of task drivers allowed
  in the namespace. If empty all task drivers are allowed.

- `disabled_task_drivers` `(array<string>: [])` - List of task drivers disabled
  in the namespace.

[cli_ns_apply]: /docs/commands/namespace/apply/
[hcl2]: /docs/job-specification/hcl2/
[jobspecs]: /docs/job-specification/
