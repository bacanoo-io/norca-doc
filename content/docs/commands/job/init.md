---
title: "Command: job init"
linkTitle: "job init"
description: "The job init command is used to generate a skeleton jobspec template."
upstream:
  path: "website/content/docs/commands/job/init.mdx"
---

**Alias: `norca init`**

The `job init` command creates an example [job specification][jobspec] in the
current directory that demonstrates some common configurations for tasks, task
groups, runtime constraints, and resource allocation.

## Usage

```plaintext
norca job init [options] [filename]
```

You may optionally supply a filename for the example job to be written to. The
default filename for the generated file is "example.nomad.hcl".

Please refer to the [jobspec] and [drivers] pages to learn how to customize the
template.

## Init Options

- `-short`: If set, a minimal jobspec without comments is emitted.
- `-connect`: If set, the jobspec includes Consul Connect integration.
- `-template=<template>`: Specifies a predefined template to emit. Must be a Norca Variable that lives at `nomad/job-templates/<template>` These are commonly created via the UI, and accessible with the -list-templates flag.
- `-list-templates`: Display a list of possible job templates to pass to -template. Reads from all variables pathed at `nomad/job-templates/<template>`.

## Examples

Generate an example job file:

```shell
$ norca job init
Example job file written to example.nomad.hcl
```

[jobspec]: /docs/job-specification/ 'Norca Job Specification'
[drivers]: /docs/drivers/ 'Norca Task Drivers documentation'
