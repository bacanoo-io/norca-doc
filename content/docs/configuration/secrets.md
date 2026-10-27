---
title: "secrets Block"
linkTitle: "secrets"
description: "The \"secrets\" blocks of the server and the client configure the audit file of the built-in secret store, provider routes and the Vault compatibility (Norca)."
---

**Placement:**

- `server -> secrets`
- `client -> secrets`

The `secrets` blocks (Norca) configure the [built-in secret store](/docs/features/secrets). The server
block sets the audit file and the acceptance of jobs with `vault` blocks without Vault; the client block
sets the provider routes and the [Vault compatibility](/docs/features/secrets/vault-compatibility). The
seal of the store is configured in the [`keyring`](/docs/configuration/keyring) block.

## Server `secrets` block

```hcl
server {
  secrets {
    audit_file             = "/var/log/norca/secrets-audit.log"
    audit_rotate_bytes     = 104857600
    audit_rotate_duration  = "24h"
    audit_rotate_max_files = 30
    vault_fallback         = true
  }
}
```

### Server `secrets` Parameters

- `audit_file` `(string: "")` - Path of the append-only audit file of this server. Every value read and
  every write of a secret executed by this server (the leader) is recorded, never a value. Empty disables
  the file; the `SecretAccess` event topic is always published.

- `audit_rotate_bytes` `(int: 0)` - Rotates the audit file before it grows beyond this size in bytes. `0`
  disables size based rotation.

- `audit_rotate_duration` `(string: "")` - Rotates the audit file once it is older than this duration, for
  example `"24h"`. Empty disables time based rotation.

- `audit_rotate_max_files` `(int: 0)` - Number of rotated audit files kept. `0` keeps all of them.

- `vault_fallback` `(bool: true)` - Accepts the registration of jobs with `vault` blocks when the server
  has no Vault integration: their Vault-style lookups are served by the built-in store on clients without
  Vault. `false` keeps the Nomad behaviour of rejecting such jobs.

## Client `secrets` block

```hcl
client {
  secrets {
    route "kv/" {
      provider = "vault"
    }

    vault_kv "kv/data/" {
      kv_version = 2
      path       = "apps/"
    }

    vault_compat {
      enabled    = true
      port       = 8250
      bridge     = true
      token_ttl  = "1h"
      rate_limit = 20
      rate_burst = 40
    }
  }
}
```

### Client `secrets` Parameters

- `route` <code>([route](#route-parameters): nil)</code> - Routes the secret lookups whose path starts with
  the block label to a provider, when neither the `secret` block nor the template call names one. The
  longest matching prefix wins. Repeatable.

- `vault_kv` <code>([vault_kv](#vault_kv-parameters): nil)</code> - Maps Vault KV paths to secrets of the
  built-in store, for Vault-style lookups on an agent without a Vault integration. The label is the Vault
  path prefix, ending in `/`. Repeatable. Configured rules replace the defaults `kv/data/` (KV v2),
  `secret/data/` (KV v2) and `secret/` (KV v1), all with `path = ""`.

- `vault_compat` <code>([vault_compat](#vault_compat-parameters): nil)</code> - Configures the Vault
  compatibility of the client and its Vault-compatible read endpoint.

### `route` Parameters

- `provider` `(string: <required>)` - The provider: `norca` or `vault`. A route to a provider the client
  doesn't have (`vault` without an enabled `vault` block) is a configuration error at agent start.

### `vault_kv` Parameters

- `kv_version` `(int: 2 or 1)` - The KV version whose response shape is returned: `1` or `2`. The default
  is `2` for prefixes containing `/data/` and `1` otherwise. A KV v2 rule for `<mount>/data/<p>` also
  serves `<mount>/metadata/<p>`.

- `path` `(string: "")` - Prefix of the built-in secret paths: the rest of the Vault path after the label is
  appended to it. Empty, or a relative prefix ending in `/`.

### `vault_compat` Parameters

The settings apply only when the agent has no Vault integration.

- `enabled` `(bool: true)` - Serves the Vault `secret` template function and the task `vault` blocks from
  the built-in store. `false` keeps the Nomad behaviour without Vault.

- `port` `(int: 8250)` - TCP port of the endpoint, on `127.0.0.1` and, when `bridge` is enabled, on the
  bridge gateway address.

- `bridge` `(bool: true)` - Also listens on the gateway address of the bridge network (the first address of
  [`bridge_network_subnet`](/docs/configuration/client)) once a task in bridge
  networking mode asks for a token.

- `token_ttl` `(string: "1h")` - Time to live of a task token. The client renews it while the task runs;
  `auth/token/renew-self` extends it up to this TTL. At least `"1m"`.

- `rate_limit` `(float: 20)` - Requests per second allowed per token. Requests without a valid token share
  one limiter.

- `rate_burst` `(int: 40)` - Burst size per token.

Clients whose endpoint is enabled and that have no Vault integration get the node attribute
`norca.secrets.vault_compat = true`, which jobs with `vault` blocks are constrained to.
