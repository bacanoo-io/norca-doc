---
title: "Command: version"
linkTitle: "version"
description: "Display the version and build data of Norca"
upstream:
  path: "website/content/docs/commands/version.mdx"
---

The `version` command displays build information about the running binary,
including the release version, build date, and the exact revision.

## Usage

```plaintext
norca version
```

## Output

This command prints the Norca version together with the Nomad API version it is
compatible with, and info about the git commit that was used to build the
binary. `BuildDate` is when the commit was made,
and `Revision` is the exact commit SHA.

The SHA may also have the string `+CHANGES` appended to the end,
indicating that local, uncommitted changes were detected at build time.

## Examples

```shell
$ norca version
Norca v0.1.0 (Nomad API 1.6.5 compatible)
BuildDate 2026-10-26T12:00:00Z
Revision 55c9cca90
```
