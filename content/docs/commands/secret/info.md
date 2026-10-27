---
title: "Command: secret info"
linkTitle: "secret info"
description: "The \"secret info\" command shows the metadata and the versions of a secret, never its values (Norca)."
---

The `secret info` command shows the metadata and the retained versions of a secret: never its values,
only a keyed hash of them.

If ACLs are enabled, this command requires the `list-secrets` capability for the path.

## Usage

```plaintext
norca secret info [options] <path>
```

## General Options

The [general options](/docs/commands/secret#general-options) of the CLI.

## Info Options

- `-json`: Output the metadata in JSON format.

- `-t`: Format and display the metadata using a Go template.

## Examples

```shell
$ norca secret info -namespace apps app/db
Namespace        = apps
Path             = app/db
Current Version  = 2
Deleted          = false
Destroyed        = false
Items            = password,username
Value Hash       = hmac-sha256:5f0c...
Description      = Database login
Owner            = team-a
Labels           = <none>
Expires At       = <none>
Rotate Every     = <none>
Max Versions     = 10
Create Time      = 2026-10-25T17:02:44Z
Modify Time      = 2026-10-26T09:14:02Z
Modify Index     = 1873

Versions
Version  Created               Deleted  Destroyed  Value Hash
2        2026-10-26T09:14:02Z  false    false      hmac-sha256:5f0c...
1        2026-10-25T17:02:44Z  false    false      hmac-sha256:a91e...
```

The `Modify Index` is the value for `-check-index` of
[`secret put`](/docs/commands/secret/put) and the other write commands.
