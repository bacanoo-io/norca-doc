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
| Account, order, proof of the names, chain | `norca-acme` | A job of the norca-acme module. |
| TXT records for DNS-01 | `norca-provider` | A provider with a `dns` section, which has the credentials of the DNS service. |
| Port 80 for HTTP-01 | the edge router | The Traefik module with `acme_challenge = true`. |

- **The operator never sees a private key of a certificate** and reads no
  secret of a namespace. It gets the signing request and returns the chain.
- **The servers need no way out** to the certificate authority or to a DNS
  API; only the operator and the provider do.
- **The servers check what comes back**: the chain must be for the key and
  the names of the request and lead to a root the issuer declared.

## Install

Three modules of the [Norca registry](/docs/features/packages/registry). norca-acme and
norca-provider are [operator modules](/docs/features/packages/registry#operator-modules): their jobs
run in the namespace of their release, `norca-system` here, which must exist, and keep off nodes with
the `raw_exec` driver.

The servers install traefik and norca-acme from the global registry; the other values of Traefik go
into its `ValuesJSON` too. norca-provider takes a file of values, so it is installed from a checkout
of the registry.

```shell-session
$ norca namespace apply -description "Norca operators" norca-system
$ norca rigger registry sync global
$ norca operator api -X PUT /v1/rigger/install <<'EOF'
{"Release": "traefik", "Registry": "global", "Module": "norca/traefik", "Version": "~> 0.3",
 "ValuesJSON": {"acme_challenge": true}}
EOF
$ norca rigger install <checkout>/modules/norca-provider -name dns -namespace norca-system -f dns.hcl     # for DNS-01
$ norca operator api -namespace norca-system -X PUT /v1/rigger/install <<'EOF'
{"Release": "acme", "Registry": "global", "Module": "norca/norca-acme", "Version": "~> 0.3"}
EOF
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
> challenges are in the memory of the instance that works on the orders and
> are not shared. An order that is open when the instance is lost is
> continued by the next one, which presents its challenge again.

### Leader election

**With `-leader-election`** (a flag of `norca-acme`, off by default; the
module runs one instance without it, and sets it with `leader_election = true`
or a `count` above 1) **several instances are safe**: they
share a lease, the Variable `controller-lease/<controller>`
(`controller-lease/norca-acme` by default) in the namespace of
`-lease-namespace` (`norca-system` by default; the module passes the namespace
of the job, or its `lease_namespace`), and only the instance that
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
- **The ACL policy needs the lease.** The policy the module installs grants
  it when leader election is on. A policy written by hand needs:

  ```hcl
  namespace "norca-system" {
    variables {
      path "controller-lease/norca-acme*" {
        capabilities = ["list", "read", "write"]
      }
    }
  }
  ```

- **More instances do not share the work.** The others are standbys. Only
  the instance that holds the lease answers the HTTP-01 challenges and
  reports ready: a standby answers a challenge request with `503`, and the
  edge must send the challenges to the ready instance only (see
  [HTTP-01](#http-01)). DNS-01 does not depend on it.

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
2. **The Traefik module with `acme_challenge = true`**: its redirect to https
   leaves the path of the challenge out. The redirect becomes a router of
   the dynamic configuration instead of the redirection of the entrypoint;
   everything else is redirected as before.
3. **The namespace of `norca-acme` (`norca-system` above) in
   `catalog_namespaces` of Traefik**: the service of the operator carries the
   router of the path as catalog tags (`http01_entrypoints` of the norca-acme
   module, `["web"]`). Traefik reads the services of another namespace than its
   own only with an ACL policy bound to its job that allows it; the output
   `notes` of the traefik module holds one.

With another edge router, route that path of every host on port 80 to the
service `norca-acme`.

The port of the challenges (`-http01-listen`, `:8089` by default) also
answers two paths for checks:

| Path | Answer |
| --- | --- |
| `GET /healthz` | `204` while the process is up, on every instance. |
| `GET /readyz` | `204` while the instance answers the challenges, `503` on a standby. Without [leader election](#leader-election) always `204`. |

**With leader election only the instance that holds the lease answers the
challenges.** The answers are in its memory and are not shared with the
others. A standby answers `/readyz` and every challenge request with `503`
and the text `norca-acme standby: only the instance that holds the leader
election lease answers HTTP-01 challenges`, also for a challenge it
presented while it held the lease. So **route the path of the challenge
only to the instance whose `/readyz` answers `204`**:

- **Give the service that carries the router a check on `/readyz` that
  does not count for the deployment.** A standby fails the check for as
  long as it is one: with the default `on_update` its allocation never
  becomes healthy and the deployment fails. A check on `/healthz` can
  count for the deployment, it passes on every instance.

  ```hcl
  check {
    name      = "leading"
    type      = "http"
    path      = "/readyz"
    interval  = "5s"
    timeout   = "2s"
    on_update = "ignore"
  }
  ```

- **Let the edge router see the healthy instances only.** A lookup of the
  service returns every instance, the standbys too, unless it asks for the
  healthy ones: with the `healthy` parameter of the
  [service API](/docs/api/services#additional-parameters-of-read-service),
  or, for the lookups of the workloads of a client, with
  [`native_service_discovery { default_healthy_only = true }`](/docs/configuration/native_service_discovery)
  (`false` by default). With a check on `/healthz` alone, or with a lookup
  that returns every instance, the edge also sends challenges to the
  standbys, and those challenges fail.

**The operator answers a challenge at once, but tells the certificate
authority to check it only a settle time after the instance started to
answer**: `-http01-settle`, a flag of `norca-acme`, `30s` by default. An
edge router that routes by `/readyz` does not route to an instance at the
moment it becomes ready: the check of the service runs on its interval,
Norca passes the result on, and the edge router reads the services on an
interval of its own. A challenge the certificate authority checks before
that reaches nobody, and its order fails.

- **The time counts from the start of the process**, and with leader
  election from every time the instance gains the lease: an instance that
  loses the lease and gains it again waits again.
- **An order that waits counts no failed attempt** and goes on when the
  settle time is over. An order that comes later than the settle time does
  not wait.
- **DNS-01 does not wait for it**, and neither does `/readyz`: the edge
  router needs it to start routing.
- **The settle time should cover** the interval and the timeout of the
  check on `/readyz`, the time Norca takes to pass the result of the check
  on, and the edge router's refresh of the services. With a longer check
  interval or a slower refresh set it above their sum.
- `0` turns the wait off; a negative value is refused.

**When the lease passes to another instance**, the answers of the instance
that held it are gone. The new one presents the challenge of an open order
again when it first works on the order. **Until then, and until the edge
router follows the readiness of the new instance, nobody answers.** The new
instance tells the certificate authority to check a challenge only when its
settle time is over, so an order whose challenge the certificate authority
was not told to check before the change waits and does not fail.

**A challenge the certificate authority was told to check before the change
cannot be held back.** If the certificate authority checks it while nobody
answers, the challenge fails: the certificate authority ends the order, the
operator fails it with that problem, and the servers place a new order
after their delay (see [Failures](#failures)). No order stays open: a
failed one is placed again.

**A restart of a single instance is the same**: its answers are gone, the
instance that starts presents the challenge of an open order again at once
and tells the certificate authority to check it after the settle time,
unless it was told before the restart.

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

The Traefik module reads the secrets of `tls_certificates` when it starts, and
the HTTP-01 challenge needs Traefik before the certificate exists. **Start
with a placeholder and hand it over**:

1. Write the secret with any certificate, for example a self-signed one,
   and name it in `tls_certificates` of the Traefik module:

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

**The order revokes nothing until the operator reports it done.** The
command prints `Asked the issuer to revoke ...`, and the status of the
`Certificate` object shows `revoking` for the certificate, with the reason
of the order. When the operator has set the order to `valid`, the servers
set `revoked` and `revokeReason` and record the event `Revoked`. **An order
the operator fails**, or does not answer within 24 hours, gives the warning
event `RevocationFailed` on the `Certificate` object: `revoking` is
removed, the certificate is not revoked, and the servers do not place the
order again. Run `norca certificate revoke` again to place a new one. See
[Revoking](/docs/features/certificates#revoking).

**Revoking the same certificate again with `-reason keyCompromise`**, while
the new one is not issued yet, changes the `reason` of its revocation order
to `keyCompromise` if the operator has not finished the order; any other
reason leaves the order as it is. A certificate the certificate authority
has revoked already keeps the reason it was revoked for: the operator takes
its answer `alreadyRevoked` as done. Once the new certificate is issued,
`norca certificate revoke` without `-serial` revokes that one.

**An earlier certificate is revoked by its serial number**, as long as it
is valid: `norca certificate revoke -serial <serial> <name>`, with a serial
number from `earlier` of the status of the `Certificate` object
([Earlier certificates](/docs/features/certificates#earlier-certificates)).
The servers write a revocation order with that serial number, for the
issuer that signed the certificate; the operator finds the certificate
under `norca-acme/issued/<issuer>/<serial>` and revokes it at the
certificate authority. **No new certificate is issued**, and the current
one stays. This is the way to revoke a certificate that a renewal or a
deleted version of the secret replaced. With `-reason keyCompromise` it
also reaches a certificate that was revoked before its successor was
issued: an order the operator has not finished gets the reason, and when
none is left a new order with the reason is written, which changes nothing
at a certificate authority that has revoked the certificate already.

The servers also revoke on their own, with the reason
`cessationOfOperation`, when a namespace
[loses the names](/docs/features/certificates#when-a-namespace-loses-a-name)
of a certificate, and when a `Certificate` object is
[deleted](/docs/features/certificates#deleting) (unless its spec says
`keep_certificates = true`); no new certificate is issued then. They write one
revocation order per serial number, each with that reason: for the current
certificate of the `Certificate` object and for every earlier one that is
still valid, unless the status marks it `revoked` already. The operator
passes the
`reason` of the order on to the certificate authority: `unspecified`,
`keyCompromise`, `affiliationChanged`, `superseded` or
`cessationOfOperation` (RFC 8555, section 7.6). An order without a reason,
or with one the operator does not know, is revoked as `unspecified`. **A
certificate authority that refuses the reason** (`badRevocationReason`) is
asked once more without it: the revocation matters more than its reason.

## Settings of the norca-acme module

The operator job and its secrets are in the namespace of the release, which must exist.

| Variable | Default | Meaning |
| --- | --- | --- |
| `count`, `leader_election`, `lease_namespace` | `1`, `false`, `""` (the namespace of the job) | The instances and their [leader election](#leader-election). |
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
- [Norca registry](/docs/features/packages/registry): the modules `norca-acme`,
  `norca-provider` and `traefik`
