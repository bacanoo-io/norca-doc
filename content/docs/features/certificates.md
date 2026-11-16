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
never rotates an imported CA; import its successor before it expires.

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
  object. **A secret that was not written for the certificate is never
  overwritten**: the certificate then has the reason `SecretConflict`.
  To hand an existing secret over to a certificate, label it; the next
  version is the certificate's:

  ```shell-session
  $ norca secret put -namespace team-a -label norca.io/certificate=web-tls certs/web
  ```
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
5. When the secret is gone.

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

| Condition | True when |
| --- | --- |
| `Ready` | the secret holds a certificate that is valid now |
| `Issuing` | the first certificate is on its way |
| `Renewing` | a new certificate is on its way; the current one is served |
| `Failed` | nothing can be issued, or the last attempt failed; `reason` and `message` say why |
| `IssuerUnavailable` | the controller of the external issuer is away |
| `Degraded` | `Failed` or `IssuerUnavailable` |

Reasons of `Failed`: `IssuerNotFound`, `NamesNotAllowed`, `SecretConflict`,
`InvalidSpec` (nothing is issued until the cause is gone), and
`AuthorityNotReady`, `SecretWriteFailed`, `OrderFailed`, `ChainRefused` and
the like (an attempt failed and is repeated).

What the operator did is in the events of the object
(`norca object events`): `Issued`, `Renewed`, `Ordered`, `Revoked`, and the
failures.

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

When a namespace loses a name, nothing new is issued for it
(`NamesNotAllowed`); the certificate it has stays until it expires.

Writing a `CertificateIssuer` takes the right to write objects of that kind
(`norca.io/CertificateIssuer`, cluster scoped), which an operator of the
cluster grants knowingly: an issuer decides who signs for every namespace
that may use it.

## Revoking

```shell-session
$ norca certificate revoke -namespace team-a web-tls
```

- **Built-in issuer:** the serial number goes onto the revocation list of
  the issuing CA: [`norca certificate crl`](/docs/commands/certificate/crl)
  or `GET /v1/certificates/crl`, a list in the form of RFC 5280, signed when
  it is asked for. A client that wants to honour it has to fetch it; the
  certificates carry no distribution point.
- **External issuer:** the servers write a `CertificateOrder` with `revoke`
  set to the serial number, for the controller to carry out.

In both cases a new certificate with a new key is issued and written to the
secret.

## Deleting

Deleting a `Certificate` leaves the secret in place, so nothing that reads
it breaks. With `delete_secret = true` the operator deletes the secret
first, if it is the certificate's own.

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
it asks for a confirmation.

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
   `failed`.

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
