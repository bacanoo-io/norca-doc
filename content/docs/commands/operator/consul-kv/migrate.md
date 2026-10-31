---
title: "Command: operator consul-kv migrate"
linkTitle: "migrate"
description: "The operator consul-kv migrate command copies the Consul KV from Variables to the system bus."
weight: 1
---

The `operator consul-kv migrate` command copies the keys of the Consul KV kept
in Variables (the `variables` backend of
[`consul_compat`](/docs/configuration/consul_compat)) into the `consul-kv`
bucket of the [system bus](/docs/features/system-bus), which the `bus` and
`auto` backends use.

- The keys are the Variables below `-path` in the namespace of the request.
- A key that is not in the bucket yet is created. A key that is already
  there is never overwritten: it is reported as unchanged (same value) or as
  a conflict (another value).
- The Variables are left in place; delete them when the clients use the bus.
- Keys with flags are skipped: the bus does not keep flags.

The command can be run again: it copies only the keys that are still
missing. Run it after the clients switched to the bus, or before, with
`-dry-run` first to see what it would do.

## Usage

```plaintext
norca operator consul-kv migrate [options]
```

If ACLs are enabled, this command requires a token with the `operator:write`
capability. Only the keys the token may `read` as Variables
(`<path>/<key>` in the namespace) are copied.

## Options

- `-namespace=<namespace>`: The namespace of the keys (the `namespace` of
  the `kv` block). Defaults to `default`.

- `-path=<path>`: The Variables path of the `kv` block of `consul_compat`.
  Defaults to `consul/kv`.

- `-dry-run`: Report what would be copied without writing.

- `-json`: Output the result in JSON format.

## Examples

See what would be copied from the `default` namespace:

```shell-session
$ norca operator consul-kv migrate -dry-run
Would copy = 12
Unchanged  = 0
Conflicts  = 1
Skipped    = 0

Conflicts (in the bucket with another value, left as is)
  app/feature-flags
```

Copy the keys of the `shop` namespace:

```shell-session
$ norca operator consul-kv migrate -namespace=shop
Copied     = 7
Unchanged  = 0
Conflicts  = 0
Skipped    = 0
```
