---
title: "Command: node meta"
linkTitle: "node meta"
description: "The node meta commands are used to read and update node metadata."
upstream:
  path: "website/content/docs/commands/node/meta/index.mdx"
---

The `meta` command is used to read and update node metadata. This metadata is
available for [interpolation using the `${meta.<key>}` syntax in jobs][interp].

## Usage

Usage: `norca node meta <subcommand> [options]`

The `apply` subcommand allows for dynamically updating node metadata. The
`read` subcommand allows reading all of the metadata set on the client. All
commands interact directly with a client and allow setting a custom target with
the `-node-id` option.

Please see the individual subcommand help for detailed usage information:

 - [`apply`][apply] - Modify node metadata
 - [`read`][read] - Read node metadata

[interp]: /docs/runtime/interpolation#node-attributes
[apply]: /docs/commands/node/meta/apply/
[read]: /docs/commands/node/meta/read/
