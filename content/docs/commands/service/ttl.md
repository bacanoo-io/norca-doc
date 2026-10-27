---
title: "Command: service ttl"
linkTitle: "service ttl"
description: "The service ttl command renews the TTL checks of an external service or sets their status."
---

The `service ttl` command (Norca) renews the TTL checks of an
[external service](/docs/features/service-discovery/external-services), or sets their status. A TTL check
that is not renewed within its TTL turns `critical`.

## Usage

```plaintext
norca service ttl [options] <service_id>
```

The command takes the ID of the registration.

When ACLs are enabled, this command requires a token with the `register-external-service` capability for
the namespace.

## General Options

The [general options](/docs/commands/service/info#general-options) of the `service` commands apply.

## TTL Options

- `-status=<status>`: Status of the checks: `passing` (default), `warning` or `critical`.

- `-output=<text>`: Output recorded with a status change.

- `-check=<check_id>`: Update this check only. By default every TTL check of the service.

## Examples

Renew the TTL checks:

```shell
$ norca service ttl legacy-pg
Updated the TTL checks of external service "legacy-pg": passing
```

Report a warning:

```shell
$ norca service ttl -status warning -output "replication lag 30s" legacy-pg
Updated the TTL checks of external service "legacy-pg": warning
```

A renewal loop on the machine itself:

```shell
while true; do norca service ttl legacy-pg; sleep 10; done
```
