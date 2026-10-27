---
title: "vault Block"
linkTitle: "vault"
description: "The \"vault\" block allows the task to specify that it requires a token from a HashiCorp Vault server. Norca will automatically retrieve a Vault token for the task and handle token renewal for the task."
upstream:
  path: "website/content/docs/job-specification/vault.mdx"
---

**Placement:**

- `job -> vault`
- `job -> group -> vault`
- `job -> group -> task -> vault`

The `vault` block allows a task to specify that it requires a token from a
HashiCorp Vault server. Norca will automatically retrieve a Vault token
for the task and handle token renewal for the task. If specified at the `group`
level, the configuration will apply to all tasks within the group. If specified
at the `job` level, the configuration will apply to all tasks within the job. If
multiple `vault` blocks are specified, they are merged with the `task` block
taking the highest precedence, then the `group`, then the `job`.

```hcl
job "docs" {
  group "example" {
    task "server" {
      vault {
        policies = ["cdn", "frontend"]

        change_mode   = "signal"
        change_signal = "SIGUSR1"
      }
    }
  }
}
```

The Norca client will make the Vault token available to the task by writing it
to the secret directory at `secrets/vault_token` and by injecting a `VAULT_TOKEN`
environment variable. If the Norca cluster is [configured](/docs/configuration/vault#namespace)
to use Vault Namespaces,
a `VAULT_NAMESPACE` environment variable will be injected whenever `VAULT_TOKEN` is set.
This behavior can be altered using the `env` and `file` parameters.

If Norca is unable to renew the Vault token (perhaps due to a Vault outage or
network error), the client will attempt to retrieve a new Vault token. If successful, the
contents of the secrets file are updated on disk, and action will be taken
according to the value set in the `change_mode` parameter.

If a `vault` block is specified, the [`template`][template] block can interact
with Vault as well.

> [!NOTE]
> **Norca without Vault.** On an agent without a Vault integration, the `vault`
> block is served by the built-in secret store: the task gets a token for a
> Vault-compatible KV read endpoint on its client in `VAULT_TOKEN` and
> `secrets/vault_token`, and `VAULT_ADDR` points to that endpoint. Access is
> checked with the task's workload identity and `read-secret`, not with the
> `policies` listed here. See
> [Vault compatibility](/docs/features/secrets/vault-compatibility).

## `vault` Parameters

- `change_mode` `(string: "restart")` - Specifies the behavior Norca should take
  if the Vault token changes. The possible values are:

  - `"noop"` - take no action (continue running the task)
  - `"restart"` - restart the task
  - `"signal"` - send a configurable signal to the task

- `change_signal` `(string: "")` - Specifies the signal to send to the task as a
  string like `"SIGUSR1"` or `"SIGINT"`. This option is required if the
  `change_mode` is `signal`.

- `env` `(bool: true)` - Specifies if the `VAULT_TOKEN` and `VAULT_NAMESPACE`
  environment variables should be set when starting the task.

- `disable_file` `(bool: false)` - Specifies if the Vault token should be
  written to `secrets/vault_token`.

  > [!WARNING]
  > While the `secrets` path is not shared with tasks that use
  > [`image`](/docs/concepts/filesystem#image-isolation) filesystem isolation,
  > it is still accessible by tasks using
  > [`chroot`](/docs/concepts/filesystem#chroot-isolation) or
  > [`none`](/docs/concepts/filesystem#none-isolation) isolation.

- `namespace` `(string: "")` - Specifies the Vault namespace to use for the
  task: the client uses it for the Vault reads of the `template` blocks and sets
  it as `VAULT_NAMESPACE`. The servers derive the task token in the namespace of
  the [agent `vault` block](/docs/configuration/vault#namespace). When the
  servers require a Vault token from the job submitter
  ([`allow_unauthenticated`](/docs/configuration/vault#allow_unauthenticated)
  set to `false`), a job that sets a Vault namespace is rejected.

- `policies` `(array<string>: [])` - Specifies the set of Vault policies that
  the task requires. The Norca client will retrieve a Vault token that is
  limited to those policies.

## `vault` Examples

The following examples only show the `vault` blocks. Remember that the
`vault` block is only valid in the placements listed above.

### Retrieve Token

This example tells the Norca client to retrieve a Vault token. The token is
available to the task via the canonical environment variable `VAULT_TOKEN` and
written to disk at `secrets/vault_token`. The resulting token will have the
"frontend" Vault policy attached.

```hcl
vault {
  policies = ["frontend"]
}
```

### Signal Task

This example shows signaling the task instead of restarting it.

```hcl
vault {
  policies = ["frontend"]

  change_mode   = "signal"
  change_signal = "SIGINT"
}
```

### Private Token and Change Modes

This example retrieves a Vault token that is not shared with the task when using
a driver that provides `image` isolation like [Docker][docker].

This allows Norca to use a powerful Vault token that interacts with the task's
[`template`][template] stanzas to issue all kinds of secrets (e.g., database
secrets, other vault tokens, etc.), without sharing that issuing power with
the task itself:

```hcl
vault {
  policies    = ["tls-policy", "nomad-job-policy"]
  change_mode = "noop"
  env         = false
  file        = false
}

template {
  data = <<-EOH
{{with secret "auth/token/create/nomad-job" "policies=examplepolicy"}}{{.Auth.ClientToken}}{{ end }}
EOH

  destination = "${NOMAD_SECRETS_DIR}/examplepolicy.token"
  change_mode = "noop"
  perms       = "600"
}

template {
  data = <<-EOH
{{ with secret "pki_int/issue/nomad-task"
   "common_name=example.service.consul" "ttl=72h"
   "alt_names=localhost" "ip_sans=127.0.0.1"}}
{{ .Data.certificate }}
{{ .Data.private_key }}
{{ end }}
EOH

  destination = "${NOMAD_SECRETS_DIR}/client.crt"
  change_mode = "restart"
  perms       = "600"
}
```

The example above uses `change_mode = "noop"` in the `template` stanza for
`examplepolicy.token`, which means that the task's workload is responsible for
detecting and handling changes to that file. In contrast, the `template` stanza
for `client.crt` is configured so that Norca will restart the task whenever
the certificate is reissued, as indicated by `change_mode = "restart"`
(which is the default value for `change_mode`).

[docker]: /docs/drivers/docker/ "Docker Driver"
[restart]: /docs/job-specification/restart/ "Norca restart Job Specification"
[template]: /docs/job-specification/template/ "Norca template Job Specification"
