---
title: "Command: volume init"
linkTitle: "volume init"
description: "Generate an example volume specification."
upstream:
  path: "website/content/docs/commands/volume/init.mdx"
---

The `volume init` command is used to create an example volume specification
file that can be used as a starting point to customize further.

## Usage

```plaintext
norca volume init
```

## Init Options

- `-json`: Create an example JSON volume specification.

## Examples

Create an example volume specification:

```shell
$ norca volume init
Example volume specification written to volume.hcl
```
