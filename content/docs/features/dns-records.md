---
title: "DNS records"
linkTitle: "DNS records"
description: "DNS names that follow what runs in the cluster: DNSRecord objects kept by the operator norca-dns in the DNS zones of norca-provider."
weight: 52
---

## What and why

**A `DNSRecord` object declares one DNS record set, and the operator
`norca-dns` keeps it in the zone that holds the name.** The public name of a
service on the edge, the address of a load balancer, a name per region: you
write the record once, and when its values change (a new load balancer
address, a new spec) the operator writes the zone again.

- **Through norca-provider.** The records are written by
  [norca-provider](/docs/features/certificates-acme#dns-01), which already
  keeps the credentials of the DNS service. The operator holds no DNS
  credential.
- **Only its own records.** The operator changes only the record sets it
  wrote. A record set that is already in the zone is left alone unless the
  object says `adopt = true`.
- **By right.** A namespace writes only the names its allow list holds, and
  only in zones that allow records.
- **Set back.** A record set changed in the zone by hand is written again.

The kind `norca.io/DNSRecord` is namespaced; the
[norca-dns pack](/docs/features/packages/registry) registers it with the
operator. It is a [custom object](/docs/features/operator-framework): written
with [`norca object apply`](/docs/commands/object/apply), read with
`norca object get`, listed in the web UI.

## Install

1. **A zone that allows records.** In the configuration of norca-provider,
   the zone of a `dns` section says `"records": true`, with a DNS type that
   can write records (`rfc2136`, `mock`):

   ```json
   {
     "name": "dns-eu",
     "type": "rfc2136",
     "params": {"server": "ns1.example.com", "tsig_key": "norca", "tsig_secret": "env:TSIG_SECRET"},
     "token": "env:DNS_TOKEN",
     "token_variable": "providers/dns-eu",
     "dns": {"zones": [{"zone": "example.com", "records": true}]}
   }
   ```

   The `norca.io/DNSZone` object of the zone then says `spec.records =
   true`. A zone without it serves only the challenge records of
   [norca-acme](/docs/features/certificates-acme): its token can't change
   anything else the zone serves. The norca-provider pack 0.4.0 or later
   is needed (its `DNSZone` kind knows the field).

2. **The operator.** Run the norca-dns pack:

   ```shell-session
   $ norca pack run norca-dns --registry=norca
   ```

3. **The allow list of a namespace.** The namespace metadata
   `norca.io/dns-suffixes` holds the suffixes the namespace may write names
   under, comma separated; a suffix allows itself and every name below it.
   A [tenant](/docs/features/tenants) writes it from its `dns_suffixes`;
   otherwise a management token sets it in the namespace specification
   (`norca namespace apply team-a.hcl`):

   ```hcl
   name = "team-a"

   meta {
     "norca.io/dns-suffixes" = "team-a.example.com"
   }
   ```

   It is a list of its own, not the one of
   [certificates](/docs/features/certificates): writing a name and getting a
   certificate for it are different rights.

## A record

```hcl
kind      = "norca.io/DNSRecord"
name      = "shop"
namespace = "team-a"

spec {
  name   = "shop.team-a.example.com"
  type   = "A"
  ttl    = 300
  values = ["203.0.113.10", "203.0.113.11"]
}
```

```shell-session
$ norca object apply shop.hcl
$ norca object get -namespace team-a norca.io/DNSRecord shop
```

| Field | Default | Meaning |
| --- | --- | --- |
| `name` | required | The fully qualified name. Not a wildcard, and not a challenge name of norca-acme (`_acme-challenge.…`). |
| `type` | required | `A`, `AAAA`, `CNAME` or `TXT`. A CNAME has one value and can't be the apex of a zone. |
| `ttl` | `300` | Seconds, 1 to 86400. |
| `values` | | The values: IPv4 addresses (A), IPv6 addresses (AAAA), one name (CNAME), texts (TXT), at most 32. |
| `source.load_balancer` | | Take the values from a `LoadBalancer` object of the namespace instead (see below). |
| `adopt` | `false` | Take over a record set of the name and type that is in the zone and that norca-dns did not write. |

A record has `values` or `source`, one of them.

### Values from a load balancer

```hcl
spec {
  name   = "shop.team-a.example.com"
  type   = "A"
  source { load_balancer = "shop" }
}
```

The values are the frontend addresses of the
[LoadBalancer](/docs/features/operator-framework/loadbalancer-providers) object `shop` of the namespace
(`status.addresses`, without the ports): its IPv4 addresses for `A`, its IPv6
addresses for `AAAA`, its first host name for `CNAME` (a load balancer of a
cloud that has a name rather than an address). When the load balancer gets a
new address, the record follows at once. A load balancer without an address
of the type yet gives the reason `NoValues`. The
[tenant example](/docs/features/tenants/example#the-public-name) shows such a
record with its load balancer.

## What the operator keeps

- **The zone of a name** is the longest registered `DNSZone` that holds it.
  The zone must allow records (`RecordsNotEnabled` otherwise) and its
  provider must report a heartbeat (`ZoneUnavailable`).
- **The name must be in the allow list** of the namespace (`NotAllowed`).
- **A record set in the zone that the operator did not write** gives the
  condition `Conflict`, and nothing is written, unless the record says
  `adopt = true` (event `Adopted`). A set that is in the zone exactly as the
  record wants it is taken over without `adopt`.
- **Two records of one name and type** (in any namespaces): the older one
  keeps it, the other one gets `Conflict`.
- **Changes made in the zone by hand** are set back when the operator
  compares the record with the zone, every 5 minutes (`requeue` of the
  pack) and at every change of the record: event `DriftCorrected`,
  `status.drifts`.
- **A changed name or type** removes the old record set first.
- **Deleting the record** removes its record set (the finalizer
  `norca.io/dns-records` keeps the object until then). A record whose zone
  is no longer registered goes, and its records stay in the zone.

## Status

| Field | Meaning |
| --- | --- |
| `zone`, `name`, `type`, `ttl`, `values` | The record set the operator wrote last, or found as it wanted it. |
| `owned` | The record set is the operator's: only then does it change or remove it. |
| `writtenAt` | When the operator last wrote the set. |
| `drifts`, `lastDrift` | Changes made by hand that the operator set back. |

Conditions:

| Condition | True when |
| --- | --- |
| `Ready` | The zone holds the record set. When it is false, its reason says why: `NotAllowed`, `ZoneNotFound`, `RecordsNotEnabled`, `ZoneUnavailable`, `NoValues`, `Conflict`, `InvalidSpec`, `Failed` (the provider's error). |
| `Conflict` | Another record or the zone itself holds the name and type. |
| `Degraded` | `Ready` is false. |

Events: `RecordWritten`, `RecordDeleted`, `DriftCorrected`, `Adopted`, and
the reason of a `Ready` that turns false.

## Rights

The operator writes the zones with its own rights (the ACL policy of the
pack). What a writer of a record may cause is bounded by the allow list of
its namespace, which only a management token or a tenant writes, and by the
object right `write` on `norca.io/DNSRecord` in the namespace:

```hcl
namespace "team-a" {
  object "norca.io/DNSRecord" { capabilities = ["read", "write"] }
}
```

## Limits

- **One cluster writes a zone.** The zone carries no marker of which record
  sets are whose; two clusters writing one zone would set back each other's
  changes.
- **The nodes of a service are not a source** (a later version): they change
  with every placement, faster than a TTL lets clients follow.
- The DNS types that write records are `rfc2136` and `mock`; the cloud DNS
  services come with their types of norca-provider.
- The operator compares the record set with the primary of the zone, not
  with what resolvers on the internet see.

## See also

- [Certificates from ACME](/docs/features/certificates-acme): the DNS zones
  of norca-provider and the challenge records.
- [Tenants](/docs/features/tenants): `dns_suffixes`.
- [Example: a team with a load balancer and DNS names](/docs/features/tenants/example):
  a record that follows a load balancer in the namespace of a tenant, and
  what the allow list and a conflict look like from the side of the team.
