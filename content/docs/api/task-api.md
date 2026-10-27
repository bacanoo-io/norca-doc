---
title: "Task API"
linkTitle: "Task HTTP API"
description: "Jobs can access Norca's HTTP API via the Task API."
upstream:
  path: "website/content/api-docs/task-api.mdx"
---

Norca's Task API provides every task managed by Norca with a Unix Domain Socket
(UDS) to access the local agent's HTTP API. Regardless of agent configuration
the Task API does *not* require mTLS, but *always* requires authentication.
See below for details.

The Unix Domain Socket is located at `${NOMAD_SECRETS_DIR}/api.sock`.

## Rationale

Norca's HTTP API is available on every agent at the configured
[`bind_addr`][bind_addr]. While this is convenient for user access, it is not
always accessible to workloads running on Norca. These workloads may have a
network configuration that makes it impossible to access the agent HTTP
address, or the agent's HTTP address may be difficult for workloads to discover
in a way that's portable between Norca nodes and clusters.

A Unix Domain Socket is a way to expose network services that works with most
runtimes and operating systems and adds minimal complexity or runtime overhead
to Norca.

## Security

Unlike the agent's HTTP API, the Task API *always requires authentication* even
if [ACLs][acl] are disabled.  This allows Norca to always make the Task API
available even if the workload is untrusted. If ACLs are enabled, the anonymous
policy is not available via the Task API.

Both [ACL Tokens][acl-tokens] and [Workload Identities][workload-id] are
accepted. Once the Task API has authenticated the credentials, the normal
endpoint-specific authorization is applied when ACLs are enabled.

The Workload Identity should be used by tasks accessing the Task API.

An ACL Token should be used when an operator is accessing the Task API via
[`norca alloc exec`][alloc-exec] or when a task is proxying Norca HTTP requests
on behalf of an authenticated user. The Task API could be used by a proxy
presenting Norca's UI with a standard TLS certificate for browsers.

If [`task.user`][task-user] is set in the jobspec, the Task API will only be
usable by that user. Otherwise the Unix Domain Socket is accessible by any
user.

mTLS is never enabled for the Task API since traffic never leaves the node.

## Using the Task API

The following jobspec will use the Task API to set [Dynamic Node Metadata][dnm]
and exit.

```hcl
job "taskapi-example" {
  type = "batch"

  group "taskapi-example" {

    task "taskapi" {
      driver = "docker"

      config {
        image = "curlimages/curl:7.87.0"
        args = [
          "--unix-socket", "${NOMAD_SECRETS_DIR}/api.sock",
          "-H", "Authorization: Bearer ${NOMAD_TOKEN}",
          "--data-binary", "{\"Meta\": {\"example\": \"Hello World!\"}}",
          "--fail-with-body",
          "--verbose",
          "localhost/v1/client/metadata",
        ]
      }

      identity {
        env = true
      }
    }
  }
}
```

If the job was able to run successfully after about 10 seconds you can observe
the outcome by searching for the updated Node's metadata:

```shell
$ norca node status -filter 'Meta.example == "Hello World!"'
```

[acl]: /docs/concepts/acl/
[acl-tokens]: /docs/concepts/acl#token
[alloc-exec]: /docs/commands/alloc/exec/
[bind_addr]: /docs/configuration/
[task-user]: /docs/job-specification/task#user
[workload-id]: /docs/concepts/workload-identity/
[dnm]: /docs/api/client#update-node-metadata
