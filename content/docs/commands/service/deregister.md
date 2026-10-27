---
title: "Command: service deregister"
linkTitle: "service deregister"
description: "The service deregister command removes an external service from the native service catalog."
---

The `service deregister` command (Norca) removes an
[external service](/docs/features/service-discovery/external-services) registered with
[`norca service register`](/docs/commands/service/register) or through the agent endpoints of the
Consul-compatible API.

## Usage

```plaintext
norca service deregister [options] <service_id>
```

The command takes the ID of the registration (by default the service name it was registered with).

When ACLs are enabled, this command requires a token with the `register-external-service` capability for
the namespace.

To remove a registration of an allocation, use [`norca service delete`](/docs/commands/service/delete).

## General Options

The [general options](/docs/commands/service/info#general-options) of the `service` commands apply.

## Examples

```shell
$ norca service deregister legacy-pg
Deregistered external service "legacy-pg"
```
