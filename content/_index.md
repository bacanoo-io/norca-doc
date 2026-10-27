---
title: Norca
layout: hextra-home
description: Norca is an open source workload scheduler and orchestrator built on the MPL 2.0 source code of Nomad v1.6.5, with its own extensions.
---

{{< hextra/hero-container >}}
{{< hextra/hero-headline >}}
  Schedule anything.&nbsp;<br class="hx:sm:block hx:hidden" />Keep it open.
{{< /hextra/hero-headline >}}
{{< hextra/hero-subtitle >}}
  Norca is an independent, open source workload scheduler and orchestrator built on&nbsp;<br class="hx:sm:block hx:hidden" />the MPL 2.0 source code of Nomad v1.6.5, with a built-in autoscaler, quotas, admission,&nbsp;<br class="hx:sm:block hx:hidden" />service discovery without Consul, native mTLS, secrets, backups and packages.
{{< /hextra/hero-subtitle >}}
<div class="hx:mt-6 hx:mb-6">
{{< hextra/hero-button text="Get started" link="docs/getting-started/" >}}
{{< hextra/hero-button text="Features" link="docs/features/" style="background: transparent; color: inherit; border: 1px solid currentColor;" >}}
</div>
{{< /hextra/hero-container >}}

{{< hextra/feature-grid >}}
  {{< hextra/feature-card title="One binary, Nomad API compatible" subtitle="A single `norca` binary runs the agent and the CLI. Clients, tools and scripts written for the Nomad 1.6.5 HTTP API keep working." link="docs/introduction/compatibility/" >}}
  {{< hextra/feature-card title="Built-in autoscaler" subtitle="Horizontal application scaling as a leader subsystem of the servers, with typed, validated scaling policies." link="docs/features/autoscaler/" >}}
  {{< hextra/feature-card title="Service discovery without Consul" subtitle="A health-based catalog, built-in DNS, topology-aware routing and a Consul-compatible read API." link="docs/features/service-discovery/" >}}
  {{< hextra/feature-card title="Native mTLS" subtitle="SPIFFE workload certificates, Envoy sidecars, service intentions and a cross-region gateway." link="docs/features/native-mtls/" >}}
  {{< hextra/feature-card title="Kubernetes-inspired policies" subtitle="Namespace quotas, admission control with CEL, disruption budgets, health check roles and network rules." link="docs/features/kubernetes-inspired/" >}}
  {{< hextra/feature-card title="Operators and custom objects" subtitle="Native object kinds with schemas, controllers, finalizers and garbage collection." link="docs/features/operator-framework/" >}}
  {{< hextra/feature-card title="Embedded secret store" subtitle="A sealed keyring, versioned and audited secrets, delivery to tasks and Vault compatibility." link="docs/features/secrets/" >}}
  {{< hextra/feature-card title="Backup and restore" subtitle="Scheduled, age-encrypted backups to S3-compatible stores with browsing and selective restore." link="docs/features/backup-restore/" >}}
  {{< hextra/feature-card title="Packages" subtitle="`norca pack` built in: registries, signatures, server-side releases with rollback." link="docs/features/packages/" >}}
{{< /hextra/feature-grid >}}
