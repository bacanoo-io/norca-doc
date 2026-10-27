---
title: "Integrations (Consul, Vault)"
linkTitle: "Integrations"
description: "This section features Norca's integrations with Consul and Vault."
upstream:
  path: "website/content/docs/integrations/index.mdx"
weight: 13
---

Norca integrates with HashiCorp Consul and HashiCorp Vault for service
discovery, service mesh and secrets management, as Nomad v1.6.5 does. Norca
also has built-in alternatives that work without them: see
[service discovery](/docs/features/service-discovery),
[native mTLS](/docs/features/native-mtls) and the
[built-in secret store](/docs/features/secrets).

{{< cards >}}
  {{< card link="/docs/integrations/consul-integration" title="Consul" subtitle="Service registration, discovery and templates." >}}
  {{< card link="/docs/integrations/consul-connect" title="Consul service mesh" subtitle="Connect sidecars and gateways." >}}
  {{< card link="/docs/integrations/vault-integration" title="Vault" subtitle="Vault tokens and secrets for tasks." >}}
{{< /cards >}}
