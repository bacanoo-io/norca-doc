---
title: "Plugins"
description: "Learn about task driver and device plugins for Norca."
upstream:
  path: "website/content/plugins/index.mdx"
weight: 15
---

Nomad 0.9 introduced a plugin framework which allows users to extend the
functionality of some components within Norca. The design of the plugin system
is inspired by the lessons learned from the plugin systems of Terraform and
Vault.

The following components are currently pluggable within Norca:

{{< cards >}}
  {{< card link="/docs/plugins/drivers" title="Task drivers" subtitle="Built-in, community and remote task drivers." >}}
  {{< card link="/docs/plugins/devices" title="Devices" subtitle="Device plugins such as the NVIDIA GPU plugin." >}}
{{< /cards >}}
