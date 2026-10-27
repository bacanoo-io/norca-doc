---
title: "Command: node pool init"
linkTitle: "node pool init"
description: "Generate an example node pool specification."
upstream:
  path: "website/content/docs/commands/node-pool/init.mdx"
---

The `node pool init` creates an example node pool specification file that can be
used as a starting point to customize further.

## Usage

```plaintext
norca node pool init <filename>
```

When no filename is supplied, a default filename of "pool.nomad.hcl" or
"pool.nomad.json" will be used depending on the output format.

Both templates can be applied as they are with
[`node pool apply`](/docs/commands/node-pool/apply). They have no scheduler
configuration: Norca rejects a node pool with a `scheduler_config` block (JSON
`SchedulerConfiguration`), so the HCL template only explains that in a comment
and the JSON template leaves the field out. The scheduling algorithm and memory
oversubscription are set for the whole cluster with
[`norca operator scheduler set-config`](/docs/commands/operator/scheduler/set-config).

## Init Options

- `-out` `(enum: hcl | json)`: Format of generated node pool
  specification. Defaults to `hcl`.

- `-quiet`: Do not print success message.

## Examples

Create an example node pool specification:

```shell
$ norca node pool init
Example node pool specification written to pool.nomad.hcl
```

Create it in JSON format:

```shell
$ norca node pool init -out=json
Example node pool specification written to pool.nomad.json
```
