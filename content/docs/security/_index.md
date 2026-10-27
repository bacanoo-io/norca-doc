---
title: "Security"
weight: 18
description: "An overview of the security mechanisms of Norca: transport encryption, access control, workload identities, native mTLS, the sealed secret store, network rules, admission control, backup encryption and the pack supply chain."
---

Norca is **not secure by default**: a development agent runs without TLS, ACLs or encryption. This page
lists the mechanisms a production cluster should use and links to their documentation. The threat model
inherited from Nomad v1.6.5 is described in the [security model](/docs/concepts/security); how to report a
vulnerability is described in [Reporting vulnerabilities](/docs/security/upstream-model). Fixed security
issues and what they change for users are listed in the upgrade notes:
[Security fixes in 0.1.0](/docs/operations/upgrades#security-fixes-in-010).

The deployment examples [single node](/docs/getting-started/examples/02-single-node) and
[three nodes](/docs/getting-started/examples/03-three-node) enable TLS, ACLs, gossip encryption, the
`shares` seal and encrypted backups together.

## Agent and cluster

| Mechanism | Protects | Reference |
| --- | --- | --- |
| **TLS** on HTTP and RPC | Confidentiality and integrity between agents, CLI and API clients; server and client roles are bound to the certificate (`server.<region>.nomad`, `client.<region>.nomad`) | [`tls` block](/docs/configuration/tls), [`norca tls`](/docs/commands/tls) |
| **Gossip encryption** | The Serf traffic between servers | [`server.encrypt`](/docs/configuration/server), [`norca operator gossip keyring`](/docs/commands/operator/gossip/keyring-generate) |
| **ACLs** | Every API request: tokens, policies, roles, auth methods; capabilities per namespace | [ACL system](/docs/concepts/acl), [ACL policies](/docs/other-specifications/acl-policy) |
| **Keyring seal** | The root keys (Variables, workload identity signing, the mTLS CA key) and the secret store key at rest; with the `shares` seal, a copied data directory decrypts nothing | [Seal](/docs/features/secrets/seal), [Operating the seal](/docs/operations/seal-unseal) |
| **Backup encryption** | Backups are encrypted with `age` recipients or a KMS before they leave the server | [Backup and restore](/docs/features/backup-restore) |

TLS, ACLs and gossip encryption work as in Nomad v1.6.5. Use TLS with
`verify_server_hostname = true`; HTTPS client certificates can stay off when ACLs are enabled.

## Workloads

| Mechanism | Protects | Reference |
| --- | --- | --- |
| **Workload identities** | Every task gets a signed identity (JWT) for the Norca API, Variables and secrets, instead of a long-lived token | [Workload identity](/docs/concepts/workload-identity), [`identity` block](/docs/job-specification/identity) |
| **Secret store** | Versioned, audited secrets, delivered to tasks as files (mode 0400) or environment; no implicit task access, the job grants read access with `secret_access` and the submitter must hold it | [Secret store](/docs/features/secrets) |
| **Native mTLS** | Service-to-service traffic: a per-region CA, short-lived SPIFFE workload certificates, service intentions that decide who may connect | [Native mTLS](/docs/features/native-mtls) |
| **Network rules** | Which allocations may talk to each other at the network level, per namespace | [Network rules](/docs/features/network-rules) |
| **Admission control** | What may be submitted: CEL policies on jobs (for example images, drivers, secret providers, no secrets in `env`), webhooks | [Admission control](/docs/features/admission-control) |
| **Quotas** | Resource exhaustion of a shared cluster by one namespace | [Quotas](/docs/features/quotas) |

Task drivers keep their own isolation properties; the recommendations of the
[security model](/docs/concepts/security#recommendations) (unprivileged drivers, sandboxed runtimes, Linux
security modules, disabling unused drivers) apply unchanged.

## Secrets at rest and in transit

- **Variables and secrets** are encrypted in Raft with the keyring's root keys; the secret store adds its own
  barrier (AES-256-GCM, path bound into the ciphertext). Values are never part of listings, events, the
  event stream, task events or the allocation API.
- **Audit:** every value read and write of the secret store is recorded on the `SecretAccess` event topic
  (requires `operator:read`) and, optionally, in an append-only audit file on each server.
- **Key distribution:** with the `shares` seal, keys travel between servers only wrapped by the seal; a
  sealed server or a stolen server certificate yields no usable key.
- **Local endpoints:** the Vault-compatible endpoint for tasks listens only on `127.0.0.1` and the bridge
  gateway of its client, with per-task tokens. See
  [Vault compatibility](/docs/features/secrets/vault-compatibility).

## Supply chain of packs

Packs installed with `norca pack` can come from OCI registries, signed with cosign-compatible keys. The
servers verify the signatures themselves, admission policies can require a trusted signature in protected
namespaces, and the release records the pack, version, digest and signer. See
[supply chain](/docs/features/packages/supply-chain).

## Checklist

1. Enable TLS on HTTP and RPC with `verify_server_hostname`, and gossip encryption.
2. Enable ACLs and bootstrap them; give people and CI tokens with namespace-scoped policies.
3. Configure `keyring { seal "shares" }`, initialize it, hand out the shares and keep the backups'
   `age` identity offline.
4. Keep secrets in the secret store, deliver them with `secret` blocks (prefer files), and grant access
   per job with `secret_access`.
5. Use admission policies and quotas in shared namespaces, and native mTLS with intentions and network
   rules for service traffic.
6. Run `norca config validate` on every configuration change.
