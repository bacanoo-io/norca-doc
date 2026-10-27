---
title: "Consul-compatible HTTP API"
linkTitle: "Consul-compatible API"
description: "The endpoints of Consul's HTTP API that a Norca client serves from the native service catalog."
---

A Norca client with [`consul_compat`](/docs/configuration/consul_compat) enabled serves a part of
Consul's documented HTTP API on its own listener (default `127.0.0.1:8500`), from the native service
catalog. This page lists what is served; see the
[feature page](/docs/features/service-discovery/consul-compatible-api) for the concepts. The API is not a
Consul agent: every path that is not listed here answers `501 Not Implemented`.

## Common behaviour

**Authentication.** The token is taken from the `X-Consul-Token` header, an `Authorization: Bearer`
header or the `token` parameter, in this order, and falls back to `anonymous_token`. It is a **Norca** ACL
token: reading services needs `read-job` on their namespace, the agent write endpoints need
`register-external-service`. A denied request answers `403` (`Permission denied` or `ACL not found`).

**Names and namespaces.** The services of the first namespace in `consul_compat.namespaces` keep their
name; those of the other namespaces are named `<namespace>--<name>`. Service IDs are the Norca
registration IDs (for agent registrations, the ID given at registration). External services that no
client node owns appear on a node named `external`.

**Datacenters.** With `datacenter_from = "region"`, `dc` selects the Norca region the request is
forwarded to and responses report the region as `Datacenter`. With `"datacenter"`, `dc` filters the
instances by Norca datacenter and responses report the datacenter of the node.

**Query parameters** accepted by the read endpoints where Consul accepts them:

| Parameter | Meaning |
| --- | --- |
| `dc` | Datacenter, see above |
| `index`, `wait` | Blocking query: wait until the index changes, by default up to 5 minutes, at most 10 |
| `stale` | Allow a stale read from any server |
| `passing` | `/v1/health/service` only: keep instances whose checks all pass (`passing` alone means true) |
| `tag` | Keep instances with the tag; may be repeated |
| `node-meta` | `key:value` filter on the node meta; may be repeated |
| `near` | `_agent` or `_self`: order by the service's topology preference relative to this client; any other value leaves the answer unsorted |
| `filter` | A boolean expression evaluated against the response objects |
| `pretty` | Indent the JSON |

**Response headers:** `X-Consul-Index` (the catalog index, at least 1), `X-Consul-KnownLeader`,
`X-Consul-LastContact` (milliseconds) and `X-Consul-Effective-Consistency` (`leader` or `stale`).

## Read endpoints

Methods `GET` and `HEAD`; other methods answer `405`.

| Path | Blocking | Response |
| --- | --- | --- |
| `/v1/agent/self` | No | `Config` (`Datacenter`, `PrimaryDatacenter`, `NodeName`, `NodeID`, `Server = false`, `Version`, `Product = "norca"`), `Member`, `Meta` (the node meta) of the local node |
| `/v1/status/leader` | No | The RPC address of the leader of the region |
| `/v1/status/peers` | No | The RPC addresses of the servers of the region |
| `/v1/catalog/datacenters` | No | The regions of the federation, or the datacenters of the region |
| `/v1/catalog/services` | Yes | A map of service names to their tags |
| `/v1/catalog/service/:service` | Yes | The instances as catalog services (node, address, service ID, address, port, tags, meta) |
| `/v1/catalog/nodes` | Yes | The client nodes |
| `/v1/catalog/node/:node` | Yes | A node (by name or ID) and the instances on it |
| `/v1/health/service/:service` | Yes | Service entries: node, service and checks |
| `/v1/health/checks/:service` | Yes | The checks of the instances of the service |
| `/v1/health/state/:state` | Yes | The checks in a state: `any`, `passing`, `warning` or `critical` |
| `/v1/health/connect/:service` | Yes | Always an empty list; there is no Consul Connect |
| `/v1/agent/services` | No | The services registered at this agent, by ID |
| `/v1/agent/service/:service_id` | No | One service registered at this agent |
| `/v1/agent/checks` | No | The checks of the services registered at this agent, by check ID |

**Checks.** Every service entry has the node check `serfHealth` (always passing), then for instances of
allocations a check `nomad-health:<registration ID>` with the aggregate health of the instance
(`critical` while it is not ready), followed by one check per service check of the instance
(`service:<registration ID>:<n>`, with the role in `Notes`). External services report the checks they
were registered with. Every instance has the service meta `external-source = "nomad"`, except agent
registrations.

## Agent write endpoints

Method `PUT`; other methods answer `405`. These endpoints register
[external services](/docs/features/service-discovery/external-services) owned by the client node: the
node runs their `http` and `tcp` checks, and the registrations are removed when the node goes down.
Writes go to the region of the client.

| Path | Body or parameters | Effect |
| --- | --- | --- |
| `/v1/agent/service/register` | A Consul service registration: `ID`, `Name`, `Tags`, `Address` (default: the node's address), `Port`, `Meta`, `Check`, `Checks` | Registers or updates the service |
| `/v1/agent/service/deregister/:service_id` | – | Removes a service registered at this agent |
| `/v1/agent/check/pass/:check_id` | `note` (the output) | Sets a TTL check to `passing` |
| `/v1/agent/check/warn/:check_id` | `note` | Sets a TTL check to `warning` |
| `/v1/agent/check/fail/:check_id` | `note` | Sets a TTL check to `critical` |
| `/v1/agent/check/update/:check_id` | `{"Status": ..., "Output": ...}` | Sets a TTL check |

Checks of a registration: `TTL`, `HTTP` (with `Method`, `Header`, `Body`, `TLSSkipVerify`,
`TLSServerName`) or `TCP`, with `Interval`, `Timeout`, `Status` (the initial status, `critical` by
default), `CheckID`, `Name`, `Notes` and `DeregisterCriticalServiceAfter` (the shortest one of the
checks applies to the service). Check IDs default to `service:<id>` (numbered when there are several),
names to `Service '<name>' check`.

Rejected with `400`: registrations with a `Kind` other than a typical service, a `Proxy` or `Connect`
settings; script, Docker, gRPC, H2PING, UDP, alias and TCP-with-TLS checks.

### Sample Request

```shell
$ curl \
    --request PUT \
    --data '{"Name": "billing", "Port": 8080, "Check": {"TTL": "30s"}}' \
    http://127.0.0.1:8500/v1/agent/service/register

$ curl --request PUT 'http://127.0.0.1:8500/v1/agent/check/pass/service:billing?note=ok'
```

## Unsupported endpoints

Every other path answers `501 Not Implemented` with the message
`Not Implemented: <method> <path> is not supported by the Consul-compatible API of Norca; it serves the catalog, health and status endpoints and the agent service endpoints only`.
This includes the KV store, sessions, prepared queries, events, ACLs, Connect, config entries,
`/v1/catalog/register` and `/v1/agent/members`.
