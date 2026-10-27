---
title: "Vault compatibility"
weight: 4
description: "Jobs written for Vault run without a Vault: Vault-style secret templates and task vault blocks are served by the built-in store."
---

## What and why

Many jobs read their secrets with a task [`vault`](/docs/job-specification/vault) block and
`{{ with secret "kv/data/..." }}` templates. Vault is no longer open source and is not shipped by Norca.
With a Vault integration configured, Norca behaves exactly as Nomad v1.6.5. On an agent **without** a
Vault integration, Norca serves those Vault-style lookups from the built-in store, so the same jobs run
unchanged:

- **Template calls.** `{{ with secret "kv/data/app/db" }}{{ .Data.data.password }}{{ end }}` reads the
  built-in secret `app/db` and returns it in the KV v2 response shape.
- **Task `vault` block.** The task gets a short-lived token for a **Vault-compatible read endpoint on its
  own client agent**, in `VAULT_TOKEN` and `secrets/vault_token`, and `VAULT_ADDR` points to that
  endpoint. Applications that use a Vault SDK read their KV secrets from the built-in store.

The endpoint implements KV reads only. It is not a Vault: everything else answers with a clear "not
supported by the built-in secret store" error.

## How it works

### When it applies

The takeover applies only to agents whose `vault` block is not enabled and whose
`client { secrets { vault_compat { enabled } } }` is not `false` (it is enabled by default). With a Vault
integration, the Vault template functions stay consul-template's, the task `vault` block derives Vault
tokens through the servers, and nothing on this page runs.

On the servers, a job with `vault` blocks is accepted without a Vault integration (with the warning that
its Vault-style lookups are served by the built-in secret store) once every server runs Norca. Its groups
get the implicit constraint `${attr.norca.secrets.vault_compat} = true` instead of
`${attr.vault.version}`, so they are placed only on clients that serve the endpoint.
`server { secrets { vault_fallback = false } }` keeps Nomad's rejection of such jobs.

### Path mapping

Vault paths are mapped to built-in secrets by `vault_kv` rules of the client. The rule's label is a Vault
path prefix ending in `/`; the rest of the path, appended to the rule's `path`, is the built-in secret.
The longest matching prefix wins. Without rules, these defaults apply:

| Vault path | KV version | Built-in secret |
| --- | --- | --- |
| `kv/data/<p>` (and `kv/metadata/<p>`) | 2 | `<p>` |
| `secret/data/<p>` (and `secret/metadata/<p>`) | 2 | `<p>` |
| `secret/<p>` | 1 | `<p>` |

Configured rules replace the defaults. For example, `vault_kv "kv/data/" { path = "apps/" }` makes
`kv/data/db/pg` read the secret `apps/db/pg`. Paths of dynamic engines (`<mount>/creds/<role>`,
`<mount>/static-creds/<role>`, `<mount>/sts/<role>`) fail with "requires a Vault/OpenBao provider or the
built-in dynamic engine (not available yet)"; unmapped paths fail as well. Neither falls back.

Vault-style lookups are resolved like every lookup (explicit `provider:` prefix, client routes on the
Vault path, defaults, fallback); only when the result is the built-in store is the path mapped.

### Template calls

The task's template runner replaces consul-template's `secret` function with Norca's, served like
`nomadSecret`:

- KV v2: `.Data.data` holds the items as strings, `.Data.metadata` holds `version`, `created_time`,
  `custom_metadata` (the secret's labels), `deletion_time` and `destroyed`. `<mount>/metadata/<p>` returns
  the metadata shape. `?version=n` pins a version (not watched).
- KV v1: `.Data` holds the items; `.LeaseDuration` is 2764800 as in Vault.
- A new version of the secret makes the templates render again with their change modes.
- Writes (`secret` with data arguments) and the `secrets` listing function fail with clear errors.

### The Vault-compatible endpoint

| Request | Served |
| --- | --- |
| `GET /v1/<mount>/data/<p>` (`?version=n`) | KV v2 read |
| `GET /v1/<mount>/<p>` | KV v1 read |
| `GET /v1/<mount>/metadata/<p>` | KV v2 metadata |
| `GET` or `POST /v1/auth/token/lookup-self` | Token lookup |
| `POST` or `PUT /v1/auth/token/renew-self` | Token renewal, up to the token TTL |
| `GET /v1/sys/health` | Health, no token; version `<norca version>+norca-builtin-store` |

Responses use Vault's envelope and shapes, so the official Vault Go client reads them. Errors are
`{"errors": [...]}`: 403 for missing, invalid, revoked or foreign tokens and denied reads, 404 for a
missing secret, 405 for writes, 501 for listing and every other API, 429 when rate limited, and 503 while
the store is unavailable.

- **Binding.** The endpoint listens on `127.0.0.1:<port>` (default 8250) and, once a task in bridge
  networking mode asks for a token, on the bridge gateway address (the first address of the client's
  `bridge_network_subnet`). It starts listening at the first token request, so agents without such tasks
  open no port. Tasks in other network namespaces (Docker's own bridge, CNI networks) can't reach it.
  There is no TLS: the traffic never leaves the host.
- **Tokens.** A token belongs to one task of one allocation. It is valid while its task runs and is
  renewed by the client up to `token_ttl` (default 1 hour). It is never written to the client state; after
  an agent restart, the token in `secrets/vault_token` of a task that still runs is adopted again. Tokens of
  tasks in bridge mode are accepted only from their allocation's address.
- **Access.** Reads are made with the task's workload identity, so `read-secret` (for example a
  [`secret_access`](/docs/job-specification/secret_access) grant) decides, never Vault policies. If the
  `vault` block names `policies` and the task has no `secret_access` grant, the task gets a `Vault` task
  event saying that the Vault policies are not used by the built-in secret store.
- **Audit.** Reads of the built-in store are audited by the servers with the workload identity (also
  denials). Requests the endpoint rejects itself are logged by the agent, never with the token.

## Example

The job below runs unchanged with a Vault integration and, without one, from the built-in store
(`kv/data/app/db` reads the secret `app/db`):

```hcl {filename="app.nomad.hcl"}
job "app" {
  group "web" {
    # Without Vault, access to the built-in secret is granted here.
    secret_access {
      path = "app/*"
    }

    task "web" {
      driver = "docker"

      config {
        image = "example/web:2.0"
      }

      vault {
        policies = ["app-read"]
      }

      template {
        destination = "secrets/db.env"
        env         = true
        data        = <<EOT
{{ with secret "kv/data/app/db" }}DB_PASSWORD={{ .Data.data.password }}{{ end }}
EOT
      }
    }
  }
}
```

Moving a cluster off Vault:

```shell
# 1. Copy the KV secrets into the built-in store, with the Vault environment of the operator.
export VAULT_ADDR=https://vault.example.internal:8200 VAULT_TOKEN=...
norca secret import -namespace default -from-vault kv/app/ -dry-run
norca secret import -namespace default -from-vault kv/app/

# 2. Remove the vault block from the agent configuration and restart the agents.
#    The same jobs now read from the built-in store through the fallback.
```

Variables can be moved the same way: `norca secret import -from-variable app/ -move`.

## Configuration reference

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `client.secrets.vault_kv "<prefix>".kv_version` | int | 2 if the prefix contains `/data/`, else 1 | Response shape. |
| `client.secrets.vault_kv "<prefix>".path` | string | `""` | Prefix of the built-in secret path; empty or ending in `/`. |
| `client.secrets.vault_compat.enabled` | bool | `true` | `false` keeps Nomad's behaviour without Vault. |
| `client.secrets.vault_compat.port` | int | `8250` | Port of the endpoint. |
| `client.secrets.vault_compat.bridge` | bool | `true` | Also listen on the bridge gateway address. |
| `client.secrets.vault_compat.token_ttl` | string | `"1h"` | Token TTL, at least `1m`. |
| `client.secrets.vault_compat.rate_limit` | float | `20` | Requests per second per token. |
| `client.secrets.vault_compat.rate_burst` | int | `40` | Burst per token. |
| `server.secrets.vault_fallback` | bool | `true` | Accept jobs with `vault` blocks without a Vault integration. |

Full reference: [`secrets` block](/docs/configuration/secrets).

## CLI and API

| Command | Description |
| --- | --- |
| [`norca secret import -from-vault`](/docs/commands/secret/import) | Copy KV v1/v2 secrets below a prefix from Vault or OpenBao |
| [`norca secret import -from-variable`](/docs/commands/secret/import) | Copy or move Variables into secrets |

The endpoint is served by each client agent to its own tasks; it is not part of the Norca HTTP API.

## Limits and status

- Available: Vault-style template reads, the task `vault` block with the local endpoint, KV v1/v2 reads,
  token lookup and renewal, health, `secret import`.
- Not supported by the built-in store: writes, listing, dynamic engines (`database/creds/...`), PKI, SSH,
  transit and every other Vault API. Use a real Vault for those.
- With a Vault integration, client routes and defaults do not redirect Vault-style template calls; a
  configured Vault behaves as in Nomad v1.6.5.

## Design

[Secret storage plan – Vault compatibility](/docs/design/secrets-plan#vault-compatibility) and
[Migration](/docs/design/secrets-plan#migration).
