---
title: "Command: service register"
linkTitle: "service register"
description: "The service register command registers or updates an external service in the native service catalog."
---

The `service register` command (Norca) registers or updates an
[external service](/docs/features/service-discovery/external-services): a service that is not run by an
allocation, such as a machine outside the cluster or a managed database. It appears in the service
catalog, the built-in DNS and the Consul-compatible API like the services of allocations.

## Usage

```plaintext
norca service register [options] <service_name>
```

The command takes the name of the service. Exactly one of `-address` and `-alias` is required.

An external service is kept alive by a TTL check that the registrant renews with
[`norca service ttl`](/docs/commands/service/ttl), or by `http` and `tcp` checks that the client agent the
command talks to runs (the registration is then owned by that client node). When its checks are
critical for longer than `-deregister-critical-after`, it is deregistered. A service without a TTL check
that is not registered through a client agent with `http` or `tcp` checks is static, and requires
operator write in addition.

With `-alias`, the service is a DNS alias: the built-in DNS answers its name with a CNAME record pointing
to the target.

When ACLs are enabled, this command requires a token with the `register-external-service` capability for
the namespace.

## General Options

The [general options](/docs/commands/service/info#general-options) of the `service` commands apply,
including `-namespace` and `-region`.

## Register Options

- `-id=<id>`: ID of the registration. Defaults to the service name.

- `-address=<address>`: IP address or host name of the service.

- `-alias=<dns name>`: Register a DNS alias of the given target name instead of an address.

- `-port=<port>`: Port of the service.

- `-tag=<tag>`: Tag of the service. May be given several times.

- `-meta=<key=value>`: Meta of the service. May be given several times.

- `-datacenter=<datacenter>`: Datacenter the service is reported in.

- `-ttl=<duration>`: Add a TTL check with the given TTL (at least `1s`).

- `-http=<url>`: Add an `http` check of the URL, run by the client agent.

- `-tcp=<host:port>`: Add a `tcp` check of the address, run by the client agent.

- `-interval=<duration>`: Interval of the `http` and `tcp` checks. Defaults to `10s`.

- `-timeout=<duration>`: Timeout of the `http` and `tcp` checks. Defaults to `10s`.

- `-initial-status=<status>`: Status of new checks: `passing` (default), `warning` or `critical`.

- `-deregister-critical-after=<duration>`: Deregister the service after its checks were critical this
  long. Defaults to `1h`; `0` keeps the service.

## Examples

Register a DNS alias for a managed database:

```shell
$ norca service register -namespace prod -alias db.c9xk2.eu-central-1.rds.example.com billing-db
Registered external service "billing-db" with ID "billing-db"
```

Register a machine with a TTL check:

```shell
$ norca service register -address 10.0.5.20 -port 5432 -ttl 30s -tag primary legacy-pg
Registered external service "legacy-pg" with ID "legacy-pg"
```

Register a machine whose health the client agent checks over HTTP:

```shell
$ norca service register -address 10.0.5.30 -port 8080 \
    -http http://10.0.5.30:8080/health -interval 10s legacy-api
Registered external service "legacy-api" with ID "legacy-api"
```
