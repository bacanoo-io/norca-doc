---
title: "Command: rigger module"
linkTitle: "rigger module"
description: "The rigger module command validates, tests and renders a module without a cluster, and publishes it."
---

The `rigger module` command works on one **module**: a directory of HCL files with its variables, its
jobs and other resources, and its tests. `validate`, `test` and `render` need no cluster. See
[modules and stacks](/docs/features/packages/modules).

## Usage

```plaintext
norca rigger module validate [dir]
norca rigger module test [dir]
norca rigger module render [dir] [-f values.vars.hcl] [-var name=value] [-release name] [-namespace ns] [-region region]
norca rigger module publish [dir] [-key name.key]
norca rigger module publish [dir] -to oci://host/repository
```

`dir` defaults to the current directory.

| Command | What it does |
| --- | --- |
| `module validate` | Checks the files of the module, its icon and its tests, and renders its example values. |
| `module test` | Runs the tests of the module (`tests/*.riggertest.hcl`): values in, assertions over its resources. |
| `module render` | Evaluates the module and prints its resources and outputs as JSON. **Secret items are named, not shown.** |
| `module publish` | Signs the module, commits the signature and tags the version in its git repository (the tag is not pushed). With `-to`, pushes the module to an OCI repository instead, with its child modules and signatures, tagged with its version. |

## Render Options

- `-f`: A file of values (`*.vars.hcl`). May be given more than once; a later one wins.

- `-var`: A value, `name=value`; wins over the files. May be given more than once. The value of a
  string, number or bool variable is the text as it is; the value of a list or an object is HCL:
  `'tags=["a", "b"]'`. An environment variable `RIGGER_VAR_<name>` gives a value the same way; a
  `-var` wins over it.

- `-release`: The name of the release. Defaults to the name of the module.

- `-namespace`: The namespace of the release. Defaults to `default`.

- `-region`: The region of the release. Defaults to `global`.

## Publish Options

- `-key`: The private key the version is signed with, for a version tagged in git. Its password is
  read from `RIGGER_KEY_PASSWORD`.

- `-to`: The OCI repository, `oci://<host>/<repository>`. Without it the version is tagged in git.

## Examples

```shell
$ norca rigger module validate ./example/modules/test-app
$ norca rigger module test ./example/modules/test-app
$ norca rigger module render ./example/modules/test-app -f values.hcl -release web -namespace apps
```

Publish a version with a key, then push its tag:

```shell
$ norca rigger key generate -out acme
$ norca rigger module publish modules/redis -key acme.key
$ git push origin redis/v1.0.0
```
