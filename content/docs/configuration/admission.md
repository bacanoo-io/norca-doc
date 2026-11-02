---
title: "admission Block"
linkTitle: "admission"
description: "The \"admission\" block of the server configuration configures the webhooks of dynamic admission control."
---

**Placement:** `server -> admission`

The `admission` block configures the webhooks of
[dynamic admission control](/docs/features/admission-control). Webhooks can only
be configured here, never through the API, so that a token cannot register a
webhook that would see every job. The CEL admission policies are cluster objects
managed with [`norca admission-policy`](/docs/commands/admission-policy) and need
no configuration.

```hcl
server {
  enabled = true

  admission {
    webhook "add-owner" {
      url            = "https://admission.internal:8443/mutate"
      mode           = "mutate"
      failure_policy = "ignore"
      namespaces     = ["prod-*"]
      ca_file        = "/etc/norca.d/admission-ca.pem"
    }

    webhook "image-policy" {
      url                = "https://admission.internal:8443/validate"
      timeout            = "3s"
      exclude_namespaces = ["admission-system"]
      ca_file            = "/etc/norca.d/admission-ca.pem"
      cert_file          = "/etc/norca.d/admission-client.pem"
      key_file           = "/etc/norca.d/admission-client-key.pem"
    }
  }
}
```

The admission chain runs on the leader, so set the same block on every server.
The webhooks are read when the server starts; a configuration reload does not
change them. When several files define a webhook with the same name, the later
one replaces it; other webhooks are appended.

## `admission` Parameters

- `webhook` <code>([Webhook](#webhook-block): nil)</code> - Configures a named
  webhook. May be repeated. Webhooks of the same mode are called in the
  configured order.

## `webhook` Block

The label is the unique name of the webhook, used in error messages, events and
metrics.

- `url` `(string: <required>)` - The absolute `http` or `https` URL the admission
  review is posted to. Redirects are not followed.

- `mode` `(string: "validate")` - `validate`: the webhook accepts or rejects the
  final job, after the CEL admission policies. `mutate`: the webhook may also
  change the job with a JSON Patch; it runs after the built-in mutators and
  before the built-in validators.

- `timeout` `(string: "5s")` - The timeout of one call. A webhook is called once,
  without retries.

- `failure_policy` `(string: "fail")` - What happens when the webhook cannot be
  called, times out, answers with a status other than `200` or with an invalid
  document: `fail` rejects the submission, `ignore` admits it with a warning.

- `namespaces` `(array<string>: [])` - The namespaces whose jobs are sent to the
  webhook. Glob patterns are allowed. Empty means every namespace.

- `exclude_namespaces` `(array<string>: [])` - Namespaces that are never sent to
  the webhook, even if `namespaces` matches them. Glob patterns are allowed.
  Use it for the namespace the webhook service itself runs in.

- `resources` `(array<string>: ["job"])` - The kinds of objects sent to the
  webhook: `job` and/or `variable`. Mutating webhooks cannot select `variable`.

- `variable_paths` `(array<string>: [])` - Restricts the Variables writes sent to
  the webhook to these paths. Glob patterns are allowed. Empty means every path.
  Requires the `variable` resource.

- `include_variable_items` `(bool: false)` - Sends the decrypted items of the
  written and of the previous Variable to the webhook. By default the webhook
  only receives their namespace, path and indexes. Requires the `variable`
  resource.

- `ca_file` `(string: "")` - A PEM CA bundle used to verify the certificate of
  the webhook. The system roots are used when it is empty.

- `cert_file` `(string: "")` - A client certificate for mTLS with the webhook.
  Must be set together with `key_file`.

- `key_file` `(string: "")` - The private key of `cert_file`.

- `tls_server_name` `(string: "")` - Overrides the server name used to verify
  the certificate of the webhook.

## Webhook protocol

The server posts a JSON document with `Content-Type: application/json`:

- `api_version` - `admission.norca.io/v1`.
- `kind` - `AdmissionReview`.
- `request.uid` - The ID of the review; the response must return it.
- `request.resource` - `job` or `variable`.
- `request.operation` - `register` or `plan` for jobs, `set` or `delete` for
  Variables.
- `request.dry_run` - `true` for `plan`.
- `request.namespace` - The namespace of the job or Variable.
- `request.user` - The submitter: `accessor_id`, `name`, `type` (`client`,
  `management`, `workload-identity` or `anonymous`), `roles`, `policies`.
- `request.job` - The complete job in the API JSON form, without its Vault and
  Consul tokens. Only for jobs.
- `request.variable`, `request.old_variable` - The written Variable and the one
  it replaces or deletes, with `namespace`, `path`, `create_index`,
  `modify_index` and, with `include_variable_items`, `items`. Only for
  Variables.

The webhook answers with status `200` and a document with the same `api_version`
and `kind` and a `response` object (at most 16 MiB):

- `uid` - The `uid` of the request.
- `allowed` - `true` to admit, `false` to reject.
- `message` - The reason of a rejection, shown to the submitter.
- `warnings` - Warnings returned to the submitter.
- `patch` - Only for mutating webhooks: an RFC 6902 JSON Patch against the job,
  as a JSON array or a base64 encoded string of one. The patch must not change
  the job ID, namespace or region.

Webhooks bound to custom object kinds are declared in the object kind, not
here; see the [operator framework](/docs/features/operator-framework/object-kinds).
