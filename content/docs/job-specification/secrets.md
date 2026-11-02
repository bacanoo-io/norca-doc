---
title: "secrets Block"
linkTitle: "secrets"
description: "The \"secrets\" block of a job or group sets the default secret provider of its tasks' lookups (Norca)."
---

**Placement:**

- `job -> secrets`
- `job -> group -> secrets`

The `secrets` block (Norca) sets the default provider of the secret lookups of the tasks: their
[`secret`](/docs/job-specification/secret) blocks without a `provider`, and `nomadSecret` template calls
without a `provider:` prefix. It is step 3 of the [resolution order](/docs/features/secrets/delivery#resolution-order):
an explicit provider and a matching client route win over it; without any of them the lookup falls back to
the built-in store.

```hcl
job "app" {
  secrets {
    default_provider = "norca"
  }

  group "legacy" {
    secrets {
      default_provider = "vault"
    }
  }
}
```

The group's default wins over the job's. When neither is set, the namespace metadata key
`secrets.default_provider` applies; it is captured on the job when the job is registered, so a changed
namespace default applies to jobs registered afterwards, never to running tasks.

## `secrets` Parameters

- `default_provider` `(string: "")` - The provider name: `norca` (the built-in store) or `vault` (the
  agent's Vault integration). Names use letters, digits, `_` and `-`, at most 64 characters. A provider the
  client doesn't have fails the lookup on that client.

## Namespace default

Set the metadata key in a namespace specification and apply it with
[`norca namespace apply`](/docs/commands/namespace/apply):

```json {filename="namespace-prod.json"}
{
  "Name": "prod",
  "Description": "Production",
  "Meta": {
    "secrets.default_provider": "vault"
  }
}
```

```shell
norca namespace apply -json namespace-prod.json
```

Admission policies see the provider each lookup resolves to (`effective_provider`) and can require one per
namespace; see [admission control](/docs/features/admission-control).
