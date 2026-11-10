---
title: "Command: secret engine"
linkTitle: "secret engine"
description: "The \"secret engine\" commands manage the dynamic secrets engines of the built-in secret store: apply, list, info and delete (Norca)."
---

The `secret engine` commands (Norca) manage the [dynamic secrets engines](/docs/features/secrets/dynamic)
of the built-in secret store. An engine names an operator, a service that creates short-lived credentials
for the tasks that ask for them with a [`secret`](/docs/job-specification/secret) block naming the engine and
a role. Engines never contain a credential.

## Usage

```plaintext
norca secret engine apply [options] <input>
norca secret engine list [options] [<prefix>]
norca secret engine info [options] <name>
norca secret engine delete [options] <name>
```

Every subcommand accepts the [general options](/docs/commands/secret#general-options); `-namespace`
selects the engine's namespace.

## secret engine apply

Creates or updates an engine from an HCL specification file, or from standard input with `-`. The
operator may start after its engine.

Requires `write-secret-engine`.

Options:

- `-check-index`: Apply only if the engine's modify index is the given one; `0` creates an engine that
  must not exist yet.
- `-json`: Parse the input as a JSON engine in the [API form](/docs/api/secret-engines#create-or-update-an-engine).

Specification:

```hcl {filename="postgres.hcl"}
name        = "postgres"                 # letters, digits, - and _
type        = "operator"
description = "Orders database"

operator {
  service = "postgres-operator"          # in the native catalog
  # namespace = "platform"               # by default that of the engine
}

role "app" {
  ttl     = "1h"                         # default 1h; renewals extend the lease by it
  max_ttl = "24h"                        # default 24h; the credential expires then
  config  = { database = "orders" }      # passed to the operator; nothing secret
  params  = ["schema"]                   # the keys a job may send
}
```

```shell
$ norca secret engine apply -namespace apps postgres.hcl
Successfully applied secret engine "postgres"!
```

## secret engine list

Lists the engines of the namespace (`-namespace "*"` for all) whose name starts with the prefix.
Requires `read-secret-engine`. Options: `-json`, `-t`.

```shell
$ norca secret engine list -namespace apps
Namespace  Name      Type      Roles  Modify Time
apps       postgres  operator  app    2026-10-31T18:20:11Z
```

## secret engine info

Shows an engine: the service of its operator and its roles. Requires `read-secret-engine`.
Options: `-json`, `-t`.

```shell
$ norca secret engine info -namespace apps postgres
Namespace    = apps
Name         = postgres
Type         = operator
Description  = Orders database
Service      = postgres-operator
Modify Time  = 2026-10-31T19:02:44Z
Modify Index = 131

Role  TTL     Max TTL  Params
app   1h0m0s  24h0m0s  schema
```

## secret engine delete

Deletes an engine. **An engine with live leases can't be deleted**: revoke them first with
[`norca secret lease revoke -engine`](/docs/commands/secret/lease#secret-lease-revoke). Requires `write-secret-engine`.
