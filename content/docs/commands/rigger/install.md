---
title: "Command: rigger install"
linkTitle: "rigger install"
description: "The rigger install command installs or upgrades one release of a module of a directory."
---

The `rigger install` command installs one [release](/docs/features/packages/releases) of a module, or
upgrades it when it exists, and waits until the release is ready.

## Usage

```plaintext
norca rigger install <dir> -name <release> [-namespace ns] [-f values] [-var name=value]
```

**`install` takes a directory.** A module of a registry is installed by its name by the servers
([`PUT /v1/rigger/install`](/docs/api/rigger-install)), from the catalog of the web UI, or as a module
of a [stack](/docs/commands/rigger/stack).

## Install Options

- `-name`: The name of the release.

- `-namespace`: The namespace of the release. Defaults to `default`.

- `-region`: The region of the release. Defaults to the region of the cluster.

- `-f`: A file of values (`*.vars.hcl`). May be given more than once.

- `-var`: A value, `name=value`. May be given more than once. The value of a string, number or bool
  variable is the text as it is; the value of a list or an object is HCL: `'tags=["a", "b"]'`. An
  environment variable `RIGGER_VAR_<name>` gives a value the same way; a `-var` wins over it.

- `-timeout`: How long to wait until the release is ready. Defaults to the timeout of the servers.

- `-adopt`: Take over a release that another manager applied or a stack owns. Without it such an
  install is refused.

- `-server`: Send the command to the servers of the cluster, which evaluate it. Defaults to
  `RIGGER_SERVER`.

## Examples

```shell
$ norca rigger install ./example/modules/test-app -name test-app -namespace apps -f test-app.hcl
$ norca rigger release status test-app -namespace apps
```
