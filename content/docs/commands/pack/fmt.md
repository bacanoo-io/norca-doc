---
title: "Command: pack fmt"
linkTitle: "pack fmt"
description: "The pack fmt command formats pack templates and HCL files."
---

The `pack fmt` command formats the files of a pack (`.tpl` templates and `.hcl` files) with the
HCL formatting rules. Template files keep their `[[ ]]` actions; `.hcl` files are formatted directly.

Only HCL templates are formatted. A template is skipped, with a note, when it is not HCL once its
`[[ ]]` actions are set aside (a text template such as `outputs.tpl`), when it renders another file
type (`x.json.tpl`), when it defines template fragments (`[[ define ]]`, as in `_helpers.tpl`), or when
formatting would change the text around an action. Skipped files do not fail `-check`. An `.hcl` file
with syntax errors is an error.

If no path is given, the current directory is used. Note that this command uses single-dash flags.

## Usage

```plaintext
norca pack fmt [options] [path...]
```

## Format options

- `-check` `(default: false)` - Check whether the files are formatted without changing them; exits with 1 if formatting is needed.

- `-list` `(default: true)` - List the files that are (or would be) changed.

- `-write` `(default: true)` - Write the formatted content back to the files.

- `-recursive` `(default: false)` - Process directories recursively.

## Examples

```shell
norca pack fmt
norca pack fmt my-pack/
norca pack fmt -check -recursive ./packs
```
