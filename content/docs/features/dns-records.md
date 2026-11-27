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
[norca-dns module](/docs/rigger/norca-registry#norca-dns) registers it with the
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
   anything else the zone serves.

2. **The operator.** Install the norca-dns module. Like the other
   [operator modules](/docs/rigger/norca-registry#operator-modules), its
   job runs in the namespace of its release, `norca-system` here, which must
   exist, reads the token Variables of the zones there, and keeps off nodes
   with the `raw_exec` driver. The servers install it from the global
   registry:

   ```shell-session
   $ norca namespace apply -description "Norca operators" norca-system
   $ norca rigger registry sync global
   $ norca operator api -namespace norca-system -X PUT /v1/rigger/install <<'EOF'
   {"Release": "norca-dns", "Registry": "global", "Module": "norca/norca-dns", "Version": "~> 0.3"}
   EOF
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
| `deletion_policy` | `delete` | What happens to the record set when the record is deleted: `delete` removes it from the zone, `retain` leaves it there. Shown in the column `Deletion` of `norca object list`. |

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
of the type yet gives the reason `NoValues`, and a record set written before
stays as it is. A load balancer that does not exist gives `NoValues` too,
and the record set is removed: its addresses are no longer the namespace's.
The set is written again when a load balancer of the name is back. The
[tenant example](/docs/features/tenants/example#the-public-name) shows such a
record with its load balancer.

## What the operator keeps

- **The zone of a name** is the longest registered `DNSZone` that holds it.
  The zone must allow records (`RecordsNotEnabled` otherwise) and its
  provider must report a heartbeat (`ZoneUnavailable`).
- **The name must be in the allow list** of the namespace (`NotAllowed`).
  When the allow list no longer holds the name of a record, the record set
  the operator wrote for it is removed; it is written again when the name is
  allowed again. **This comes first, whatever the spec says:** the operator
  checks the name of the record set the status holds, and removes the set
  also when the spec can't be read (`InvalidSpec`), names another name, or
  waits for a zone or for values.
- **A record set in the zone that the operator did not write** gives the
  condition `Conflict`, and nothing is written, unless the record says
  `adopt = true` (event `Adopted`). **This holds also for a set with exactly
  the values the record asks for:** the zone carries no marker of who wrote
  a set, and a record that took it over would remove it when it is deleted.
  The message then says `with the values this record asks for; set adopt =
  true to take them over`. Without `adopt`, a record takes over only the set
  of a record whose namespace may no longer write the name (see the next
  point), and a set the zone holds exactly as its own status says norca-dns
  was about to write it (`pending`).
- **Two records of one name and type** (in any namespaces): the record whose
  status holds the record set (`owned`) keeps it, whichever is older, and
  the other one gets `Conflict` and holds nothing. A set that no record
  holds yet goes to the oldest record of a namespace whose allow list holds
  the name; a record that is `NotAllowed` keeps nobody from the name.
  **Neither does a record whose namespace may no longer write the name**,
  even while its status still holds the set: the record that may write the
  name takes the set over when the zone holds it exactly as the other
  record's status says norca-dns wrote it (zone, TTL and values; event
  `Adopted`, `taken over from a record whose namespace may no longer write
  the name`), and the other record gives the set up. A set that is no longer
  as norca-dns wrote it counts as one the operator did not write. A
  deleted record holds its set until the operator has removed it, so a new
  record of the same name waits for it. **A waiting record takes the name
  over as soon as the other record gives it up** (is deleted, or moves to
  another name or type). An operator that keeps the records of one namespace
  (`-namespace` other than `*`) does not see the records of the other
  namespaces change, so it looks at a record that waits for one of them again
  every 10 seconds (`-conflict-requeue` of `norca-dns`). The message of the `Conflict` (and
  of a `RecordLeft` because another record holds the set) names the other
  record when it is in the same namespace; a record of another namespace is
  only `a DNSRecord in another namespace`, so a team does not learn the
  namespaces and records of others. The log of the operator names it in
  full.
- **Changes made in the zone by hand** are set back when the operator
  compares the record with the zone, every 5 minutes (`requeue` of the
  module) and at every change of the record: event `DriftCorrected`,
  `status.drifts`.
- **A record set that changes while norca-dns writes it is not written
  over.** The operator writes a set only if the zone still holds it as the
  operator read it (the same values, or no set of the name and type), and the
  provider checks that in the same step as the write. A set someone wrote or
  changed in between gives `Conflict`, `the A records of
  shop.team-a.example.com in the zone example.com changed while norca-dns
  wrote them; nothing was written`, and the record is looked at again a
  minute later.
- **Only the leader writes the zones.** With leader election
  (`-leader-election` of `norca-dns`) the operator writes or removes a
  record set only while its lease cannot have passed to another instance
  (the [fence](/docs/features/operator-framework/controllers#fencing-side-effects)
  of the controller SDK); an instance that may no longer lead writes
  nothing to the zone and records no event or condition for it, and the
  leader looks at the record again.
- **A changed name or type** removes the old record set first, before the
  record waits for a zone or for values (`ZoneNotFound`,
  `RecordsNotEnabled`, `ZoneUnavailable`, `NoValues`) or for another record
  of the new name: a name the record no longer asks for is not served on.
- **A record set is removed only as norca-dns wrote it.** Before the
  operator removes a set (the record is deleted, moves, or loses its name or
  its values), it reads the set from the zone: a set whose values or TTL
  differ from what norca-dns wrote (changed by hand, or written by a record
  that took it over) stays in the zone, and so does a set another record
  holds. The deletion is conditional too: a set that changed between that
  read and the deletion stays (`it changed in the zone while norca-dns
  removed it`). Event `RecordLeft`; the record gives the set up. A set the
  zone holds exactly as `pending` says is one norca-dns wrote: a record
  deleted right after the status write that followed its zone write was
  lost still removes its set.
- **Deleting the record** removes its record set (the finalizer
  `norca.io/dns-records` keeps the object until then). With
  `deletion_policy = "retain"` the record goes without touching the zone, and
  its record set stays: event `RecordLeft`. A record whose zone
  is no longer registered, or no longer allows records (`records` switched
  off, or the provider refuses the deletion with the reason
  `records_disabled`), goes, and its record set stays in the zone: event
  `RecordLeft`. **Any other failure of the removal, another 403 too, is the
  event `DeleteFailed` and is tried again**, and `Ready` is false with the
  reason `DeleteFailed`. **A deletion that can't finish** (the token or the
  endpoint of the zone is gone, the provider is away) ends when
  `deletion_policy = "retain"` is set on the record being deleted (`norca
  object apply`): the record goes and leaves its record set in the zone.

## Status

| Field | Meaning |
| --- | --- |
| `zone`, `name`, `type`, `ttl`, `values` | The record set the operator wrote last, or found as it wanted it when it took the set over (`adopt`, or the set of a record whose namespace may no longer write the name). |
| `owned` | The record set is the operator's: only then does it change or remove it. |
| `pending` | The record set the operator is about to write (`zone`, `name`, `type`, `ttl`, `values`), written to the status before the zone is written. A set the zone holds exactly so is the record's, also when the status write after the zone write was lost; while the status holds no set, the operator removes this one where it would remove the held set (deletion, a changed name or type, a lost name). When `pending` can't be written, nothing is written to the zone and the reason is `Failed`. It is cleared when the status holds the set (`owned`), when the write was not done, and when the set is given up. |
| `writtenAt` | When the operator last wrote the set. |
| `drifts`, `lastDrift` | Changes made by hand that the operator set back. |

Conditions:

| Condition | True when |
| --- | --- |
| `Ready` | The zone holds the record set. When it is false, its reason says why: `NotAllowed`, `ZoneNotFound`, `RecordsNotEnabled`, `ZoneUnavailable` (the provider of the zone reports no heartbeat, or the registration of the zone, its endpoint or its token, can't be used), `NoValues`, `Conflict`, `InvalidSpec`, `Failed` (the provider or the name server can't be reached or refuses, or the cluster can't be read), or `DeleteFailed` during a deletion (its message says that `deletion_policy = "retain"` lets the record go). |
| `Conflict` | Another record or the zone itself holds the name and type, or the record set changed in the zone while the operator wrote it. |
| `Degraded` | `Ready` is false. |

A failure shows in the status at once, also on a record that was `Ready`
before; the record keeps the record set it holds (`owned`) meanwhile.

**The status and the events say what failed, not the details.** They name
the step that failed and, of an answer of the provider, its status code, a
refused token, or the provider's refusal of the request itself (the values,
a zone without records). Endpoints, token paths and the other details of the
error are in the log of norca-dns.

Events: `RecordWritten`, `RecordDeleted`, `RecordLeft` (a record set that
stays in the zone when its record gives it up), `DeleteFailed`,
`DriftCorrected`, `Adopted`, and the reason of a `Ready` that turns false.

## Rights

The operator writes the zones with its own rights (the ACL policy of the
module). What a writer of a record may cause is bounded by the allow list of
its namespace, which only a management token or a tenant writes, and by the
object right `write` on `norca.io/DNSRecord` in the namespace:

```hcl
namespace "team-a" {
  object "norca.io/DNSRecord" { capabilities = ["read", "write"] }
}
```

**A name is one for the whole cluster**, so the operator looks for the
record that holds a name in every namespace. The module runs it for every
namespace. An operator started with `-namespace` for one namespace writes
there only, but **its policy still needs to read the `DNSRecord` objects and
the metadata of every namespace**: in a namespace it can't read, it does not
see the records that hold a name, and may take over or remove their record
sets.

## Limits

- **One cluster writes a zone.** The zone carries no marker of which record
  sets are whose; two clusters writing one zone would set back each other's
  changes.
- **Writes and deletions are conditional** on the record set as the
  operator read it. The `rfc2136` type puts the condition into the
  prerequisites of the update message (RFC 2136), so the name server checks
  it and applies the update in one step. A DNS type of norca-provider that
  can't check a condition is written without it, right after the operator
  read the set; the log of norca-dns says so once for every zone.
- **norca-dns and norca-provider are updated together.** An older
  norca-provider does not know the condition and writes and deletes without
  it.
- **The nodes of a service are not a source** (a later version): they change
  with every placement, faster than a TTL lets clients follow.
- The DNS types that write records are `rfc2136` and `mock`; the cloud DNS
  services come with their types of norca-provider.
- The operator compares the record set with the primary of the zone, not
  with what resolvers on the internet see.
- **`rfc2136`: a CNAME stands alone.** A name server ignores a CNAME for a
  name that has other records, and other records for a name that is a
  CNAME, without an error. The provider reads the record set back after it
  wrote it; a set the server does not hold is reported as `Failed`, with
  what the server holds in the message, and the record holds nothing.
- **`rfc2136` with a TSIG key signs every message**, the queries that read
  the record sets back as well as the updates, and **takes only signed
  answers**: an answer without a signature is refused. The name server
  has to sign its answers (a server that takes the signed updates does).
- **`rfc2136`: a wildcard is not a record set.** An answer the name server
  makes from a wildcard of the zone (`*.apps.example.com`) is not taken for
  a record set of the name asked: a record below a wildcard is written
  without `adopt`.

## See also

- [Certificates from ACME](/docs/features/certificates-acme): the DNS zones
  of norca-provider and the challenge records.
- [Tenants](/docs/features/tenants): `dns_suffixes`.
- [Example: a team with a load balancer and DNS names](/docs/features/tenants/example):
  a record that follows a load balancer in the namespace of a tenant, and
  what the allow list and a conflict look like from the side of the team.
