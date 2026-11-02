---
title: "Command: secret list"
linkTitle: "secret list"
description: "The \"secret list\" command lists the secrets of a namespace below a prefix (Norca)."
---

The `secret list` command lists the secrets of the namespace given with `-namespace` (`*` for every
namespace) whose path starts with the prefix. Only paths and metadata are shown, never values.

If ACLs are enabled, this command requires the `list-secrets` capability for the listed paths; secrets
the token may not list are left out.

## Usage

```plaintext
norca secret list [options] [<prefix>]
```

## General Options

The [general options](/docs/commands/secret#general-options) of the CLI.

## List Options

- `-filter`: Specifies an [expression](/docs/api#filtering) used to filter query results.

- `-json`: Output the secrets in JSON format.

- `-page-token`: Where to start pagination.

- `-per-page`: How many results to show per page. When the results are paginated, the command prints the
  command line that fetches the next page.

- `-t`: Format and display the secrets using a Go template.

## Examples

```shell
$ norca secret list -namespace apps
Namespace  Path         Version  Deleted  Owner   Expires At  Modify Time
apps       app/db       2        false    team-a  <none>      2026-10-26T09:14:02Z
apps       rustfs/root  1        false            <none>      2026-10-25T17:40:11Z
```

List the secrets below `app/` in every namespace the token may list:

```shell
$ norca secret list -namespace '*' app/
```
