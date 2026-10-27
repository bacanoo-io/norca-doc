---
title: Compatibility
description: How Norca stays compatible with the Nomad 1.6.5 HTTP API, CLI environment, workloads and tools.
weight: 2
---

Norca keeps the external interfaces of Nomad v1.6.5, so existing API clients, tools, job files and
scripts keep working against it. New features are additive: new endpoints, new blocks and new commands.

## Versions

Norca has its own product version; the Nomad version it is compatible with is kept as the compatibility
version:

```shell
$ norca version
Norca v0.1.0 (Nomad API 1.6.5 compatible)
```

| Version | Value | Used for |
| --- | --- | --- |
| Norca version | `0.1.0` | The product version; gates the Norca features |
| Compatibility version | `1.6.5` | The HTTP API and the protocols; Nomad's own feature gates and external API clients compare against it |

Norca's HTTP clients identify themselves with the User-Agent
`Norca/<version> (Nomad API <version>; <go version>)`, for example `Norca/0.1.0 (Nomad API 1.6.5; go1.27.3)`.


## Version gate of the Norca features

A Norca feature that writes new kinds of data to the Raft log is enabled only when every server of the
region runs a Norca version that supports it. Servers that do not advertise a Norca version, such as
upstream Nomad servers during a migration, never meet the gate, so the new features stay off until the
last server runs Norca. See [Upgrades](/docs/operations/upgrades).

## HTTP API

The HTTP API is the Nomad 1.6.5 API: the same paths, request and response bodies, blocking queries,
the `X-Nomad-Token` header and the `X-Nomad-Index` response headers. Clients written for it, such as the
Go `api` package of Nomad 1.6.5, Terraform providers or CI integrations, work unchanged. The Norca
features add endpoints under `/v1/`; see the [HTTP API](/docs/api) section.

## The `norca` binary and the `nomad` alias

Norca is one binary, `norca`, for the agent and the CLI. Help and usage texts always say `norca`.

A copy of the binary, or a symlink to it, named `nomad` (`nomad.exe` on Windows) behaves exactly like
`norca`: the same commands, the same output and no extra text, so existing scripts keep working. The
alias is not shipped or installed by default; create it yourself if you need it:

```shell
ln -s "$(command -v norca)" /usr/local/bin/nomad
```

## Environment variables of the CLI

The CLI and the API client read their settings from `NORCA_*` environment variables. Each one is also
accepted with its Nomad name (`NOMAD_*`), which is used when the `NORCA_*` variable is unset or empty.
Command-line flags take precedence over both.

| Variable | Fallback | Meaning |
| --- | --- | --- |
| `NORCA_ADDR` | `NOMAD_ADDR` | Address of the HTTP API, default `http://127.0.0.1:4646` |
| `NORCA_TOKEN` | `NOMAD_TOKEN` | ACL token secret ID |
| `NORCA_REGION` | `NOMAD_REGION` | Region to forward requests to |
| `NORCA_NAMESPACE` | `NOMAD_NAMESPACE` | Target namespace |
| `NORCA_HTTP_AUTH` | `NOMAD_HTTP_AUTH` | HTTP basic auth, `user:password` |
| `NORCA_CACERT`, `NORCA_CAPATH` | `NOMAD_CACERT`, `NOMAD_CAPATH` | CA certificate file or directory |
| `NORCA_CLIENT_CERT`, `NORCA_CLIENT_KEY` | `NOMAD_CLIENT_CERT`, `NOMAD_CLIENT_KEY` | Client certificate and key for mTLS |
| `NORCA_TLS_SERVER_NAME` | `NOMAD_TLS_SERVER_NAME` | SNI server name |
| `NORCA_SKIP_VERIFY` | `NOMAD_SKIP_VERIFY` | Skip TLS verification |
| `NORCA_CLI_NO_COLOR`, `NORCA_CLI_FORCE_COLOR` | `NOMAD_CLI_NO_COLOR`, `NOMAD_CLI_FORCE_COLOR` | Disable or force colored output |
| `NORCA_PACK_ALLOW_UNSET_VARS`, `NORCA_PACK_PLAN_EXIT_CODE_*` | `NOMAD_PACK_*` | `norca pack` settings |
| `NORCA_PACK_CONFIG`, `NORCA_PACK_CACHE_DIR`, `NORCA_PACK_REGISTRY_USERNAME`, `NORCA_PACK_REGISTRY_PASSWORD`, `NORCA_PACK_KEY_PASSWORD`, `NORCA_PACK_LOCK` | – | `norca pack` OCI registries, signing and lock files ([supply chain](/docs/features/packages/supply-chain)) |

## Names that stay Nomad

Names that are part of the compatibility surface are unchanged:

- the variables injected into workloads (`NOMAD_ALLOC_ID`, `NOMAD_TASK_DIR`, ...; see
  [Environment variables](/docs/runtime/environment)),
- the jobspec variable prefix `NOMAD_VAR_` and the pack variable prefix `NOMAD_PACK_VAR_`,
- the `X-Nomad-Token` HTTP header,
- the service provider `provider = "nomad"` and the DNS domain `.nomad`,
- the agent's configuration keys, metric names (`nomad.*`) and Raft/Serf names,
- the `.nomad.hcl` suffix of job files written by `norca job init`.

## Workloads and drivers

Job files written for Nomad 1.6.5 run unchanged. The task drivers of Nomad 1.6.5 (Docker, Podman via
its plugin, exec, raw_exec, Java, QEMU) and external driver and device plugins built against the 1.6.5
plugin API keep working. The Consul and Vault integrations of Nomad 1.6.5 are still available; Norca adds
[alternatives that need neither](/docs/features/service-discovery).
