---
title: "Certificates"
linkTitle: "Certificates"
description: "TLS certificates for DNS names as objects: the servers keep them issued and renewed in the secret store, signed by the issuing CA of the region or by an external issuer."
weight: 48
---

## What and why

**A `Certificate` object is a TLS certificate for DNS names that the servers
keep issued and renewed.** You write the object once; the leader makes the
key, has the certificate signed and writes both to the
[secret store](/docs/features/secrets), from where jobs, the Traefik pack and
anything else that reads secrets take them.

- **Built in.** The operator runs in the servers, on the leader. Nothing has
  to be installed, and it upgrades with the servers.
- **The key never leaves the servers.** It is made by the leader and stored
  in the secret store only. An external issuer sees a signing request and
  the public chain.
- **Renewed without a restart.** A new certificate is a new version of the
  secret; a consumer that reads the secret through a template picks it up.
- **By right.** A namespace gets certificates only for the names it was
  given, from the issuers it was given.

Three kinds of the group `norca.io`, registered by the servers:

| Kind | Scope | Written by | What it is |
| --- | --- | --- | --- |
| `CertificateIssuer` | cluster | an operator of the cluster | who signs: the issuing CA of the region, or an external issuer |
| `Certificate` | namespace | whoever may write objects and the secret there | a certificate that is kept issued |
| `CertificateOrder` | cluster | the servers only | one issuance handed to an external issuer |

They are [custom objects](/docs/features/operator-framework): written with
[`norca object apply`](/docs/commands/object/apply), read with
`norca object get`, listed in the web UI.

> [!NOTE]
> These certificates are for DNS names: a web site, an admin endpoint, a
> database. They are not the workload certificates of
> [native mTLS](/docs/features/native-mtls), which carry a SPIFFE identity,
> have their own CA and are handed to tasks by the clients.

## Issuers

An issuer is cluster scoped and is one of two.

### The built-in issuer

```hcl
kind = "norca.io/CertificateIssuer"
name = "internal"

spec {
  builtin {}
}
```

The certificates are signed by the **issuing CA of the region**, for names
inside the organisation.

- The leader creates the CA with the first built-in issuer and **rotates it
  at two thirds of its life** (five years); the certificates are then issued
  again. The CA it replaces stays in the trust bundle until the certificates
  it signed have expired.
- The certificate of the CA is in Raft; **its key is stored next to it,
  encrypted with the keyring**, in every snapshot and backup. The keyring
  does not remove a root key that still encrypts it.
- It is a CA of its own: **not the CA of native mTLS**, and never part of
  the trust bundle of the mesh.
- Clients trust it through its **trust bundle**:
  [`norca certificate roots`](/docs/commands/certificate/roots) or
  `GET /v1/certificates/roots`. The bundle is also the item `ca` of every
  secret the issuer writes.

**A CA of the organisation** can take its place:
[`norca certificate ca import`](/docs/commands/certificate/ca-import), with
the certificate and the key of a root or of an intermediate CA. The leader
never rotates an imported CA; import its successor before it expires. With
less than an hour of the CA left nothing is issued: the issuer is not ready
and the certificates fail with the reason `AuthorityExpired`, keep the
certificate they have, and are tried again.

### An external issuer

```hcl
kind = "norca.io/CertificateIssuer"
name = "public"

spec {
  external {
    controller = "my-controller"
    config = {
      directory = "https://ca.example.com/directory"
    }
  }
}
```

The servers do not sign: they hand every issuance to the **controller** of
the issuer, an application outside the servers, as a `CertificateOrder`
(see [the contract](#the-contract-of-an-external-issuer)).

> [!TIP]
> **For public certificates, the controller exists:** the operator
> `norca-acme` signs through an ACME certificate authority such as Let's
> Encrypt. See [Certificates from ACME](/docs/features/certificates-acme).

- `controller` names the controller that fulfils the orders of the issuer.
- `config` is the controller's own; the servers do not read it.

> [!IMPORTANT]
> The spec and the status of an object are public to whoever may read the
> object, and object events are published as they are. **`config` must hold
> no secret**: credentials of the controller belong in the secret store.

The issuer counts as available while its controller writes a `heartbeat`
into the status of the issuer. When the heartbeat is older than three
minutes, its certificates get the condition `IssuerUnavailable`, nothing new
is ordered, and **the certificates they have stay in place**.

## Certificates

```hcl
kind      = "norca.io/Certificate"
namespace = "team-a"
name      = "web-tls"

spec {
  issuer      = "internal"
  dns_names   = ["web.team-a.example.com", "*.web.team-a.example.com"]
  secret_path = "certs/web"
}
```

| Field | Default | Meaning |
| --- | --- | --- |
| `issuer` | required | the name of a `CertificateIssuer` |
| `dns_names` | | the DNS names, lower case; a wildcard as the whole first label, not right under a top level name (`*.apps.lab`, not `*.lab`) |
| `ip_addresses` | | IP addresses; the built-in issuer only |
| `secret_path` | required | the secret, in the namespace of the object; it can't be changed later |
| `validity` | `2160h` | how long the certificate is valid, at most `8760h`; the built-in issuer only, an external one chooses |
| `renew_before` | | renew this long before the end of the validity, instead of at two thirds of it |
| `key_type` | `ecdsa-p256` | `ecdsa-p256`, `ecdsa-p384`, `rsa-2048`, `rsa-4096` or `ed25519` |
| `delete_secret` | `false` | delete the secret when the certificate is deleted |
| `keep_certificates` | `false` | keep the certificates of the object valid when it is deleted; without it they are revoked first. See [Deleting](#deleting) |

### The secret

The certificate is a version of the secret at `secret_path`:

| Item | Content |
| --- | --- |
| `cert` | the certificate, followed by the intermediate certificates if there are any (PEM) |
| `key` | the private key (PEM, PKCS #8) |
| `ca` | the trust bundle of the built-in issuer; absent with an external issuer |

- The **expiry of the secret** is the end of the validity of the
  certificate, so the secret watcher warns (`SecretExpiring`) if renewing
  ever stops.
- The secret carries the label `norca.io/certificate` with the name of the
  object. The operator also labels the secret with
  `norca.io/certificate-id`, the ID of the `Certificate` object it issued
  the certificate for. **A secret that was not written for the certificate
  is never overwritten**: the certificate then has the reason
  `SecretConflict`.
  To hand an existing secret over to a certificate, label it; the next
  version is the certificate's:

  ```shell-session
  $ norca secret put -namespace team-a -label norca.io/certificate=web-tls certs/web
  ```
- The operator **writes the secret only in the state its pass read**: a
  secret that somebody else creates or changes while a certificate is being
  issued is not overwritten. That attempt is not counted as a failure; the
  next pass, soon after, reads the secret again and decides again, with
  `SecretConflict` if it is no longer the certificate's.
- **A certificate the status did not record is not lost.** The secret is
  written before the status. If the write of the status is lost after an
  issuance, the next pass finds the certificate in the secret, lists it in
  [`earlier`](#earlier-certificates) (warning event `CertificateRecovered`),
  and only then issues again; it can be revoked by its serial number, and
  the deletion of the object revokes it. This needs the
  `norca.io/certificate-id` label of this object on the secret, and the
  private key of the certificate in the secret.
- While an order with an external issuer is open, the key that waits for its
  certificate is the item `next_key`; `cert` and `key` keep the current
  certificate until the new one is complete.

A job reads the items like any secret, for example in a template:

```hcl
template {
  data        = "{{ with norcaSecret \"certs/web\" }}{{ .cert }}{{ end }}"
  destination = "secrets/tls.crt"
  change_mode = "signal"
}
```

The [Traefik pack](/docs/features/packages/registry#traefik) takes the path
in `tls_certificates`.

### When a certificate is issued again

1. At **two thirds of its validity**, or `renew_before` ahead of its end,
   or at the time an external issuer suggests.
2. When the **spec changes**: the names, the key type, the issuer, the
   validity.
3. After a **revocation**
   ([`norca certificate revoke`](/docs/commands/certificate/revoke)).
4. When the **issuing CA changes** (rotation, import), with the built-in
   issuer.
5. When the secret is gone, or **its current version is soft deleted or
   destroyed** by hand.

A certificate counts as held only while the current version of its secret
can be read: it is the certificate's, it holds `cert` and `key`, and it is
neither soft deleted nor destroyed. **A deleted current version brings a new
certificate at once**, in a new version of the secret: the built-in issuer
writes it right away; for an external issuer an order is placed, and its key
waits in a new version. The old certificate is not revoked: a deletion is no
key compromise, and a soft delete can be undone. It stays valid until it
expires. `norca certificate revoke` without a serial number would revoke
the new certificate, not the old one: **to revoke the old one, give its
serial number** from `earlier` of the status
([Earlier certificates](#earlier-certificates)):

```shell-session
$ norca certificate revoke -namespace team-a -serial <serial> web-tls
```

Every certificate has a new key. **While a renewal fails, the current
certificate stays in the secret**; the operator tries again after a minute,
then waits twice as long after every failure, up to an hour.

### Status

```shell-session
$ norca object get -namespace team-a norca.io/Certificate web-tls
```

| Field | Meaning |
| --- | --- |
| `serial`, `notBefore`, `notAfter` | the current certificate |
| `renewAt` | when it is renewed |
| `secretVersion` | the version of the secret that holds it |
| `issuer`, `authority` | who signed it; `authority` is the ID of the issuing CA |
| `order` | the open order with an external issuer |
| `failures`, `retryAt` | failed attempts in a row, and the next attempt |
| `revoke` | the serial number of a certificate that was asked to be revoked and is not replaced yet: set by a revocation of the current certificate and by a withdrawal of it, gone once the next certificate is issued. It says what was asked for, not that the revocation is done |
| `revoked` | `true` once the revocation of the current certificate is done: the built-in issuer lists the serial number in the revocation list of its CA, or the external issuer has done a revocation order for it |
| `revokeReason` | with an external issuer only: the reason of the revocation order that was done, `unspecified` for none. The built-in issuer has the reason in its revocation list |
| `revoking` | set while a revocation order that a user asked an external issuer for is open: the reason of the order, `unspecified` for none. See [Revoking](#revoking) |
| `earlier` | the [earlier certificates](#earlier-certificates) of the object that are still valid |

| Condition | True when |
| --- | --- |
| `Ready` | the secret holds a certificate that is valid now |
| `Issuing` | the first certificate is on its way |
| `Renewing` | a new certificate is on its way; the current one is served |
| `Failed` | nothing can be issued, or the last attempt failed; `reason` and `message` say why |
| `IssuerUnavailable` | the controller of the external issuer is away |
| `Degraded` | `Failed` or `IssuerUnavailable` |

Reasons of `Failed`: `IssuerNotFound`, `NamesNotAllowed`, `SecretConflict`,
`InvalidSpec` (nothing is issued until the cause is gone; with
`NamesNotAllowed` the certificate is also
[withdrawn](#when-a-namespace-loses-a-name)), and
`AuthorityNotReady`, `AuthorityExpired`, `SecretWriteFailed`, `OrderFailed`,
`ChainRefused`, `KeyLost` and the like (an attempt failed and is repeated).
`RevocationPending` is the reason while the object is being
[deleted](#deleting) and waits for its certificates to be revoked: the
message names what it waits for, `Degraded` is true and `Ready` is false.
`KeyLost` says that the key waiting for the chain of an open order with an
external issuer is gone: the secret was deleted, the version that held the
key was soft deleted or destroyed, or the secret no longer holds the key.
The order is dropped, and a new one is placed with a new key.

What the operator did is in the events of the object
(`norca object events`): `Issued`, `Renewed`, `Ordered`, `Revoked` (a
revocation is done: at once when a user asks the built-in issuer, and with
an external issuer when the operator finds the revocation order done; a
withdrawal says it in `Withdrawn`), `RevocationOrdered` (a user asked an
external issuer to revoke a certificate: the revocation order is placed,
and nothing is revoked yet),
`RevocationReason` (the reason of a certificate was raised to
`keyCompromise`; the text ends with `revoked before` for a certificate that
was revoked, and with `which its issuer has not done yet` for one whose
revocation order is still open),
`Withdrawn` (the certificate was taken back from a namespace that lost its
names, or an earlier certificate of it was revoked or found not revocable
for that), `RevokedOnDelete` (the object is being [deleted](#deleting):
which of its certificates a pass revoked; a warning when it names one that
nobody could revoke), `RevocationFailed` (a warning: an external issuer did
not revoke a certificate, the current or an earlier one, also during a
deletion), `DependentKept` (a warning: the object stays although an owner
of it was deleted, see [Deleting](#deleting)), `EarlierCertificateDropped`
(an [earlier certificate](#earlier-certificates) is no longer kept in the
status), `CertificateRecovered` (a warning: the secret held a certificate
the status did not record, and it is kept as an earlier one, see
[the secret](#the-secret)), and the failures. `Revoked`, `RevocationOrdered`,
`RevocationReason` and `RevocationFailed` name the serial number, and say
"earlier certificate" when it was not the current one. **A message of an
event or of a condition that is longer than 1000 bytes is cut and ends
with ` ... (truncated)`**; this holds for the events and conditions of
every built-in operator.

`RevocationFailed` has two forms:

- **A revocation a user asked for** gives one event when its order failed,
  or when the controller of the issuer did not answer it within 24 hours:
  `the issuer "<issuer>" did not revoke the certificate with the serial <serial>: <why>; it is not revoked, and nothing is tried again: revoke it again to place a new order`.
  `<why>` is the problem of the order, `the issuer gave no reason` without
  one, or `its controller did not answer within 24h0m0s`. Nothing is tried
  again; see [Revoking](#revoking).
- **A revocation of a [withdrawal](#when-a-namespace-loses-a-name) or of a
  [deletion](#deleting)** gives one event for every failed order, and is
  asked for again: the text ends with `tried again at <time>`. An order
  that the controller does not answer within 24 hours counts as failed
  too: `failures` and `retryAt` are set, the event reads
  `... its controller did not answer within 24h0m0s; tried again at <time>`,
  and the next order is placed after the wait.

### Earlier certificates

**A certificate that a new one replaces stays valid until it expires**,
unless it was revoked: after a renewal, a changed spec, a changed issuing
CA, a deleted version of the secret. The status keeps these certificates in
`earlier`, the oldest first, so that one of them can still be
[revoked by its serial number](#revoking):

```json
"earlier": [
  {
    "authority": "7b1d9e04-52c6-4f1a-9c3e-d0a8f6b2e415",
    "issuer": "internal",
    "notAfter": "2027-02-13T12:00:00Z",
    "serial": "1d8e03b6a2c94f57e0b1c6a47f3d9e25"
  }
]
```

| Field | Meaning |
| --- | --- |
| `serial` | the serial number, in hexadecimal |
| `issuer`, `authority` | who signed it: the name of the issuer, and the ID of the issuing CA if that was the built-in issuer |
| `notAfter` | the end of its validity |
| `revoked` | `true` once its revocation is done: the built-in issuer lists the serial number in the revocation list of its CA, or the external issuer has done a revocation order for it, whether a [revocation by its serial number](#revoking-an-earlier-certificate) or a [withdrawal](#when-a-namespace-loses-a-name) placed the order. A revocation that was only asked for does not set it |
| `revokeReason` | with an external issuer only: the reason of the revocation order that was done last, `unspecified` for none. The built-in issuer has the reason in its revocation list |
| `revoking` | set while a revocation order that a user asked an external issuer for is open: the reason of the order, `unspecified` for none. Together with `revoked`: the open order raises the reason of a certificate that is revoked already. It is removed when the order ends: with `revoked` set if the order was done, without it if the order failed or was not answered in time |
| `failures`, `retryAt` | set only while a [withdrawal](#when-a-namespace-loses-a-name) or the [deletion](#deleting) of the object has it revoked by an external issuer: how many revocation orders for it failed in a row, and when the next one is placed |
| `notRevocable` | set only by a [withdrawal](#when-a-namespace-loses-a-name) or the [deletion](#deleting) of the object: why no issuer is left to revoke it |

- **An entry is added when a certificate that is still valid leaves the
  status:** a new certificate takes its place, or it is
  [withdrawn](#when-a-namespace-loses-a-name). A revoked one is kept too,
  with `revoked`: its reason may still be raised to `keyCompromise`.
- **An entry is added with `revoked` only if the revocation was done by
  then.** A certificate that was asked to be revoked (`revoke` of the
  status) and that its external issuer has not revoked enters without
  `revoked`: with `revoking` while the revocation order of a user is open,
  and with neither when the order failed. The operator sets `revoked` on
  the entry when the order is done.
- **An entry is dropped when its certificate has expired**, on the next
  pass of the operator. An expired certificate needs no revocation, and is
  not revoked by its serial number either.
- **The list holds at most 16 entries.** When one more is added, the oldest
  is dropped, and the warning event `EarlierCertificateDropped` names its
  serial number and the end of its validity: that certificate can no longer
  be revoked by its serial number. A
  [withdrawal](#when-a-namespace-loses-a-name) has the entries of a full
  list revoked before the oldest is dropped for the withdrawn certificate:
  the built-in issuer has listed the dropped one by then; a revocation by
  an external issuer that is not done by then is not asked for again.
- **The list is written by the servers only**, like the rest of the status
  of a certificate: a serial number can't be added to it by hand.
- **Deleting the `Certificate` object revokes the entries of the list**
  that are still valid, before the list goes with the object; with
  `keep_certificates = true` the list is dropped and nothing is revoked. See
  [Deleting](#deleting).

## Who may ask for which names

The operator signs with the rights of the servers, so **the servers check
what the writer of a `Certificate` may cause**, when the object is written
and again before every issuance.

**A namespace may ask for nothing until it is given names.** The names and
issuers of a namespace are in its metadata, which a management token sets,
or a [tenant](/docs/features/tenants) writes from its
`certificate_dns_suffixes`, `certificate_ip_addresses` and
`certificate_issuers`:

| Metadata of the namespace | Meaning |
| --- | --- |
| `norca.io/certificate-dns-suffixes` | DNS suffixes, comma separated: the namespace may ask for a suffix itself and for every name below it |
| `norca.io/certificate-ip-addresses` | IP addresses and networks (CIDR), comma separated |
| `norca.io/certificate-issuers` | the issuers the namespace may use, comma separated; empty: every issuer |

```hcl
name = "team-a"

meta {
  "norca.io/certificate-dns-suffixes" = "team-a.example.com"
  "norca.io/certificate-issuers"      = "internal"
}
```

- A wildcard is allowed where the names it stands for are:
  `*.web.team-a.example.com` under the suffix `team-a.example.com`.
- **The writer also needs the right to write the secret** at `secret_path`
  (`write-secret`), besides the right to write objects of the kind
  `norca.io/Certificate` in the namespace.
- IP addresses are signed by the built-in issuer only.

```hcl
namespace "team-a" {
  object "norca.io/Certificate" {
    capabilities = ["read", "write"]
  }
  secret "certs/*" {
    capabilities = ["write-secret"]
  }
}
```

Writing a `CertificateIssuer` takes the right to write objects of that kind
(`norca.io/CertificateIssuer`, cluster scoped), which an operator of the
cluster grants knowingly: an issuer decides who signs for every namespace
that may use it.

### When a namespace loses a name

When the namespace may no longer ask for the names or the issuer of a
certificate (its `norca.io/certificate-*` metadata changed, or the
`certificate_dns_suffixes`, `certificate_ip_addresses` and
`certificate_issuers` of its [tenant](/docs/features/tenants) did), nothing new
is issued (`NamesNotAllowed`) and **the certificate it has is withdrawn**:
the names may be another namespace's now, and the key and a valid
certificate for them must not stay with it until the certificate expires.

1. Every certificate of the object that is still valid and not revoked
   already is **revoked** with the reason `cessationOfOperation`, the
   current one and the [earlier ones](#earlier-certificates), each by the
   issuer that signed it: the built-in issuer lists it in the revocation
   list of the CA that signed it, with that reason code; an external issuer
   gets a [revocation order](#the-contract-of-an-external-issuer) with that
   reason, one for every serial number. **A certificate with `revoked` is
   not revoked again**, the current one or an earlier one: its issuer is
   not asked, and it keeps its reason.
2. **What the secret holds for the certificate is destroyed:** every
   version of the secret not destroyed yet, with its `cert`, `key`, `ca`
   and a waiting `next_key`; the metadata and the label of the secret stay
   for a later certificate. With
   `delete_secret = true` the whole secret is destroyed. Only a secret that
   is the certificate's own is touched, and only in the state the operator
   read.
3. **The status is cleared:** it names no current certificate, `Ready` is
   false, `Failed` says `NamesNotAllowed`, and the event `Withdrawn` says
   what was done. The withdrawn certificate, if it is still valid, is
   listed in `earlier` of the status
   ([Earlier certificates](#earlier-certificates)), with `revoked` when it
   was revoked, and with the reason in `revokeReason` when an external
   issuer revoked it; `revoke` keeps its serial number then. The status is
   cleared when the current certificate is revoked and the secret emptied:
   it does not wait for the earlier certificates.

**A withdrawal revokes the earlier certificates too.** A certificate that a
renewal, a changed spec or a deleted version of the secret replaced is as
valid for the lost names as the current one. On every pass of the operator,
as long as the namespace may not ask for the certificate, every entry of
`earlier` that is still valid and has no `revoked` is revoked by the issuer
that signed it (the `issuer` and `authority` of the entry), each on its
own: none waits for another, nor for the current certificate.

- **Built-in issuer:** the serial number is in the revocation list at once,
  and the entry gets `revoked` in the same pass.
- **External issuer:** the entry gets `revoked` only when its revocation
  order is done, and `revokeReason` with the reason of that order; an order
  that is placed revokes nothing yet.
- **An entry a user revoked is left as it is**: its reason is not changed.
  An entry a user asked to be revoked, with a revocation order that is
  still open (`revoking`), is not revoked yet: the withdrawal waits for
  that order as for one of its own.
- **The event `Withdrawn` names the earlier certificates too**, by their
  serial numbers: the ones a pass revoked, and the ones it found that can't
  be revoked. It is recorded when the current certificate is given up, and
  again whenever a later pass has such news of an earlier certificate;
  nothing is said twice.
- **With a full list of earlier certificates** the revocations come before
  the oldest entry is dropped for the withdrawn certificate
  ([Earlier certificates](#earlier-certificates)).

What holds for both the current and the earlier certificates:

- **A revocation by an external issuer is waited for.** Until the controller
  reports it done, the serial number stays in the status and `Failed` says
  that the certificate waits for the issuer to revoke it; the secret is
  emptied meanwhile. A revocation that fails gives the event
  `RevocationFailed` and is asked for again after a minute, then twice as
  long after every failure, up to an hour. An order the controller does not
  answer within 24 hours counts as failed the same way. **An earlier
  certificate waits on its own:** its failed orders are counted in `failures` of its entry,
  the next order is placed at the `retryAt` of the entry, and the event and
  `Failed` say "earlier certificate" with its serial number.
- **The lost right is found also when the issuer is gone.** The CA of the
  built-in issuer outlives the issuer object (a CA is removed only after
  every certificate it signed has expired), so the certificate is revoked
  all the same. **A certificate of an external issuer that is gone**, or
  that was recreated as a built-in one, **can't be revoked**: it is taken
  out of the secret and stays valid until it expires, unless its issuer is
  back before. `Failed` and the
  event `Withdrawn` say so, with the serial number and the end of the
  validity. It is listed in `earlier` without `revoked`, with the reason in
  `notRevocable`; an earlier certificate without an issuer is marked the
  same way. **Such an entry is tried again on every pass** of the
  withdrawal: when the issuer exists again as an external one, it gets a
  revocation order, and the entry gets `revoked` when the order is done.
- **Names given back bring a new certificate**, also while a revocation is
  still waited for: the certificate that was waited for is then listed in
  `earlier` without `revoked`, since an order that is placed has revoked
  nothing. The failures and the wait of the withdrawal do not delay the new
  certificate: `failures` and `retryAt` of the status are reset. **The
  withdrawal ends there**, for the earlier
  certificates too: a revocation order that is placed runs its course, no
  new one is placed, a failed order of the withdrawal is not placed again
  and gives no event, and `failures`, `retryAt` and `notRevocable` are
  removed from the entries. An entry whose order the issuer finishes gets
  `revoked` and `revokeReason`, and the event `Revoked` says so; one whose
  order fails stays valid and without `revoked`. The next withdrawal takes
  up what is still not revoked.
- The other refusals (`InvalidSpec`, `IssuerNotFound` alone,
  `SecretConflict`, and IP addresses an issuer recreated as an external one
  can't sign) are no lost right: nothing new is issued, and the certificate
  the namespace has stays until it expires. A withdrawal under way ends
  with them as it does with the names given back.

## Revoking

```shell-session
$ norca certificate revoke -namespace team-a -reason keyCompromise web-tls
```

**A revocation may give its reason** (`-reason`), by the name of a
CRLReason of RFC 5280: one of the reasons a subscriber may give (RFC 8555,
section 7.6), `unspecified`, `keyCompromise`, `affiliationChanged`,
`superseded` or `cessationOfOperation`. Any other reason is refused before
anything is revoked. Without a reason, or with `unspecified`, the
revocation gives none.

- **Built-in issuer:** the serial number goes onto the revocation list of
  the issuing CA: [`norca certificate crl`](/docs/commands/certificate/crl)
  or `GET /v1/certificates/crl`, a list in the form of RFC 5280, signed when
  it is asked for. A client that wants to honour it has to fetch it; the
  certificates carry no distribution point. **An entry carries the code of
  its reason**; a revocation without a reason (`unspecified`) has no reason
  code, as RFC 5280 asks.
- **External issuer:** the servers write a `CertificateOrder` with `revoke`
  set to the serial number and `reason` set to the reason, if there is one,
  for the controller to carry out.

**The built-in issuer revokes at once; an external issuer is only asked.**
A revocation order revokes nothing until the controller reports it done:

- **Asked:** the answer of the call says that the revocation is pending,
  and `norca certificate revoke` prints `Asked the issuer to revoke ...`
  instead of `Revoked ...`. The status shows `revoking` with the reason of
  the order (`unspecified` for none), and the event `RevocationOrdered`
  reads
  `revocation of the certificate with the serial <serial> ordered from the issuer "<issuer>" by <who> for the reason <reason>`.
- **Done:** when the controller has set the order to `valid`, the operator
  removes `revoking`, sets `revoked` and `revokeReason`, and records the
  event `Revoked`:
  `certificate with the serial <serial> revoked by the issuer "<issuer>" for the reason <reason>: its revocation order is done`.
- **Failed:** when the controller has set the order to `failed`, or has not
  answered it within 24 hours, the operator removes `revoking`, does not
  set `revoked`, and records one warning event `RevocationFailed`, with the
  serial number, the issuer and why. **Nothing is tried again**, and the
  conditions of the certificate stay as they are. The certificate is not
  revoked: **revoke it again to place a new order**. This can be done for
  the current certificate too, before the new one is issued.

The same holds for an [earlier certificate](#earlier-certificates) revoked
by its serial number, with these fields in its entry of `earlier`. A
certificate that is replaced while its order is open takes `revoking` with
it into `earlier`, and its entry is brought to an end there, by `revoked`
or by `RevocationFailed`.

**Only `keyCompromise` changes the reason of a revoked certificate.**
Revoking a certificate that is revoked already with any other reason, or
with none, changes nothing: its entry in the revocation list keeps its
reason, and an open revocation order of its serial number is not written
again. The same holds for a certificate whose revocation is pending
(`revoking`): no second order is placed. This holds also when a namespace
[loses a name](#when-a-namespace-loses-a-name) of a certificate that was
just revoked by hand. Revoking it again with `-reason keyCompromise` raises
its reason to `keyCompromise`: a key found exposed after its certificate was
revoked for something else is what the clients have to learn.

- **Built-in issuer:** the entry of the certificate in the revocation list
  gets the reason `keyCompromise` and keeps its time of revocation. The list
  carries the code of `keyCompromise` from then on.
- **External issuer:** a revocation order of the serial number that the
  controller has not finished gets the reason `keyCompromise`, and
  `revoking` of the status with it. When no order of the serial number is
  left (a finished one is removed), a new one with the reason is placed;
  what the certificate authority does with a reason for a certificate it
  has revoked already is its own matter. A certificate with `revoked` then
  has `revoking` too, until the order ends: done, its `revokeReason` is
  `keyCompromise`; failed or not answered in time, the event
  `RevocationFailed` reads
  `the issuer "<issuer>" did not take the reason keyCompromise for the certificate with the serial <serial>, revoked before: <why>; it stays revoked for the reason <reason>, and nothing is tried again`.
- The event `RevocationReason` says that the reason was raised, and by
  whom: it ends with `revoked before` for a certificate that is revoked,
  and with `which its issuer has not done yet` for one whose revocation
  order is open. A call that changes nothing records no event.

**A reason that no issuer is left to tell is refused** with `409`: a call
with `-reason keyCompromise` for a revoked certificate of an external
issuer, the current one or an [earlier one](#earlier-certificates), when
that issuer is gone, or the issuer of that name is no longer the external
issuer that signed it. The message says that the certificate is revoked,
and that its reason stays:
`the certificate with the serial <serial> is revoked already, and the reason of that is not changed to keyCompromise, nobody can revoke the certificate: the issuer "<issuer>" is gone`,
or with
`the issuer "<issuer>" is no longer the external issuer that signed it`
in the place of `the issuer "<issuer>" is gone`. **Nothing is written**: no
order is placed, the status keeps `revoked` and `revokeReason` as they are,
and no event is recorded. A call with any other reason, or with none, is
not refused: it changes nothing, as with the issuer in place.

> [!IMPORTANT]
> **Without a serial number a revocation acts on the current certificate of
> the object**, the one with the `serial` of the status. The built-in
> issuer issues the new certificate right after a revocation, so a second
> `norca certificate revoke` without `-serial` revokes the new certificate
> and leaves the reason of the one revoked first as it is. That one is an
> [earlier certificate](#earlier-certificates) by then: **to raise its
> reason, name it by its serial number**
> (`-serial <serial> -reason keyCompromise`).

**A certificate the built-in issuer signed** (its status has an
`authority`) **is always revoked at the CA that signed it**, also when an
issuer of the same name was recreated as an external one.

After a revocation of the current certificate, with either issuer, a new
certificate with a new key is issued and written to the secret; with an
external issuer it does not wait for the revocation order, and is issued
also when the order fails. A request that is refused (see below) issues
nothing. The servers
also revoke on their own, without a new certificate, when a namespace
[loses a name](#when-a-namespace-loses-a-name).

**A revocation of the current certificate that nobody can carry out is
refused** with `409`, at the first request and at a repeated one after a
failed order, in two cases:

- **A revocation order of the serial number that is over without the
  revocation is still there**, in the short time before the operator has
  removed it: the failed order of the request before, or one that a
  withdrawal placed before the namespace got its names back. The message is
  `the last revocation order of the certificate with the serial <serial> is over, and the certificate is not revoked; ask again`.
  Asked again once the order is removed, a new order is placed.
- **No issuer is left to revoke it:** its external issuer is gone, or the
  issuer of that name is no longer the external issuer that signed it. The
  message says which, and until when the certificate stays valid:
  `the certificate with the serial <serial> is not revoked, nobody can revoke the certificate: the issuer "<issuer>" is gone; it stays valid until <time>, and the request changes nothing`,
  or with
  `the issuer "<issuer>" is no longer the external issuer that signed it`
  in the place of `the issuer "<issuer>" is gone`. A repeated request
  gets the same without `, and the request changes nothing`. So does a
  request with `-reason keyCompromise` while the revocation order is still
  open (`revoking`): the reason of the order is not changed. For a
  certificate that is revoked already the message is that of a reason no
  issuer is left to tell (see above).

**A refused request writes nothing**: no order is placed, the status is not
changed and no event is recorded. A first request so leaves the status
without `revoke`, and no new certificate is issued: the certificate stays
the current one and in use, whatever reason the request gave.

### Revoking an earlier certificate

```shell-session
$ norca object get -namespace team-a norca.io/Certificate web-tls
$ norca certificate revoke -namespace team-a -serial 1d8e03b6a2c94f57e0b1c6a47f3d9e25 web-tls
```

**A revocation may name the certificate by its serial number** (`-serial`),
in hexadecimal, as the status shows it; upper case, colons between the
octets, a leading `0x` and leading zeros are accepted. What happens depends
on whose serial number it is:

- **The current certificate** (`serial` of the status): the revocation is
  what it is without a serial number, and a new certificate is issued.
- **An [earlier certificate](#earlier-certificates)** (an entry of
  `earlier` of the status): it is revoked by the issuer that signed it, the
  `issuer` and `authority` of the entry, whatever the issuer of the object
  is now. **No new certificate is issued**: the current certificate stays,
  the secret is not touched, and `revoke` of the status is not set. The
  entry stays in the list until the certificate expires.
  - **Built-in issuer:** the serial number goes onto the revocation list of
    the CA that signed it, and the entry gets `revoked` at once.
  - **External issuer:** a revocation order with the serial number and the
    reason is written for the controller of the issuer that signed it. The
    entry gets `revoking` with the reason of the order, not `revoked`: the
    operator sets `revoked` and `revokeReason` when the order is done. An
    order that fails, or is not answered within 24 hours, ends `revoking`
    with the event `RevocationFailed` and leaves the entry without
    `revoked`; the certificate can then be revoked again, which places a
    new order. See [Revoking](#revoking).
- **An earlier certificate whose revocation is pending** (its entry has
  `revoking` and no `revoked`): a call with the same reason, another
  reason or none changes nothing and places no second order; only
  `keyCompromise` rewrites the open order, and `revoking` with it.
- **An earlier certificate that is revoked already** (its entry has
  `revoked`): only `keyCompromise` changes its reason, as for the current
  certificate, in the entry of the revocation list or in the revocation
  order; any other call changes nothing. This is how the reason of a
  certificate is raised after its successor was issued.
- **A revoked certificate of the object that the status no longer lists**,
  with the built-in issuer: while a revocation list of a CA of the region
  still has the serial number as a certificate of this object, its reason
  can be raised to `keyCompromise`. Any other call changes nothing. The
  entry of the revocation list carries the ID of the object: **an object
  created again under the namespace and name of a deleted one can't raise
  the reason of the certificates of the deleted one**; for it they are
  serial numbers that are not its own.

The events of an earlier certificate:

- **Built-in issuer:** `Revoked` reads
  `earlier certificate with the serial <serial> revoked by <who>`, with the
  reason if one was given, and ends with `the current certificate stays`.
- **External issuer:** `RevocationOrdered` reads
  `revocation of the earlier certificate with the serial <serial> ordered from the issuer "<issuer>" by <who> for the reason <reason>; the current certificate stays`.
  The operator records `Revoked` when the order is done:
  `earlier certificate with the serial <serial> revoked by the issuer "<issuer>" for the reason <reason>: its revocation order is done`.
  It records this for a revocation order that a
  [withdrawal](#when-a-namespace-loses-a-name) placed too, when the issuer
  finishes it and the namespace has the names back by then. A failed order
  of a user gives `RevocationFailed`, with `earlier certificate` in the
  place of `certificate`.
- A raised reason gives the event `RevocationReason`, which names the
  earlier certificate by its serial number.

**What is refused**, with nothing revoked:

- **A serial number that is not hexadecimal.**
- **A serial number that is not a certificate of the object:** neither its
  current certificate, nor an entry of `earlier`, nor a revoked serial
  number of the object in a revocation list. This is so for an earlier
  certificate that has expired, and for one that was dropped from `earlier`,
  unless a revocation list still has it. The message is the same whether
  nobody has the serial number or another `Certificate` object does.
- **An earlier certificate that no issuer is left to revoke:** its external
  issuer is gone, or was recreated as a built-in one. The message says so,
  and until when the certificate stays valid; its entry is not marked
  `revoked`. **For an entry that has `revoked` already**, what is refused
  is the reason `keyCompromise`, and the message says
  `the certificate with the serial <serial> is revoked already, and the reason of that is not changed to keyCompromise`,
  and why: the entry keeps `revoked` and its `revokeReason`. A call with
  another reason, or with none, for such an entry is not refused, and
  changes nothing.
- **An earlier certificate whose last revocation order is over without the
  revocation**, in the short time before the operator has removed that
  order: the order failed, and the entry has no `revoked`. The message says
  that the last revocation order of the serial number is over and the
  certificate is not revoked, and to ask again. Once the order is removed,
  the same call places a new one.

> [!WARNING]
> **Only the status of the object says which certificates were its own.**
> With the `Certificate` object its status goes, `earlier` included, and
> `norca certificate revoke` finds its certificates no longer. That is why
> [deleting the object](#deleting) revokes them first. With
> `keep_certificates = true` it does not: revoke what has to be revoked
> before deleting such an object.

## Deleting

**Deleting a `Certificate` revokes its certificates first.** The current
certificate and the [earlier certificates](#earlier-certificates) that are
still valid and not revoked already are revoked with the reason
`cessationOfOperation`, each by the issuer that signed it, as a
[withdrawal](#when-a-namespace-loses-a-name) revokes them. The object
carries the finalizer `norca.io/operators` from its first write, so a
delete only marks it (`norca object delete` prints
`... is marked for deletion (background); waiting for the finalizers norca.io/operators`),
and **the object stays, being deleted, until every one of these
certificates is revoked, has no issuer left to revoke it, or has expired**.

- **Built-in issuer:** the serial numbers are in the revocation list of the
  CA at once, and the object goes in the same pass of the operator.
- **External issuer:** every certificate gets a
  [revocation order](#the-contract-of-an-external-issuer), and the object
  waits until the controller of the issuer has done them. A revocation that
  fails, or that the controller does not answer within 24 hours, gives the
  event `RevocationFailed` and is asked for again after a
  minute, then twice as long after every failure, up to an hour, each
  certificate on its own (`failures` and `retryAt` of the status, or of the
  entry of `earlier`). **It is never given up on its own:** as long as the
  certificate is valid and its issuer exists, the object waits.
- **No issuer left:** a certificate of an external issuer that is gone, or
  that was recreated as a built-in one, can't be revoked and does not hold
  the object. It stays valid until it expires; the event `RevokedOnDelete`
  (a warning then) and a warning in the log of the servers name its serial
  number.

While the object waits, the condition `Failed` has the reason
`RevocationPending` and a message that says what the deletion waits for
(`Degraded` is true, `Ready` is false), the status shows what is revoked
already, and the event `RevokedOnDelete` tells what a pass has revoked.

**Three ways out for an object that waits for a revocation that does not
come:**

1. Apply the object with `keep_certificates = true`: it goes at once, and
   what is not revoked yet stays valid.
2. Delete the `CertificateIssuer` object of the external issuer: its
   certificates have no issuer left then. A revocation order that is still
   open is waited for first; one the controller does not answer counts as
   failed 24 hours after it was placed, and is removed.
3. Remove the finalizer `norca.io/operators` with a management token.

**The secret stays**, unless `delete_secret` is set. Once the deletion has
revoked the certificate, the secret holds a revoked certificate and its
key, so **whatever still reads the secret breaks**: stop using the secret
before deleting the object, or keep the certificate with
`keep_certificates`. With `delete_secret = true` the operator destroys the
secret in the first pass of the deletion, without waiting for the
revocations, if it is the certificate's own. It destroys only the secret as
it read it: a secret changed in the meantime is read again first, and kept
if it is no longer the certificate's.

**With `keep_certificates = true` nothing is revoked**, and the object goes
at once, or with `delete_secret` as soon as its secret is destroyed. The
current certificate and the earlier ones stay valid until they expire, and
**those serial numbers can never be revoked afterwards**:
`norca certificate revoke` no longer finds them, and an object created
again under the same name can't reach them. [Revoke](#revoking) them first
if they must not stay valid.

**A `Certificate` whose spec no longer passes its kind can still be
deleted.** If the spec can't be decoded, its certificates are revoked from
what the status lists (unless `keep_certificates` can still be read as
`true`), and the secret is left in place, also with `delete_secret`:
nothing is destroyed on the word of a spec that can't be read.

**A certificate of an object that is being deleted can still be revoked**
with [`norca certificate revoke`](/docs/commands/certificate/revoke), for
example with `-reason keyCompromise` while the deletion waits for an
external issuer: the open revocation order gets the reason. No new
certificate is issued for such an object.

**Deleting an owner of a `Certificate` needs the right to delete the
certificate.** A `Certificate` that has an
[owner](/docs/features/operator-framework/lifecycle#owners-and-garbage-collection)
is deleted with it in the `background` and `foreground` modes, and its
valid certificates are revoked as above. So the caller needs the object
capability `write` on the kind `norca.io/Certificate` in the namespace of
the certificate; without it the deletion of the owner is refused with
`403`. A `Certificate` nobody was checked for (it was written after the
deletion of the owner was asked for, or the servers deleted the owner
themselves) is not deleted: it stays, its reference to the owner is
removed, and it gets the warning event `DependentKept`. A
`CertificateIssuer` has no such guard.

**What waits for the object:** a namespace can't be deleted while it has a
`Certificate` object, one that is being deleted included, and the deletion
of a [tenant](/docs/features/tenants#deleting) waits until its namespace is
empty. A revocation that does not come holds both up until one of the ways
out above is taken.

## In the web UI

The **Certificates** page of the menu shows the region at a glance:

- **Certificates:** every `Certificate` of the namespaces the token can
  read, the soonest expiry first, with its names, its issuer and its state
  (`ready`, `issuing`, `renewing`, `renewal due`, `failed`,
  `issuer unavailable`, `revoking`, `expired`).
- **Issuers:** built in or external, the controller of an external issuer
  with the age of its heartbeat, and how many certificates use the issuer.
- **Open orders:** what waits for an external issuer, with the problem of a
  failed order.
- **Issuing CAs of the region:** the active CA and the retired ones, where
  they come from, when they expire and how many certificates they revoked.
  **Trust bundle** downloads the bundle of
  [`norca certificate roots`](/docs/commands/certificate/roots), and
  **Revocation list** shows the list of a CA.

The page of a `Certificate` object adds a panel above the spec and the
status: the names, links to the issuer, to the secret and to the open order,
the serial number, and the validity as a bar with the time of the renewal.
**Revoke** is there for a token with `write` on the kind in the namespace;
it asks for a confirmation and gives no reason.

The page of a secret that is kept for a certificate links back to the
certificate.

## The contract of an external issuer

A controller of an external issuer is an application with a token that may
read `norca.io/CertificateIssuer` objects and read and write the status of
`norca.io/CertificateOrder` objects (cluster scoped). **It needs no access
to the secrets of the namespaces.**

1. **Heartbeat.** For every issuer with its name in `controller`, it writes
   the status of the issuer at least once a minute:

   ```json
   {
     "heartbeat": "2026-11-15T12:00:00Z",
     "roots": "-----BEGIN CERTIFICATE-----\n..."
   }
   ```

   `roots` are the root certificates its chains lead to.

2. **Orders.** The servers create one order per issuance, named
   `<namespace>.<certificate>.<n>`:

   ```json
   {
     "spec": {
       "issuer": "public",
       "certificate": "team-a/web-tls",
       "csr": "-----BEGIN CERTIFICATE REQUEST-----\n...",
       "dns_names": ["web.team-a.example.com"]
     },
     "status": { "state": "pending" }
   }
   ```

   The controller has the request signed and writes the status of the order:

   | Field | Meaning |
   | --- | --- |
   | `state` | `pending`, `processing`, `valid` or `failed` |
   | `chain` | with `valid`: the certificate and the intermediate certificates (PEM) |
   | `renew_after` | optional: when the issuer wants the certificate renewed (RFC 3339) |
   | `problem` | with `failed`: the reason, shown on the certificate |
   | `progress` | free for the controller, to continue after a restart |

3. **Revocations.** An order with `revoke` set to a serial number and no
   `csr` asks for a revocation; the controller answers with `valid` or
   `failed`. `reason`, if set, is why: the name of a CRLReason of RFC 5280
   (section 5.3.1), such as `cessationOfOperation`, which the servers give
   when a namespace [lost the names](#when-a-namespace-loses-a-name) of the
   certificate or the `Certificate` object is [deleted](#deleting), or the
   reason a user gave to
   [`norca certificate revoke`](/docs/commands/certificate/revoke): one of
   `keyCompromise`, `affiliationChanged`, `superseded` and
   `cessationOfOperation`. An order without `reason` gives none
   (unspecified). The revocation matters more than its reason: a
   controller whose certificate authority refuses the reason should revoke
   without it. The servers may change the `reason` of an order that is not
   `valid` or `failed` yet to `keyCompromise`, when a user
   [revokes the certificate again](#revoking) for that reason. A
   revocation order that is neither `valid` nor `failed` 24 hours after it
   was written has failed and is removed: the revocation of a user ends as
   a failed one then, and a withdrawal or a deletion counts the failure and
   places a new order after its wait. **A finished revocation order is
   removed only after the status of the certificate records its result**;
   its event is recorded then.

**The servers check a chain before they trust it:** the certificate is for
the key of the request and for exactly the names asked for, it is valid now,
and the chain leads to a root in `roots` of the issuer. A chain that fails a
check is refused (`ChainRefused`) and the certificate is ordered again
later. The servers delete an order when it is done.

## Metrics

In the [metrics store](/docs/configuration/metrics_store):

| Metric | Labels | Meaning |
| --- | --- | --- |
| `norca.certificate.ready` | `ns`, `name` | 1 while the certificate is ready |
| `norca.certificate.expires_hours` | `ns`, `name` | hours until the current certificate expires; 0 once it has |
| `norca.objects.count`, `norca.objects.degraded` | `kind` | the objects of the three kinds, and those that are degraded |

## Limits

- The built-in issuer signs for at most a year.
- Nothing proves to the built-in issuer that a name belongs to the
  namespace: the suffixes of the namespace are the rule.
- **A wildcard right under a top level name, such as `*.lab`, is refused**
  when the certificate is written: TLS clients (curl, OpenSSL) do not match
  `app.lab` against it. Put the wildcard one level lower: `*.apps.lab`.
- The revocation list is not pushed anywhere, and OCSP is not served.
- The trust bundle of the built-in issuer is per region.

## See also

- [Certificates from ACME](/docs/features/certificates-acme): the operator
  `norca-acme` as the controller of an external issuer
- [`norca certificate`](/docs/commands/certificate) commands and the
  [Certificates HTTP API](/docs/api/certificates)
- [Secrets](/docs/features/secrets) and
  [how tasks read them](/docs/features/secrets/delivery)
- [Operator framework](/docs/features/operator-framework): objects, kinds,
  conditions, events
