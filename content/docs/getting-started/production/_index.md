---
title: "Installing Norca for Production"
linkTitle: "Production"
description: "The steps for a production Norca deployment: requirements, installation, agent configuration and hardening."
upstream:
  path: "website/content/docs/install/production/index.mdx"
---

While Norca provides a low-friction practitioner experience out of
the box, there are a few critical steps to take for a successful production
Norca deployment.

{{< cards >}}
  {{< card link="/docs/getting-started/production/requirements" title="Hardware requirements" subtitle="Machine resources, ports, network topology and hardening." >}}
  {{< card link="/docs/getting-started/install" title="Install Norca" subtitle="Release archives, container image, systemd unit." >}}
  {{< card link="/docs/getting-started/examples" title="Deployment examples" subtitle="Single node, three nodes and multi-region clusters." >}}
{{< /cards >}}

## Verify Hardware Requirements

Review the recommended machine resources (instances), port requirements, and
network topology for Norca in the [Hardware Requirements](/docs/getting-started/production/requirements/).

## Install Norca

Norca is a single binary, `norca`. The [installation page](/docs/getting-started/install)
describes the release archives of the GitHub releases, the container image and
building from source, and shows the systemd unit that runs the agent as a
service. On Windows, see [Norca as a Windows service](/docs/getting-started/windows-service).

Put the agent configuration files in `/etc/norca.d` and the data directory in
`/opt/norca/data` (any absolute path works; set it with
[`data_dir`](/docs/configuration#data_dir)). The
[deployment examples](/docs/getting-started/examples) contain complete
configurations for a single node, a three node cluster and a multi-region
federation.

## Configure your Norca Servers and Clients

Refer to the [Set Server & Client Nodes](/docs/operations/nomad-agent/)
and [Norca Agent documentation](/docs/commands/agent/) pages to learn about the
Norca agent process and how to configure the server and client nodes in your
cluster.
