---
title: "Command: service intention check"
linkTitle: "service intention check"
description: "The service intention check command evaluates the service intentions for a connection."
---

The `service intention check` command (Norca) evaluates the
[intentions](/docs/features/native-mtls/intentions) of the namespace for a connection from a source
service to a destination service, as the `api/mtls` library and the Envoy sidecars do, and prints the
decision and the intention that made it.

## Usage

```plaintext
norca service intention check [options] <source> <destination>
```

The source is `<service>` (in the namespace of the destination) or `<namespace>/<service>`. The namespace
of the destination is `-namespace`, `NORCA_NAMESPACE` (or `NOMAD_NAMESPACE`), or `default`.

The command exits with `0` when the connection is allowed and `2` when it is denied (`1` on errors), so
it can be used in scripts.

When ACLs are enabled, this command requires a token with the `read-job` capability for the namespace.

## General Options

The [general options](/docs/commands/service/info#general-options) of the `service` commands apply,
including `-namespace` and `-region`.

## Check Options

- `-default-allow`: Allow connections no intention matches, like an application that sets
  `Authorizer.DefaultAllow`. By default they are denied, which is what sidecars do.

## Examples

```shell
$ norca service intention check -namespace apps probe test-api
Connection apps/probe -> apps/test-api is denied by the default policy (no intention matches)
$ echo $?
2

$ norca service intention create -namespace apps probe test-api
$ norca service intention check -namespace apps probe test-api
Connection apps/probe -> apps/test-api is allowed by intention apps/probe -> test-api (allow)
```
