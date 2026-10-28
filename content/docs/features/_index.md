---
title: Norca features
linkTitle: Features
description: The features Norca adds to the Nomad v1.6.5 core, with their status.
weight: 4
---

Every feature below is built into the `norca` binary; there is no separate control plane. Features that
write new kinds of data to Raft are enabled once every server of the region runs a Norca version that
supports them ([version gate](/docs/introduction/compatibility#version-gate-of-the-norca-features)).
Only features marked *Available* can be used; the others are being built.

| Feature | Status | Page |
| --- | --- | --- |
| Nomad v1.6.5 core features | Available | [Concepts](/docs/concepts) |
| Dependency updates (Go 1.27, gRPC 1.84, security fixes) | Available | [Development plan](/docs/design/nomad-fork-development-plan) |
| Built-in autoscaler: leader subsystem, built-in strategies, `nomad` metrics pushed by clients and Prometheus, external APM and strategy plugins, typed and validated `scaling` policies, quota and deployment aware, `Scaling` events, off by default | Available | [Autoscaler](/docs/features/autoscaler) |
| Built-in autoscaler: node pool scaling with cloud providers (Hetzner Cloud, Scaleway, AWS, GCP) | Postponed | [Development plan](/docs/design/nomad-fork-development-plan) |
| Namespace quotas | Available | [Quotas](/docs/features/quotas) |
| Dynamic admission control (CEL policies, webhooks) | Available | [Admission control](/docs/features/admission-control) |
| Event stream: Variables topic, resumable subscriptions | Available | [Event stream](/docs/features/event-stream) |
| Cross-job affinity (`colocate`, `separate`) | Available | [Cross-job affinity](/docs/features/cross-job-affinity) |
| Disruption budget | Available | [Disruption budget](/docs/features/disruption-budget) |
| Health check roles (startup, readiness, liveness) | Available | [Health check roles](/docs/features/health-check-roles) |
| Network rules, levels A and B (`NetworkPolicy`, cluster-level `AdminNetworkPolicy` with explicit deny, nftables in the allocation's network namespace) | Available | [Network rules](/docs/features/network-rules) |
| Operator framework: custom object kinds and objects, controller SDK, lifecycle (finalizers, deletion modes, garbage collection), ecosystem (operator packs, webhooks, schema migrations, limits, `norca operator init`, `norca object-kind lint`) | Available (phases 1–4, with the web UI pages) | [Operator framework](/docs/features/operator-framework) |
| Event stream → NATS bridge (one job per region) | Available | [NATS bridge](/docs/features/nats-bridge) |
| Multiregion deployments (staged rollout, `on_failure`, global tokens, `norca deployment run`) | Available | [Multiregion deployments](/docs/features/multiregion) |
| Backup and restore: scheduled, age-encrypted backups to S3-compatible stores and shared directories, browsing and selective restore | Available | [Backup and restore](/docs/features/backup-restore) |
| Backup and restore: full region restore with preview and two-person approval, keyring restore, `restore-bootstrap` | Available | [Backup and restore](/docs/features/backup-restore) |
| Backup and restore: web UI | Available | [Web UI](/docs/features/web-ui) |
| Service discovery without Consul: health-based catalog, built-in DNS, Consul-compatible read layer | Available (DNS and the compatibility layer are off by default) | [Service discovery](/docs/features/service-discovery) |
| Service discovery without Consul: external services, Consul agent write endpoints | Available | [External services](/docs/features/service-discovery/external-services) |
| Full Consul as an option (`consul` pack; Consul itself is BSL 1.1 and installed from its official release) | Available | [Consul pack](/docs/features/service-discovery/consul-pack) |
| Native mTLS: per-region CA, SPIFFE workload certificates, `ServiceIntention` objects, Go library `api/mtls` | Available | [Native mTLS](/docs/features/native-mtls) |
| Native mTLS: Envoy sidecar, upstreams, cross-region gateway | Available (tested against Envoy 1.39 and 1.40) | [Sidecar and gateway](/docs/features/native-mtls/sidecar-and-gateway) |
| Package management: Nomad Pack built in (`norca pack`) | Available | [Packages](/docs/features/packages) |
| Norca pack registry (`nats`, `mtls-gateway`, `rustfs`, `consul`, `loadbalancer-operator`, `openobserve`, `otel-collector`, `postgres`, `forgejo`) | Available | [Pack registry](/docs/features/packages/registry) |
| Package management: OCI registries, signing and trust policies, offline bundles, `pack.lock` | Available | [Supply chain](/docs/features/packages/supply-chain) |
| Package management: server-side releases, signature enforcement in admission, variable schemas, multi-region installs | Available | [Releases](/docs/features/packages/releases) |
| Embedded secret store: sealed keyring, versioned and audited secrets, `secret` block, Vault compatibility without a Vault | In progress (phases 0–4 available) | [Secret store](/docs/features/secrets) |
| New web UI | Available (phases 1–4) | [Web UI](/docs/features/web-ui) |

## Kubernetes-inspired features

Quotas, admission control, the event stream extensions, cross-job affinity, disruption budgets, health
check roles, network rules and the operator framework take their idea from Kubernetes. Their design and
implementation are Norca's own; see [Kubernetes-inspired features](/docs/features/kubernetes-inspired).

## Where the features are used

The [deployment examples](/docs/getting-started/examples) use the available features step by step; the
[feature map](/docs/getting-started/examples#feature-map) shows which scenario shows which feature.
