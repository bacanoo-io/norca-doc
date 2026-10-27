---
title: "mtls Block"
linkTitle: "mtls"
description: "The mtls block of the server configuration configures the native mTLS certificate authority of the region."
---

**Placement:** `server -> mtls`

The `mtls` block (Norca) configures the certificate authority of
[native mTLS](/docs/features/native-mtls). The leader of each region runs the CA; it signs the workload
certificates of task groups with an [`mtls`](/docs/job-specification/mtls) service. The CA is on by
default and only used by jobs with an `mtls` block.

```hcl
server {
  mtls {
    enabled       = true
    trust_domain  = "global.nomad"
    leaf_cert_ttl = "24h"
    ca_cert_ttl   = "43800h"
    federation    = true
  }
}
```

## `mtls` Parameters

- `enabled` `(bool: true)` - Runs the certificate authority of the region. With `false`, jobs with
  `mtls` blocks are rejected.

- `trust_domain` `(string: "<authoritative region>.nomad")` - The SPIFFE trust domain of the region:
  lowercase letters, digits, `.`, `-` and `_`. The default uses the
  [`authoritative_region`](/docs/configuration/server) (or the region when it is not
  set), so the regions of a federation share a trust domain. Changing it rotates the CA.

- `leaf_cert_ttl` `(string: "24h")` - Lifetime of workload certificates. At least 10 minutes. Clients
  renew a certificate after two thirds of its lifetime.

- `ca_cert_ttl` `(string: "43800h")` - Lifetime of the CA certificate (5 years). At least ten times
  `leaf_cert_ttl`. The leader rotates the CA after two thirds of its lifetime.

- `federation` `(bool: true)` - Copies the CA certificates of the other regions of the federation into
  the trust bundle of the region, so their workloads are trusted. Required for cross-region connections
  through the [gateway](/docs/features/native-mtls/sidecar-and-gateway#cross-region-gateway).

## Key material

The CA key is stored in the Raft state, encrypted with the active root key of the keyring, like
Variables. It is replicated to every server and included in snapshots and backups; a full restore
restores the keyring first, so the key can be decrypted. After a root key rotation the leader re-encrypts
the CA key with the new root key. A retired CA loses its key and stays in the trust bundle until
`leaf_cert_ttl` plus one hour after the rotation.

## `mtls` Examples

### Shorter certificates

```hcl
server {
  mtls {
    leaf_cert_ttl = "1h"
  }
}
```

### A region that does not trust the others

```hcl
server {
  mtls {
    federation = false
  }
}
```
