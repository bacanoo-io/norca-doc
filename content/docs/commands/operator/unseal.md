---
title: "Command: operator unseal"
linkTitle: "operator unseal"
description: "The \"operator unseal\" command enters one unseal share of the shares seal on a server (Norca)."
---

The `operator unseal` command (Norca) enters one unseal share of the `shares`
[seal](/docs/features/secrets/seal) on a server. A server started with the `shares` seal is sealed until a
threshold of distinct shares has been entered; every server is unsealed on its own.

The share is read from standard input, or prompted for without echo when standard input is a terminal. It
is never taken from the command line, so it does not end up in the shell history.

With `-recover`, the share is one of the **old** shares of a secret store that a full restore brought back
wrapped by a seal the region no longer uses (`norca operator seal-status` shows "needs recovery"). The
leader collects the old shares until they unwrap the key of the store, then wraps it with the seal of the
region, and the store unseals. A backup records no threshold, so from the second share on, all shares
entered are combined and tried; a wrong share spoils the attempt until `-recover -reset` discards the
shares entered so far.

If ACLs are enabled, this command requires a token with the `operator:write` capability.

## Usage

```plaintext
norca operator unseal [options]
```

## General Options

The general options of the CLI (`-address`, `-region`, `-token`, the TLS and color options); see
[Commands](/docs/commands#environment-variables).

## Unseal Options

- `-server-id <name or ID>`: The server to unseal. Defaults to the server of the agent at `-address`. When
  that agent is not a server, `-server-id` is required.

- `-reset`: Discard the shares entered so far on the server.

- `-recover`: Enter an old share toward the recovery of a restored secret store, on the leader
  (`-server-id` is ignored). With `-reset`, discard the old shares entered so far.

## Examples

Unseal a server after a restart; three share holders run the command in turn:

```shell
$ norca operator unseal -server-id norca-2
Unseal share (will be hidden):
Server "norca-2" is sealed: 1 of 3 shares entered

$ norca operator unseal -server-id norca-2
Unseal share (will be hidden):
Server "norca-2" is sealed: 2 of 3 shares entered

$ norca operator unseal -server-id norca-2
Unseal share (will be hidden):
Server "norca-2" is unsealed
```

Read the share from a file, for example from a password manager's export:

```shell
$ norca operator unseal -server-id norca-2 < share.txt
```

Recover a restored secret store with the old shares:

```shell
$ norca operator unseal -recover
Unseal share (will be hidden):
Secret store recovery: 1 old shares entered; enter the next one
```
