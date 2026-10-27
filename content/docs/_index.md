---
title: Documentation
linkTitle: Documentation
description: The Norca documentation.
---

Norca is an independent, open source workload scheduler and orchestrator. It is built on the MPL 2.0 source
code of HashiCorp Nomad v1.6.5 and extends it with its own features. Norca is not a product of HashiCorp or
IBM and is not affiliated with them.

{{< cards >}}
  {{< card link="introduction" title="Introduction" icon="information-circle" subtitle="What Norca is, its relation to Nomad 1.6.5, compatibility, licence." >}}
  {{< card link="getting-started" title="Getting started" icon="play" subtitle="Build or install the binary, run a dev agent, follow the deployment examples." >}}
  {{< card link="features" title="Norca features" icon="sparkles" subtitle="Every feature Norca adds, with examples, configuration and diagrams." >}}
  {{< card link="concepts" title="Concepts" icon="light-bulb" subtitle="Architecture, scheduling, consensus, gossip, Norca concepts." >}}
  {{< card link="job-specification" title="Job specification" icon="document-text" subtitle="Every block of a job file, including the Norca blocks." >}}
  {{< card link="configuration" title="Agent configuration" icon="cog" subtitle="Server and client configuration, including the Norca blocks." >}}
  {{< card link="commands" title="Commands (CLI)" icon="terminal" subtitle="The `norca` command line." >}}
  {{< card link="api" title="HTTP API" icon="code" subtitle="The Nomad 1.6.5 compatible HTTP API and the Norca endpoints." >}}
  {{< card link="operations" title="Operations" icon="server" subtitle="Backups, seal and unseal, upgrades, monitoring, the pack registry." >}}
  {{< card link="design" title="Design" icon="pencil" subtitle="The design documents of the Norca features, with their status." >}}
{{< /cards >}}

## Conventions

- The binary and the CLI are called `norca`. A copy or symlink named `nomad` behaves identically
  ([compatibility alias](/docs/getting-started/install#compatibility-alias-nomad)).
- Names that are part of the Nomad compatibility surface are unchanged: the HTTP API (Nomad API 1.6.5
  compatible), the `NOMAD_*` variables injected into workloads, the `X-Nomad-Token` header, the
  `provider = "nomad"` service provider, metric names and the `.nomad.hcl` job file suffix.
- Pages marked at the bottom as adapted from the Nomad v1.6.5 documentation keep that text's MPL 2.0
  licence; see [licence and attribution](/docs/introduction/license).
