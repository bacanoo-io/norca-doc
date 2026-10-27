---
title: Trademarks
description: How this documentation uses the names of other projects.
weight: 10
---

Norca is an independent project. It is based on the MPL 2.0 licensed source code of HashiCorp Nomad
v1.6.5; it is not a product of HashiCorp, Inc. or IBM Corp. and is not affiliated with, endorsed or
sponsored by them.

"Nomad", "Consul", "Vault", "Terraform" and "HashiCorp" are trademarks of their respective owners.
"Kubernetes" is a trademark of The Linux Foundation. Other names, such as Envoy, NATS, RustFS,
OpenObserve, OpenTelemetry, Docker and Podman, belong to their owners. They appear in this documentation
only to describe the origin of the code, compatibility, or integrations with those products.

- The name of the project, the binary and the branding do not contain these names. The binary is
  `norca`; `nomad` is only a documented [compatibility alias](/docs/introduction/compatibility#the-norca-binary-and-the-nomad-alias)
  that users can create themselves.
- "Nomad" is kept where it names a compatibility interface: the Nomad 1.6.5 HTTP API, the `NOMAD_*`
  environment variables, the `X-Nomad-Token` header, metric names and the `nomad` service provider.
- No logos, icons or design of HashiCorp products are used, in this site or in the Norca web UI.
- Features of Norca are not named after HashiCorp products and are not described as versions of
  HashiCorp Enterprise features.
- Where a Norca feature takes its idea from Kubernetes, the documentation says so; the design and the
  implementation are Norca's own.
