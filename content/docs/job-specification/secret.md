---
title: "secret Block"
linkTitle: "secret"
description: "The \"secret\" block delivers a secret of the built-in secret store or of the agent's Vault into a task's secrets directory and environment (Norca)."
---

**Placement:**

- `job -> group -> task -> secret`

The `secret` block (Norca) delivers one secret into the task, as a file below `secrets/`, as environment
variables, or both. The job only references the secret by path; **the value never appears in the job, the
allocation, the client state or the task events.** The client fetches the value with the task's workload
identity before the task starts, and delivers it again when a new version is written. The block can be
repeated; the label names the secret within the task.

```hcl
task "server" {
  secret "db" {
    path = "jobs/${job}/db"

    file {
      destination = "secrets/db.env"
      format      = "env"
    }

    env {
      DB_USER     = "username"
      DB_PASSWORD = "password"
    }

    change_mode   = "signal"
    change_signal = "SIGHUP"
  }
}
```

The task needs read access to the secret: a [`secret_access`](/docs/job-specification/secret_access) grant
of its group or task, or a policy bound to the job that grants `read-secret`. See
[Delivery to tasks](/docs/features/secrets/delivery) for the lifecycle and the resolution order.

With `engine` and `role` instead of `path`, the block asks for a **dynamic secret**: a credential the
servers create for the task, renewed while it runs and revoked when it stops (see
[Dynamic secrets](/docs/features/secrets/dynamic)):

```hcl
secret "db" {
  engine = "postgres"
  role   = "app"

  env {
    DB_USER     = "username"
    DB_PASSWORD = "password"
  }
}
```

## `secret` Parameters

- `path` `(string: <required>)` - The provider-specific path of the secret; empty (and required to be
  empty) for a dynamic secret with `engine` and `role`. The placeholders `${job}`,
  `${group}` and `${task}` are replaced; `${job}` is the parent's ID for dispatched and periodic children.
  For the built-in store, a path uses letters, digits, `-`, `_`, `~` and `/`.

- `provider` `(string: "")` - The provider that answers the lookup: `norca` (the built-in store) or
  `vault` (the agent's Vault integration; the task needs a [`vault`](/docs/job-specification/vault) block,
  whose token is used). Empty resolves the provider through the client routes and the group, job and
  namespace defaults, and falls back to `norca`.

- `version` `(int: 0)` - Pins a version of the secret. `0` is the latest version, which is delivered again
  when it changes; a pinned version is not watched.

- `file` <code>([file](#file-parameters): nil)</code> - Delivers the secret as a file. Can be repeated: one
  block for each file, for example a certificate and its key with `raw:<item>` formats.

- `env` `(map[string]string: nil)` - Delivers items as environment variables: the attribute names are the
  variable names, the values are item names. Variable names must match `[A-Za-z_][A-Za-z0-9_]*`; the
  `NORCA_` prefix is reserved. A variable can be set by one secret only.

- `change_mode` `(string: "restart")` - What happens when the secret changes: `restart` restarts the task,
  `signal` sends `change_signal`, `script` runs `change_script`, `noop` only rewrites the file.

- `change_signal` `(string: "")` - The signal sent with `change_mode = "signal"`, for example `"SIGHUP"`.
  Required for that mode, not allowed with the others.

- `change_script` <code>([ChangeScript](/docs/job-specification/change_script): nil)</code> - The script
  run with `change_mode = "script"`; requires a `command`.

- `optional` `(bool: false)` - Lets the task start without the secret if it can't be delivered.

- `timeout` `(string: "5m")` - How long the start of the task waits for the first delivery while the
  provider is unavailable or the secret doesn't exist. Denied and invalid requests fail at once.

- `engine` `(string: "")` - The [dynamic secrets engine](/docs/features/secrets/dynamic) of the job's
  namespace that creates the credential. Requires `role`; `path` and `version` must not be set. The task
  needs `read-secret` on `engines/<engine>/creds/<role>` (a `secret_access` grant or a policy bound to
  the job). The lookup is resolved like any other (with the path `engines/<engine>/creds/<role>` for the
  client routes); the provider must support leases, which only `norca` does.

- `role` `(string: "")` - The role of the engine. The role's `ttl` and `max_ttl` bound the lease: the
  client renews it at half of its remaining time, and asks for a new credential (applying
  `change_mode`) when it can't be extended beyond `max_ttl` any more, or when it was revoked. The lease is
  revoked when the task stops.

- `params` `(map[string]string: nil)` - Request parameters of a dynamic secret, passed to the operator. The
  role lists the keys a job may send; the operator checks the values.

- `fallback` `(string: "")` - A path of the built-in store, delivered instead of a dynamic secret when the
  operator can't be reached as the task starts. It has the placeholders of `path`, and the task needs read
  access to it. **A denied or refused request, and a failed renewal of a running task, never use it.** See
  [When the operator is down](/docs/features/secrets/dynamic#when-the-operator-is-down).

- `fallback_recover` `(string: "")` - `"signal"` keeps asking for a credential while the task runs on the
  fallback, and applies `change_mode` when one is delivered. Empty stays on the fallback until the task
  restarts.

- `fallback_recover_interval` `(string: "10s")` - How often `fallback_recover` asks; at least `1s`.

- `fallback_keep_on_restart` `(bool: false)` - Keeps the task on the fallback when it restarts, also after a
  restart of the client. By default a restart asks for a credential first.

**A `secret` block needs a `file` block, an `env` block, or both.** The items of a dynamic secret are those its
operator returns.

### `file` Parameters

- `destination` `(string: <required>)` - The file, relative to the task directory and below `secrets/`,
  for example `secrets/db.env`. It must be a clean relative path, can't be the destination of another
  secret or of a template, and can't be `secrets/nomad_token` or `secrets/vault_token`. The file is written
  atomically with mode `0400`. **Symlinks are not followed:** if `secrets/` or a directory below it on the way to
  the file is a symlink or junction, the delivery fails; a symlink at the destination is replaced.

- `format` `(string: "env")` - The file format:
  - `env` - one `KEY="value"` line per item, sorted; `"`, `\`, `$` and backquotes are escaped, newlines are
    written as `\n`.
  - `json` - a JSON object of the items.
  - `raw:<item>` - the value of one item, for example `raw:cert`.
  - `template` - the Go template of `template`, rendered with the items as data.

- `template` `(string: "")` - The Go template of the `template` format, for example
  `"{{ .password }}"`. Allowed only with that format. A missing item fails the rendering.

## `secret` Examples

### Certificate and key as raw files

```hcl
secret "tls-cert" {
  path = "certs/web"

  file {
    destination = "secrets/tls.crt"
    format      = "raw:cert"
  }

  change_mode = "noop"
}

secret "tls-key" {
  path = "certs/web"

  file {
    destination = "secrets/tls.key"
    format      = "raw:key"
  }

  change_mode = "restart"
}
```

### Reload script

```hcl
secret "config" {
  path     = "jobs/${job}/config"
  optional = true

  file {
    destination = "secrets/config.json"
    format      = "json"
  }

  change_mode = "script"
  change_script {
    command = "/usr/local/bin/reload"
    args    = ["--config", "secrets/config.json"]
  }
}
```

### Read from the agent's Vault

```hcl
task "app" {
  vault {
    policies = ["app"]
  }

  secret "db" {
    provider = "vault"
    path     = "kv/data/app/db"

    env {
      DB_PASSWORD = "password"
    }
  }
}
```

The `vault` provider reads KV v1 and v2 paths with the task's Vault token; a KV v2 response yields the items
of `data.data` and the version of `data.metadata`.

### A certificate from an operator

```hcl
group "worker" {
  secret_access {
    path = "engines/internal-pki/creds/api-client"
  }

  task "worker" {
    secret "tls" {
      engine = "internal-pki"
      role   = "api-client"
      params = { common_name = "api.apps.internal" }

      file {
        destination = "secrets/tls.crt"
        format      = "raw:cert"
      }
      file {
        destination = "secrets/tls.key"
        format      = "raw:key"
      }

      change_mode   = "signal"
      change_signal = "SIGHUP"
    }
  }
}
```

A renewal that returns a new certificate rewrites both files and sends the signal.
