---
title: Design
description: The design documents of the Norca features, with their status.
weight: 19
---

The design documents describe how each Norca feature is meant to work, why, and in which phases it is
built. They were written before and during the implementation. Each one starts with a status
marker: *Plan*, *In progress* or *Implemented*. The status of the features themselves is in the
[feature table](/docs/features); the feature pages describe what is available today.

| Document | Covers | Status |
| --- | --- | --- |
| [Development plan](/docs/design/development-plan) | Built-in autoscaler, Kubernetes-inspired features overview, multi-cloud connectivity, multiregion deployments, roadmap | In progress |
| [Kubernetes-inspired features](/docs/design/kubernetes-features-spec) | Namespace quotas, admission control, event stream, cross-job affinity, disruption budget, health check roles, network rules, operator framework | In progress (items 1–7 implemented; item 8 phases 1–4 implemented) |
| [Consul independence](/docs/design/consul-independence-plan) | Catalog, built-in DNS, Consul-compatible API, external services, native mTLS, Consul as an option | In progress (phases 1–4 and 6 implemented; phase 5 steps 1–3 implemented) |
| [Backup and restore](/docs/design/backup-restore-plan) | Scheduled backups to S3 and shared directories, encryption, retention, selective and full restore, web UI | In progress (phases 1–4 implemented; the `kms` encryption mode not yet) |
| [Package management](/docs/design/package-management-plan) | `norca pack`, releases, registries and supply chain | In progress (phases 1–4 implemented) |
| [Secret storage](/docs/design/secrets-plan) | Sealed keyring, built-in secret store, delivery, Vault compatibility, external providers | In progress (phases 0–4 implemented) |
| [Cluster scaling](/docs/design/cluster-scaling-plan) | Scaling the number of client nodes with platform providers: scope (pool and datacenter), decisions, internal metrics, provider contract, drain | In progress (phases 0–4 implemented; cloud providers and phase 5 not yet) |
| [Observers and hot standby servers](/docs/design/server-roles-plan) | Server roles, the promoter of autopilot, standby failover, backups from observers, job checks before the leader | In progress (phases 1–4 implemented; the history stream and the heartbeat relay postponed) |
| [Horizontal autoscaling on application metrics](/docs/design/application-autoscaling-plan) | The decision model of the built-in autoscaler, how the task group scaler and the node scaler depend on each other, task metrics, operator-reported metrics, the `backlog` strategy | In progress (the decision model and the fixes of the scalers implemented; the application metrics planned) |
| [Web UI](/docs/design/ui-plan) | The new web UI, Tabler migration, [visual mockup](/design/mockups/ui-mockup.html) (fictional data) | In progress |

> [!NOTE]
> Some features are described in the design documents with a broader scope than what is available.
> Only features marked *Available* in the feature table can be used.
