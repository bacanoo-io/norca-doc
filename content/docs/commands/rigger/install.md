---
title: "Command: rigger install"
linkTitle: "rigger install"
description: "The rigger install command installs or upgrades one release of a module: of a directory, or by its source."
---

The `rigger install` command installs one [release](/docs/features/packages/releases) of a module, or
upgrades it when it exists, and waits until the release is ready.

## Usage

```plaintext
norca rigger install <dir> --name <release> [--namespace ns] [-f values] [--var name=value]
norca rigger install <source> --name <release> [--version constraint] [--namespace ns] [-f values] [--var name=value]
norca rigger install <module> --registry <registry> --server --name <release> [--version constraint] ...
```

**The first argument is a directory or a source.** A path that exists, or one that starts with `.` or
is absolute, is a directory; without an argument it is the current directory. Anything else is the
source of a module:

- `<namespace>/<name>`: a module of the global registry, such as `norca/redis`;
- `builtin/<name>`: a module built into the program, such as `builtin/redis`;
- a git address, or `oci://<host>/<repository>`.

Of a source, the newest version that meets `--version` is installed and verified as the modules of a
[stack](/docs/commands/rigger/stack) are:

- **A version of the global registry** is taken only with the tree digest its index lists and signed
  by a key of its namespace. Its advisories are shown as warnings.
- **An unsigned git or OCI version** installs with a warning.
- **A built-in module** is of the version the program ships; `--version` is checked against it.

**With `--server` the servers fetch the module themselves**, only from what they have:

- `<namespace>/<name>` from the global registry;
- `<name> --registry <registry>` from another [registry of the cluster](/docs/commands/rigger/registry);
- `builtin/<name>` from their own built-in modules.

A registry must have been synced first (`norca rigger registry sync <name>`; the global registry is
`global`), otherwise the servers refuse the install and say so. A git or `oci://` address is refused
in this mode: register its repository as a registry, or install without `--server`. A directory is sent
to the servers as files.

## Install Options

- `--name`: The name of the release.

- `--namespace`: The namespace of the release. Defaults to `default`.

- `--region`: The region of the release. Defaults to the region of the cluster.

- `--version`: A version constraint (`"~> 1.2"`) for a module given by its source. Defaults to the
  newest version. Not allowed with a directory.

- `--registry`: With `--server`, the registry of the cluster to install from; the argument is then the
  module as that registry lists it (`<name>`).

- `-f`, `--values`: A file of values (`*.vars.hcl`). May be given more than once.

- `--var`: A value, `name=value`. May be given more than once. The value of a string, number or bool
  variable is the text as it is; the value of a list or an object is HCL: `'tags=["a", "b"]'`. An
  environment variable `RIGGER_VAR_<name>` gives a value the same way; a `--var` wins over it. **A
  module the servers fetch** (`--server` with a source or `--registry`) is not loaded by the program, so
  there a `--var` is typed as it is written and `RIGGER_VAR_<name>` gives no value.

- `--timeout`: How long to wait until the release is ready. Defaults to the timeout of the servers.

- `--adopt`: Take over a release that another manager applied or a stack owns. Without it such an
  install is refused.

- `--server`: Send the command to the servers of the cluster, which evaluate it. Defaults to
  `RIGGER_SERVER`.

## Examples

```shell
$ norca rigger install ./example/modules/test-app --name test-app --namespace apps -f test-app.hcl
$ norca rigger release status test-app --namespace apps
```

```shell
$ norca rigger install norca/nats --version "~> 2.0" --name nats --namespace apps
$ norca rigger install builtin/redis --name cache --server
$ norca rigger install web --registry acme --name shop --server
```
