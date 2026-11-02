---
title: "Embedded secret store"
linkTitle: "Secret store"
weight: 50
description: "A built-in, sealed, versioned and audited secret store that delivers secrets to tasks as files and environment variables, with Vault-compatible lookups and dynamic NATS credentials."
---

> [!NOTE]
> **Status: everything planned is available except what is built on demand.** Phases 0–4, 6 and 7 of
> the [plan](/docs/design/secrets-plan): the store itself, the `shares` seal, versioned secrets with
> audit, delivery to tasks with the `norca` and `vault` providers, Vault compatibility without a Vault,
> the web UI, expiry and rotation events, rotation jobs, the replication of secrets between regions, and
> dynamic secrets served by operators. Built only when someone needs them:
> external providers (OpenBao, AWS, GCP and Scaleway secret managers, plugins) and the KMS and transit
> seals. See [Limits and status](#limits-and-status).

## What and why

Nomad v1.6.5 keeps encrypted [Variables](/docs/concepts/variables) in Raft, but the key that encrypts
them lies on every server's disk next to the key that wraps it: whoever can read a server's data
directory can decrypt every Variable. Variables have no versions and no audit of who read a value, and a
task can only receive a value through a template. The only external store is Vault, which is no longer
open source and is not shipped by Norca.

Norca adds a secret store to the servers. Its keys are protected by a **seal**: with the `shares` seal,
the unseal key is split into Shamir shares held by operators, and a restarted server cannot decrypt
anything until enough shares are entered. Secrets are separate `Secret` objects with versions, metadata
and soft delete; every value read and every write is **audited**. A task asks for a secret with a
declarative `secret` block, and the client delivers it into the task's `secrets/` directory and
environment, re-delivering it when a new version is written.

A task can also ask for a **dynamic secret**: a credential an operator creates for it alone, renewed while it
runs and revoked when it stops. See
[Dynamic secrets](/docs/features/secrets/dynamic).

The existing Vault integration is unchanged. A lookup goes to an external store when one is defined for
it, and **falls back** to the built-in store when none is defined. Jobs written for Vault (task `vault`
blocks, `{{ with secret "kv/data/..." }}` templates) therefore run on a cluster without Vault: the
built-in store answers their KV reads.

## How it works

```mermaid
flowchart LR
  subgraph Job["Job specification"]
    SB["task secret block"]
    TPL["template: nomadSecret / secret"]
  end
  subgraph Client["norca agent (client)"]
    Hook["secret hook"]
    Res{"provider resolution"}
    Hook --> Res
  end
  subgraph Servers["norca servers (leader)"]
    Store[("built-in store (sealed)")]
    Audit["audit: SecretAccess + file"]
    Store --> Audit
  end
  Vault[("Vault (agent vault block)")]
  Task["task: secrets/ files, env"]
  SB --> Hook
  TPL --> Hook
  Res -- "norca (named or fallback)" --> Store
  Res -- "vault (named or Vault-style)" --> Vault
  Hook --> Task
```

- **Servers.** The store's core comes from [uBixVault](https://github.com/cwolsen7905/ubixvault)
  (BSD-3-Clause; a source copy of v1.5.0 lives in `norca/secretstore/ubix` of the Norca repository):
  its AES-256-GCM barrier, Shamir sharing, seal, KV v2 versioning and audit. Its storage is Norca's own
  Raft (a table of encrypted blobs), so there is one consensus system per region and secrets are
  replicated, snapshotted and backed up with the rest of the state. The active core runs on the leader;
  followers forward secret requests. Access is decided by Norca ACL policies and workload identities;
  uBixVault's tokens, policies and HTTP layer are not used.
- **Seal.** The root keys of the keyring and the key of the secret store are wrapped by the region's
  seal. A server that cannot unwrap them is **sealed**: it serves everything that needs no decryption and
  rejects Variables, workload identity signing, mTLS issuance and the secret store. See
  [Seal](/docs/features/secrets/seal).
- **Clients.** For each `secret` block of a task, the client resolves the provider, fetches the value
  with the task's workload identity, writes it into `secrets/` (mode 0400) or the task environment, and
  watches it for changes. See [Delivery to tasks](/docs/features/secrets/delivery).
- **Resolution order.** Explicit `provider`, then the client's `route` rules, then the group, job and
  namespace default, then (for Vault-style lookups only) the agent's Vault integration, then the
  built-in `norca` store as the fallback. Fallback means "nothing defined", never "the defined provider
  failed".

{{< cards >}}
  {{< card link="/docs/features/secrets/seal" title="Seal" subtitle="The shares seal, unsealing, seal status and online rewrap." >}}
  {{< card link="/docs/features/secrets/secrets" title="Secrets" subtitle="Versioned Secret objects, the norca secret commands, ACL capabilities and audit." >}}
  {{< card link="/docs/features/secrets/delivery" title="Delivery to tasks" subtitle="The secret block, providers and fallback, nomadSecret, secret_access." >}}
  {{< card link="/docs/features/secrets/vault-compatibility" title="Vault compatibility" subtitle="Vault-style templates and vault blocks served by the built-in store." >}}
  {{< card link="/docs/features/secrets/dynamic" title="Dynamic secrets" subtitle="Credentials created per task with a lease: secret engines, operators, fallback." >}}
{{< /cards >}}

## Example

A complete round trip on a cluster with ACLs, from writing a secret to a task that reads it:

```shell
# Write the secret; the password is read from standard input, not from the command line.
norca secret put -namespace apps -owner team-a app/db username=app password=-
```

```hcl {filename="app.norca.hcl"}
job "app" {
  namespace = "apps"

  group "web" {
    # The tasks of the group may read the secrets below app/.
    # The submitter of the job needs read-secret on this pattern.
    secret_access {
      path = "${job}/*"
    }

    task "server" {
      driver = "docker"

      config {
        image = "nginx:1.27"
      }

      secret "db" {
        path = "${job}/db"

        file {
          destination = "secrets/db.env"
          format      = "env"
        }

        env {
          DB_PASSWORD = "password"
        }

        change_mode   = "signal"
        change_signal = "SIGHUP"
      }
    }
  }
}
```

The task events of the allocation show which provider delivered the secret, for example
`secret db: provider norca (fallback)`, never the value.

## Configuration reference

| Block | Where | Purpose | Reference |
| --- | --- | --- | --- |
| `keyring { seal "shares" { ... } }` | server | The seal of the keyring and the secret store | [keyring](/docs/configuration/keyring) |
| `secrets { audit_file, ... vault_fallback }` | server | Audit file, registration of jobs with `vault` blocks without Vault | [secrets](/docs/configuration/secrets#server-secrets-block) |
| `secrets { route, vault_kv, vault_compat }` | client | Provider routes, Vault path mapping, Vault-compatible endpoint | [secrets](/docs/configuration/secrets#client-secrets-block) |
| `secret`, `secret_access`, `secrets` | job specification | Delivery, read grants, default provider | [secret](/docs/job-specification/secret), [secret_access](/docs/job-specification/secret_access), [secrets](/docs/job-specification/secrets) |

## CLI and API

| Task | CLI | HTTP API |
| --- | --- | --- |
| List, inspect, read, write secrets | [`norca secret`](/docs/commands/secret) | [`/v1/secrets`, `/v1/secret/:path`](/docs/api/secrets) |
| Import from Vault KV or Variables | [`norca secret import`](/docs/commands/secret/import) | – |
| Dynamic secrets engines | [`norca secret engine`](/docs/commands/secret/engine) | [`/v1/secret-engines`, `/v1/secret-engine/:name`](/docs/api/secret-engines) |
| Leases of dynamic secrets | [`norca secret lease`](/docs/commands/secret/lease) | [`/v1/secret-leases`, `/v1/secret-lease/:id`](/docs/api/secret-engines#leases) |
| Seal status | [`norca operator seal-status`](/docs/commands/operator/seal-status) | [`GET /v1/operator/seal`](/docs/api/operator/seal#read-seal-status) |
| Unseal, recover a restored store | [`norca operator unseal`](/docs/commands/operator/unseal) | [`/v1/operator/unseal`, `/v1/operator/seal/recover`](/docs/api/operator/seal) |
| Move to another seal | [`norca operator keyring rewrap`](/docs/commands/operator/keyring-rewrap) | [`POST /v1/operator/keyring/rewrap`](/docs/api/operator/seal#rewrap-the-keyring) |

The web UI has a **Secrets** page (Configuration group) with the seal status of every server; values are
shown only after an explicit, audited reveal. See [Web UI](/docs/features/web-ui).

## Limits and status

Available (phases 0–4, 6 and 7):

- uBixVault core on Norca's Raft; the `shares` seal (and `aead`, the Nomad behaviour, for development and
  migration); `norca operator unseal`, seal status, online rewrap, recovery of a store restored from a
  backup that was wrapped by other shares.
- Versioned `Secret` objects (at most 64 KiB per version, 10 versions kept by default, up to 100), soft
  delete, undelete and destroy; ACL capabilities `list-secrets`, `read-secret`, `write-secret`,
  `destroy-secret`; the `Secret` and `SecretAccess` event topics and an audit file.
- The `secret` block with the `norca` and `vault` providers and the fallback; `nomadSecret`;
  `secret_access`; admission policies see the referenced secrets.
- Vault compatibility without a Vault; `norca secret import -from-vault` and `-from-variable`.
- Expiry and rotation (phase 6): `SecretExpiring`, `SecretExpired` and `SecretRotationDue` events and
  gauges from the leader, rotation jobs dispatched once per version
  ([expiry and rotation](/docs/features/secrets/secrets#expiry-and-rotation)); the web UI's Secrets
  pages.
- Replication between regions (phase 6): secrets marked `Replicate` in the authoritative region are
  pulled by the leaders of the other regions over the region RPC, encrypted for each region's replication
  key, and are read-only replicas there
  ([replication between regions](/docs/features/secrets/secrets#replication-between-regions)).
- Dynamic secrets (phase 7): `SecretEngine` objects with roles, leases in Raft with renewal by the
  clients and revocation by the leader's lease watcher, the `secret` block with `engine` and `role`, ACL
  capabilities `read-secret-engine` and `write-secret-engine`; credentials are created by operators, built on
  the SDK `controller/secrets` ([dynamic secrets](/docs/features/secrets/dynamic)).

Built on demand, not available yet:

- External providers: OpenBao/Vault provider blocks with JWT login, AWS Secrets Manager, Google Secret
  Manager, Scaleway Secret Manager, plugins. The only providers are `norca` and `vault` (the agent's
  existing Vault integration).
- Seals other than `shares` and `aead`: `awskms`, `gcpckms`, `scwkms` and `transit` are rejected with
  "not implemented yet". Only one seal can be configured.
- Ready-made operators beyond PostgreSQL (cloud credentials, certificates); a web UI page for engines and leases; Vault-style
  dynamic paths (`<mount>/creds/<role>`).

## Design

[Embedded secret storage – plan](/docs/design/secrets-plan): architecture, the uBixVault basis, the
seal, resolution and fallback, Vault compatibility, permissions, audit, and the phases still to come.
