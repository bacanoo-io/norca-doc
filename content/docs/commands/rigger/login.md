---
title: "Command: rigger login"
linkTitle: "rigger login"
description: "The rigger login and rigger logout commands keep and forget the credentials of a host of git or OCI sources."
---

The `rigger login` command keeps the credentials of one host of git or OCI sources; `rigger logout`
forgets them. **A credential goes to its host only, over https** (http on localhost): a stack, a lock
file or an entry of an index names hosts that others chose.

## Usage

```plaintext
norca rigger login <host> [-username name]
norca rigger logout <host>
```

The password (a token) is the first line of standard input.

The credentials are kept in `rigger/credentials.json` of the configuration directory of the user,
readable by the user only; `RIGGER_CREDENTIALS_FILE` names another file. They come before the
credentials of the environment (`RIGGER_GIT_*`, `RIGGER_OCI_*`; see
[`rigger`](/docs/commands/rigger#environment)).

## Login Options

- `-username`: The user name. None for a token.

## Examples

```shell
$ echo "$TOKEN" | norca rigger login git.example.com -username robot
$ norca rigger logout git.example.com
```
