---
title: "Command: rigger show"
linkTitle: "rigger show"
description: "The rigger show command shows one module or stack of a registry without a cluster: its versions, signers, variables and outputs."
---

The `rigger show` command shows one module or stack of a registry. It needs no cluster and never
reads `NORCA_ADDR`. The version shown is the one [`rigger install`](/docs/commands/rigger/install)
would take, fetched and verified the same way.

## Usage

```plaintext
norca rigger show <source> [-version constraint] [-kind module|stack] [-readme] [-json]
```

**The source** is that of an install:

- `<namespace>/<name>`: a module or stack of the global registry, such as `norca/redis`;
- `builtin/<name>`: a module built into the program;
- a git address: `<repository>//modules/<name>` or `<repository>//stacks/<name>` in a registry
  repository;
- `oci://<host>/<repository>`.

Of the source, the newest version that meets `-version` is fetched and verified:

- **A version of the global registry** is taken only with the tree digest its index lists and signed
  by a key of its namespace. Its advisories are shown as warnings.
- **An unsigned git or OCI version** is shown with a warning.
- **A built-in module** is of the version the program ships; `-version` is checked against it.

A name of the global registry is a module, unless the registry lists only a stack of that name.
The directory `stacks/<name>` of a git address is a stack. `-kind` decides when needed.

The output shows:

- the name and version; the description, url, license, category, keywords and requirements;
- the versions the source has, newest first;
- the repository, tag, commit and tree digest;
- the key IDs of the signatures, or `not signed`;
- the variables: name, type, default, whether required, whether sensitive, description. **The
  default of a sensitive variable is never shown.**
- the outputs;
- for a stack, its modules, with their sources, version constraints and the versions its lock file
  pins.

Warnings are written to standard error.

## Show Options

- `-version`: A version constraint (`"~> 1.2"`). Defaults to the newest version.

- `-kind`: `module` or `stack`, for a name of the global registry that is both.

- `-readme`: Also print the `README.md` of the module or stack.

- `-json`: Write the details as JSON.

## Examples

```shell
$ norca rigger show norca/redis
$ norca rigger show norca/nats -version "~> 2.0" -readme
$ norca rigger show builtin/redis -json
$ norca rigger show acme/data-platform -kind stack
$ norca rigger show github.com/acme/rigger-modules//modules/web
```
