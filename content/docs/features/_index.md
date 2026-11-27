---
title: Norca features
linkTitle: Features
description: The features Norca adds to the Nomad v1.6.5 core, with their status.
weight: 4
---

Every feature below is built into the `norca` binary, except the deployer (`norca-deployer`, run on the operator's machine); there is no separate
control plane. Features that
write new kinds of data to Raft are enabled once every server of the region runs a Norca version that
supports them ([version gate](/docs/introduction/compatibility#version-gate-of-the-norca-features)).
**Only features marked *Available* can be used**; the others are being built.

| Feature | Status | Page |
| --- | --- | --- |
| Nomad v1.6.5 core features | Available | [Concepts](/docs/concepts) |
| Dependency updates (Go 1.27, gRPC 1.84, security fixes) | Available | [Development plan](/docs/design/development-plan) |
| Built-in autoscaler: leader subsystem and the default engine of scaling policies, built-in strategies, `norca.cpu`/`norca.memory` usage pushed by the clients and Prometheus, external APM and strategy plugins, typed and validated `scaling` policies (a block without a check only bounds the count), quota and deployment aware, `Scaling` events, on by default | Available | [Autoscaler](/docs/features/autoscaler) |
| Node scaling: `NodeGroup` and `NodeProvider` objects, the decision of the scale (blocked work, headroom, expanders, checks, dry run), the operator `norca-nodescaler` (scale down, rolling replacement, deletion of a group), node identity with `norca-join`, and the provider application `norca-provider` with the mock and a docker provider; no cloud provider yet | In progress | [Node scaling](/docs/features/node-scaling) |
| Built-in autoscaler: node pool scaling with cloud providers (Hetzner Cloud, Scaleway, AWS, GCP) | Postponed | [Development plan](/docs/design/development-plan) |
| Built-in autoscaler: scaling on application metrics (task metrics read by the client, metrics reported by an operator, the `backlog` strategy) | Planned | [Application autoscaling plan](/docs/design/application-autoscaling-plan) |
| Namespace quotas | Available | [Quotas](/docs/features/quotas) |
| Dynamic admission control (CEL policies, webhooks) | Available | [Admission control](/docs/features/admission-control) |
| Event stream: Variables topic, resumable subscriptions | Available | [Event stream](/docs/features/event-stream) |
| Cross-job affinity (`colocate`, `separate`) | Available | [Cross-job affinity](/docs/features/cross-job-affinity) |
| Disruption budget | Available | [Disruption budget](/docs/features/disruption-budget) |
| Health check roles (startup, readiness, liveness) | Available | [Health check roles](/docs/features/health-check-roles) |
| Network rules, levels A and B (`NetworkPolicy`, cluster-level `AdminNetworkPolicy` with explicit deny, nftables in the allocation's network namespace) | Available | [Network rules](/docs/features/network-rules) |
| Operator framework: custom object kinds and objects, controller SDK, lifecycle (finalizers, deletion modes, garbage collection), ecosystem (operator modules, webhooks, schema migrations, limits, `rigger operator init`, `norca object-kind lint`) | Available (phases 1–4, with the web UI pages) | [Operator framework](/docs/features/operator-framework) |
| Observability over OpenTelemetry: the agents' metrics (`norca.*`), traces (API requests, RPCs, Raft writes, scheduling, allocation phases on the clients), logs and the event stream exported over OTLP/gRPC with TLS, mTLS and headers; Prometheus output optional; one log key convention with trace IDs; audit records of operator write calls | Available (logs and the event export are off by default) | [OpenTelemetry](/docs/operations/opentelemetry), [Audit records](/docs/operations/audit-log) |
| System bus: NATS with JetStream embedded in the servers; the event stream of each region on it | Available | [System bus](/docs/features/system-bus) |
| Change data capture (CDC): the changes of a region delivered one way to outside systems through the system bus; namespace events with Job events without secrets, admin events by right, Consul KV changes without values; tokens and workload identities | Available | [Change data capture](/docs/features/change-data-capture) |
| Certificates: TLS certificates for DNS names as objects (`Certificate`, `CertificateIssuer`), kept issued and renewed in the secret store by the servers; the issuing CA of the region or an external issuer; names allowed per namespace; revocation | Available | [Certificates](/docs/features/certificates) |
| Certificates from ACME: public certificates from an ACME certificate authority such as Let's Encrypt through the operator `norca-acme`; HTTP-01 through the edge router, DNS-01 (wildcards) through the DNS zones of `norca-provider`; the operator never sees a private key | Available | [Certificates from ACME](/docs/features/certificates-acme) |
| DNS records: DNS names that follow what runs in the cluster (`DNSRecord`), kept by the operator `norca-dns` in the zones of `norca-provider` that allow records; values given or from a `LoadBalancer`; allow list per namespace; only its own record sets, changes by hand set back | Available | [DNS records](/docs/features/dns-records) |
| Volume snapshot schedules: CSI snapshots of a volume taken on a cron schedule by the servers (`VolumeSnapshotSchedule`), one per scheduled time, the old ones deleted by a retention rule (`keep.last`, `keep.max_age`) | Available | [Volume snapshot schedules](/docs/features/volume-snapshot-schedules) |
| CSI volume requests: a CSI volume declared as an object (`CSIVolumeRequest`); the servers create or register it, expand it, set back what is changed by hand, take over an existing one only with `adopt`, and delete it with the request's `deletion_policy` | Available | [CSI volume requests](/docs/features/csi-volume-requests) |
| Tenants: one object per team (`Tenant`) for its namespace, quota, ACL policies and roles, network isolation and certificate names, kept by the servers; drift set back, existing resources only adopted explicitly, deletion once the namespace is empty | Available | [Tenants](/docs/features/tenants) |
| Multiregion deployments (staged rollout, `on_failure`, global tokens, `norca deployment run`) | Available | [Multiregion deployments](/docs/features/multiregion) |
| Server roles: observers (reads, scheduling and backups without a vote), hot standby servers (automatic and manual failover of a voter), job checks on the receiving server, request limits per ACL token | Available | [Observers and hot standby](/docs/features/server-roles) |
| Backup and restore: scheduled, age-encrypted backups to S3-compatible stores and shared directories, browsing and selective restore | Available | [Backup and restore](/docs/features/backup-restore) |
| Backup and restore: full region restore with preview and two-person approval, keyring restore, `restore-bootstrap` | Available | [Backup and restore](/docs/features/backup-restore) |
| Backup and restore: web UI | Available | [Web UI](/docs/features/web-ui) |
| Service discovery without Consul: health-based catalog, built-in DNS, Consul-compatible read layer | Available (DNS and the compatibility layer are off by default) | [Service discovery](/docs/features/service-discovery) |
| Service discovery without Consul: external services, Consul agent write endpoints | Available | [External services](/docs/features/service-discovery/external-services) |
| Full Consul as an option (`consul` module; Consul itself is BSL 1.1 and installed from its official release) | Available | [Consul module](/docs/features/service-discovery/consul-module) |
| Native mTLS: per-region CA, SPIFFE workload certificates, `ServiceIntention` objects, Go library `api/mtls` | Available | [Native mTLS](/docs/features/native-mtls) |
| Native mTLS: Envoy sidecar, upstreams, cross-region gateway | Available (tested against Envoy 1.39 and 1.40) | [Sidecar and gateway](/docs/features/native-mtls/sidecar-and-gateway) |
| Package management: Rigger (`norca rigger`), modules written in typed HCL and stacks of modules | Available | [Packages](/docs/features/packages), [Modules and stacks](/docs/features/packages/modules) |
| Norca registry of modules (`nats`, `mtls-gateway`, `rustfs`, `consul`, `traefik`, `forgejo`, `postgres`, `openobserve`, `otel-collector`, `seaweedfs`, `seaweedfs-csi`, and the operator modules `loadbalancer-operator`, `nodescaler-operator`, `norca-provider`, `norca-acme`, `norca-dns`), listed in the global registry of Rigger | Available | [Norca registry](/docs/rigger/norca-registry) |
| Package management: the global registry, git and OCI sources, lock files, signing and trust, bundles | Available | [Supply chain](/docs/features/packages/supply-chain) |
| Package management: server-side releases, signature enforcement in admission, hooks and tests, drift detection | Available | [Releases](/docs/features/packages/releases) |
| Package management: registries of the cluster, catalog and install form in the web UI, installs and stacks evaluated by the servers, private git sources | Available | [Rigger catalog](/docs/features/packages/rigger-catalog) |
| Embedded secret store: sealed keyring, versioned and audited secrets, `secret` block, Vault compatibility without a Vault | In progress (phases 0–4 available) | [Secret store](/docs/features/secrets) |
| New web UI | Available (phases 1–4) | [Web UI](/docs/features/web-ui) |
| Deployer: clusters on your own machines from a declarative plan (`norca-deployer`, a separate tool) | Available | [Deployer](/docs/features/deployer) |
| Deployer GitOps: Rigger stacks applied from Forgejo, Gitea, GitHub and GitLab repositories, on demand, on `apply` and on webhooks, from signed commits and tags | Available | [GitOps](/docs/deployer/gitops) |

## Kubernetes-inspired features

Quotas, admission control, the event stream extensions, cross-job affinity, disruption budgets, health
check roles, network rules and the operator framework take their idea from Kubernetes. Their design and
implementation are Norca's own; see [Kubernetes-inspired features](/docs/features/kubernetes-inspired).

## Where the features are used

The [deployment examples](/docs/getting-started/examples) use the available features step by step; the
[feature map](/docs/getting-started/examples#feature-map) shows which scenario shows which feature.
