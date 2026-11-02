---
title: "Command: object-kind lint"
linkTitle: "object-kind lint"
description: "The object-kind lint command checks an object kind and sample objects without a server."
---

The `object-kind lint` command compiles the JSON Schema, the CEL rules and the
migration of an object kind like the servers do, without contacting them, and
reports problems and deviations from the conventions of the operator framework
(status fields the controller SDK writes, webhook settings, limits).

## Usage

```plaintext
norca object-kind lint [options] <kind file> [<object file>...]
```

Sample objects given as further arguments (in the
[`norca object apply`](/docs/commands/object/apply) format) are validated
against the kind: the defaults of the schema are filled in, then the schema and
the CEL rules (as for a create) are checked.

Errors are printed as errors, conventions as warnings, followed by a summary
line. The exit code is 1 if there are errors, 0 otherwise (warnings included).
The command needs no server and no token.

## Lint Options

- `-json`: Parse the kind file as a JSON object kind (also used for `.json`
  files).

- `-show-defaults`: Print the sample objects with the defaults of the schema
  filled in.

## Examples

```shell
$ norca object-kind lint loadbalancer.kind.hcl examples/web.hcl
```

The last line summarizes the result in the form
`<group>/<Kind>: <n> errors, <n> warnings, <n> objects checked`.

Show what the defaults of the schema add to a sample:

```shell
$ norca object-kind lint -show-defaults loadbalancer.kind.hcl examples/web.hcl
```
