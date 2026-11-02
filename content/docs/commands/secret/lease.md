---
title: "Command: secret lease"
linkTitle: "secret lease"
description: "The \"secret lease\" commands list and revoke the leases of dynamic secrets (Norca)."
---

The `secret lease` commands (Norca) list and revoke the leases of
[dynamic secrets](/docs/features/secrets/dynamic). A lease belongs to a credential an engine created for
a task. It is renewed by the task's client and revoked when the task stops, when it is not renewed in
time, at its `max_ttl`, or by an operator. Leases never contain the credential.

## Usage

```plaintext
norca secret lease list [options]
norca secret lease revoke [options] <lease-id>
norca secret lease revoke [options] -engine <name>
```

Every subcommand accepts the [general options](/docs/commands/secret#general-options).

## secret lease list

Lists the leases of the namespace (`-namespace "*"` for all). Revoked leases are listed until their
credential has expired. Requires `read-secret-engine`.

Options:

- `-engine`: Only the leases of this engine.
- `-json`: Output the leases in JSON format (all fields).
- `-t`: Format the leases with a Go template.

```shell
$ norca secret lease list -namespace apps -engine postgres
ID        Engine    Role  Job     Task    Allocation  Expires               State
2b0f4f8e  postgres  app   worker  worker  5b1c9a3e    2026-10-31T20:31:00Z  live
9a77c1d0  postgres  app   worker  worker  0c4e1f22    2026-10-31T19:12:09Z  revoked (allocation-stopped)
```

## secret lease revoke

Revokes a lease, or with `-engine` every live lease of an engine. The operator gets the revocation and
ends the credential; a task that still runs gets a new credential from its client, delivered with the `change_mode` of its secret block. Requires
`write-secret-engine`.

```shell
$ norca secret lease revoke -namespace apps 2b0f4f8e-7c1d-4d55-9a8e-3f7d1e2c9b10
Revoked 1 lease(s)
  2b0f4f8e-7c1d-4d55-9a8e-3f7d1e2c9b10

$ norca secret lease revoke -namespace apps -engine postgres
Revoked 3 lease(s)
  ...
```
