---
title: "Certificates from ACME"
linkTitle: "Certificates from ACME"
description: "Public certificates from an ACME certificate authority such as Let's Encrypt: the operator norca-acme is the controller of an external issuer, proves the names with HTTP-01 through the edge router or with DNS-01 through norca-provider, and never sees a private key."
weight: 49
---

## What and why

**`norca-acme` gets the certificates of [`Certificate`](/docs/features/certificates)
objects signed by an ACME certificate authority** (RFC 8555), such as Let's
Encrypt. It is the controller of an
[external issuer](/docs/features/certificates#an-external-issuer): the
servers keep the certificate, the operator talks to the certificate
authority.

| Part | Who | What |
| --- | --- | --- |
| Key, signing request, secret, renewal, allowed names | the servers | As for every `Certificate`. |
| Account, order, proof of the names, chain | `norca-acme` | A job of the norca-acme pack. |
| TXT records for DNS-01 | `norca-provider` | A provider with a `dns` section, which has the credentials of the DNS service. |
| Port 80 for HTTP-01 | the edge router | The Traefik pack with `acme_challenge = true`. |

- **The operator never sees a private key of a certificate** and reads no
  secret of a namespace. It gets the signing request and returns the chain.
- **The servers need no way out** to the certificate authority or to a DNS
  API; only the operator and the provider do.
- **The servers check what comes back**: the chain must be for the key and
  the names of the request and lead to a root the issuer declared.

## Install

Three packs of the [pack registry](/docs/features/packages/registry). norca-acme and
norca-provider are [operator packs](/docs/features/packages/registry#packs): their jobs run in the
namespace `norca-system` by default, which must exist, and keep off nodes with the `raw_exec`
driver.

```shell-session
$ norca namespace apply -description "Norca operators" norca-system
$ norca pack run traefik --registry=norca --name=traefik --var acme_challenge=true ...
$ norca pack run norca-provider --registry=norca --name=dns -f dns.hcl     # for DNS-01
$ norca pack run norca-acme --registry=norca --name=acme
```

- **norca-acme** installs the job and an ACL policy bound to it: `read` and
  `write-status` on `CertificateIssuer` and `CertificateOrder`, `read` on
  `DNSZone`, its own secrets below `norca-acme/` and the tokens of the DNS
  zones, both in the namespace of its job.
- **norca-provider** is needed for DNS-01 only (see [DNS-01](#dns-01)).
- **traefik** needs `acme_challenge = true` for HTTP-01 only (see
  [HTTP-01](#http-01)).

> [!NOTE]
> Run one instance of `norca-acme`, or several with
> [leader election](#leader-election). The answers of the HTTP-01
> challenges are in the memory of the instance that placed the order. An
> order that is open when the instance is lost is continued by the next one.

### Leader election

**With `-leader-election`** (a flag of `norca-acme`, off by default; the
pack runs one instance without it) **several instances are safe**: they
share a lease, the Variable `controller-lease/<controller>`
(`controller-lease/norca-acme` by default) in the namespace of
`-lease-namespace` (`norca-system` by default), and only the instance that
holds it works. An allocation that was lost but still runs while its
replacement starts then places no second order.

- **Every side effect waits for the lease:** a call that changes something
  at the certificate authority (the account, an order, a challenge, the
  finalization, a revocation), a challenge record in a DNS zone, a write of
  the secrets of the operator and the status of an issuer are made only
  while the lease cannot have passed to another instance (the
  [fence](/docs/features/operator-framework/controllers#fencing-side-effects)
  of the controller SDK). A refused call changes nothing and counts no
  attempt of the order.
- **The ACL policy needs the lease.** The policy the pack installs does not
  grant it; add to the policy bound to the job:

  ```hcl
  namespace "norca-system" {
    variables {
      path "controller-lease/norca-acme*" {
        capabilities = ["list", "read", "write"]
      }
    }
  }
  ```

- **More instances do not share the work.** The HTTP-01 server answers on
  every instance, but only the one that works knows the answers: a
  challenge request that reaches another instance gets `404`. DNS-01 does
  not depend on it.

## The issuer

```hcl
kind = "norca.io/CertificateIssuer"
name = "letsencrypt"

spec {
  external {
    controller = "norca-acme"
    config {
      directory = "https://acme-v02.api.letsencrypt.org/directory"
      email     = "ops@example.com"
      dns01 {
        zones = ["example.com"]
      }
    }
  }
}
```

| `config` | Meaning |
| --- | --- |
| `directory` | URL of the ACME directory (https). **Use the staging directory of the certificate authority while trying.** |
| `email` | Contact of the account. |
| `eab_secret` | Path of a secret of the operator with the items `kid` and `hmac_key` (base64url), for a certificate authority that requires an external account binding. |
| `roots` | Root certificates (PEM) the chains lead to. Without it the chains are verified against the roots of the node the operator runs on. A private or test certificate authority needs it. |
| `http01` | `false` turns the HTTP-01 challenge off for the issuer. |
| `dns01 { zones }` | The DNS zones the issuer may use; empty or absent: every registered zone. |
| `dns01 { disabled = true }` | No DNS-01 for the issuer. |

> [!IMPORTANT]
> **Writing the issuer accepts the terms of service of its certificate
> authority.** The object is public like every object: `config` holds paths
> of secrets, never a secret.

The operator opens **an account per issuer**. The key of the account is a
secret of the operator (`norca-acme/accounts/<issuer>`); it is made before
the account is opened, so it cannot be lost. The key is stored with
check-and-set: when two instances of the operator run at once (for example
during a rolling update), the one that finds a key stored meanwhile by the
other uses that key, so both use the same account.

The status of the issuer is the operator's:

| Field | Meaning |
| --- | --- |
| `heartbeat` | Written every 30 seconds once the account is open. Without it the servers order nothing from the issuer. |
| `roots` | The configured roots and those the chains of the issuer ended in. |
| `account`, `directory` | The account at the certificate authority. |
| `problem` | Why the issuer cannot work: an invalid configuration, a certificate authority that cannot be reached, a missing account binding. |

## A certificate

Nothing differs from a certificate of the built-in issuer, except the
issuer:

```hcl
kind      = "norca.io/Certificate"
namespace = "team-a"
name      = "web-tls"

spec {
  issuer      = "letsencrypt"
  dns_names   = ["example.com", "*.example.com"]
  secret_path = "certs/web"
}
```

The namespace must be [allowed the names](/docs/features/certificates#who-may-ask-for-which-names).
The servers renew at two thirds of the validity, or when the certificate
authority suggests (ACME renewal information, RFC 9773), which the operator
passes on.

## How a name is proven

| The name | Challenge |
| --- | --- |
| is in a DNS zone the issuer may use | **DNS-01** |
| is a wildcard | **DNS-01**, the only way |
| anything else | **HTTP-01** |

A name in a zone whose provider reports no heartbeat is proven over HTTP
meanwhile; a wildcard waits for the provider.

### HTTP-01

The certificate authority asks `http://<name>/.well-known/acme-challenge/<token>`
on port 80. The operator answers it itself.

1. **The name must point at the edge router**, and port 80 must reach it.
2. **The Traefik pack with `acme_challenge = true`**: its redirect to https
   leaves the path of the challenge out. The redirect becomes a router of
   the dynamic configuration instead of the redirection of the entrypoint;
   everything else is redirected as before.
3. **The namespace of `norca-acme` (`norca-system` by default) in
   `catalog_namespaces` of Traefik**: the service of the operator carries the
   router of the path as catalog tags (`http01_entrypoints` of the norca-acme
   pack, `["web"]`). Traefik reads the services of another namespace than its
   own only with an ACL policy bound to its job that allows it; the output of
   the traefik pack prints one.

With another edge router, route that path of every host on port 80 to the
service `norca-acme`.

### DNS-01

The certificate authority looks for a TXT record at
`_acme-challenge.<name>`. The record is written by `norca-provider`, which
keeps the credentials of the DNS service:

```json
{
  "name": "dns-eu",
  "type": "rfc2136",
  "params": {"server": "ns1.example.com", "tsig_key": "norca-acme", "tsig_secret": "env:TSIG_SECRET"},
  "token": "env:DNS_TOKEN",
  "token_variable": "providers/dns-eu",
  "dns": {"zones": [{"zone": "example.com"}]}
}
```

- `norca-provider` registers **a `norca.io/DNSZone` object per zone** and
  keeps its heartbeat, as it does for node providers and load balancer
  classes.
- The operator calls the provider with the token of the Variable
  `token_variable` names (item `token`).
- **Only challenge records can be written through a zone**: a name is
  `_acme-challenge.<a name of the zone>`. The token of a zone cannot change
  what the zone serves. A zone that says `"records": true` lets the
  operator [norca-dns](/docs/features/dns-records) write its A, AAAA,
  CNAME and TXT records as well; challenge names stay with norca-acme.
- A name holds several values at once: a name and its wildcard are proven
  at the same record name.
- **The operator waits for the name servers.** It tells the certificate
  authority to look when every name server of the zone answers the record
  (`dns_propagation_check`, `dns_resolver`, `dns_propagation_timeout`), and
  removes the record afterwards.

| DNS type | For |
| --- | --- |
| `rfc2136` | Name servers that accept dynamic updates (RFC 2136) signed with a TSIG key (RFC 8945): BIND, Knot DNS, PowerDNS. `server` is the primary of the zone; `tsig_algorithm` is `hmac-sha256`, `hmac-sha384` or `hmac-sha512`. With a TSIG key the queries are signed too, and an answer without a signature is refused. |
| `mock` | Trials: records in memory, served to nobody. |

## Serving the certificate with Traefik

The Traefik pack reads the secrets of `tls_certificates` when it starts, and
the HTTP-01 challenge needs Traefik before the certificate exists. **Start
with a placeholder and hand it over**:

1. Write the secret with any certificate, for example a self-signed one,
   and name it in `tls_certificates` of the Traefik pack:

   ```shell-session
   $ norca secret put certs/web cert=@placeholder.crt key=@placeholder.key
   ```

2. Hand the secret over to the certificate that will keep it, with its
   label, and write the `Certificate` with the same `secret_path`:

   ```shell-session
   $ norca secret put -label norca.io/certificate=web-tls certs/web
   $ norca object apply web-tls.hcl
   ```

3. When the certificate is issued, the servers write it into the secret and
   **Traefik serves it without a restart**, as it does at every renewal.

Until then Traefik answers the name with the placeholder (or with its
default certificate), which clients do not trust.

## Failures

- **A request the certificate authority refuses** (a name it does not
  accept, a proof it does not find) fails the order with its problem. The
  certificate shows it in its `Failed` condition (`OrderFailed`), and the
  servers order again later, with their own delay.
- **A failure that passes** (the certificate authority or a DNS provider
  away, a rate limit, a record not yet at the name servers) is tried again
  after `retry_base` (one minute), doubled up to `retry_max` (two hours),
  `max_attempts` (8) times.
- **The certificate a workload has stays in place** in every case.

> [!WARNING]
> Certificate authorities limit the number of orders and of failed
> validations per account and per name. Try an issuer against the staging
> directory first.

## Revoking

`norca certificate revoke <name>` writes a revocation order; the operator
revokes the certificate at the certificate authority and the servers issue
a new one. **The reason a user gives** (`-reason`, for example
`-reason keyCompromise`) is the `reason` of the order; without one, or with
`unspecified`, the order has none. The operator keeps the certificates it
issued until they expire (`norca-acme/issued/<issuer>/<serial>`): they are
public, and a revocation needs the certificate itself.

The servers also revoke on their own, with the reason
`cessationOfOperation`, when a namespace
[loses the names](/docs/features/certificates#when-a-namespace-loses-a-name)
of a certificate; no new certificate is issued then. The operator passes the
`reason` of the order on to the certificate authority: `unspecified`,
`keyCompromise`, `affiliationChanged`, `superseded` or
`cessationOfOperation` (RFC 8555, section 7.6). An order without a reason,
or with one the operator does not know, is revoked as `unspecified`. **A
certificate authority that refuses the reason** (`badRevocationReason`) is
asked once more without it: the revocation matters more than its reason.

## Settings of the norca-acme pack

| Variable | Default | Meaning |
| --- | --- | --- |
| `namespace` | `norca-system` | The namespace of the operator job and its secrets; it must exist. |
| `driver`, `allow_raw_exec_nodes` | `exec`, `false` | The task driver; the job keeps off nodes with `raw_exec` unless `allow_raw_exec_nodes` is set. |
| `controller` | `norca-acme` | The name issuers name the operator by. |
| `secret_prefix` | `norca-acme/` | Where the operator keeps its secrets in its namespace. |
| `http01_enabled`, `http01_entrypoints` | `true`, `["web"]` | The HTTP-01 service and the Traefik entrypoints its router is on. |
| `zone_token_namespace`, `zone_token_path` | `""` (the namespace of the job), `providers/*` | The Variables with the tokens of the DNS zones. |
| `zone_ttl` | `3m` | When a zone without a heartbeat counts as away. |
| `zone_allow_http`, `zone_ca_cert` | `false`, `""` | http endpoints of DNS providers (trials only); the CA of their https certificates. |
| `dns_resolver` | the resolver of the node | The recursive resolver the name servers of a zone are found with. |
| `dns_propagation_check`, `dns_propagation_timeout` | `true`, `5m` | The wait for the name servers. |
| `acme_ca_cert` | `""` | The CA of the https certificate of the ACME directory, for a private certificate authority. |
| `retry_base`, `retry_max`, `max_attempts` | `1m`, `2h`, `8` | Attempts of an order. |

## Limits

- The TLS-ALPN-01 challenge is not supported.
- One instance of the operator works at a time. With
  [leader election](#leader-election) the others are standbys; without it,
  run one.
- DNS types: `rfc2136` and `mock`. The DNS services of the cloud platforms
  are not there yet.
- A certificate that another client of the same account issued cannot be
  revoked through the operator.

## See also

- [Certificates](/docs/features/certificates): the objects, the secret, the
  allowed names, the contract of an external issuer
- [Pack registry](/docs/features/packages/registry): the packs `norca-acme`,
  `norca-provider` and `traefik`
