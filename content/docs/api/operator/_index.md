---
title: "Operator HTTP API"
linkTitle: "Operator"
description: "The /operator endpoints provides cluster-level tools for Norca operators, such as interacting with the Raft subsystem."
upstream:
  path: "website/content/api-docs/operator/index.mdx"
---

The `/operator` endpoints provide cluster-level tools for Norca operators, such
as interacting with the Raft subsystem, snapshots, autopilot and scheduler configuration.

> [!WARNING]
> Use this interface with extreme caution, as improper use could lead to a
> Norca outage and even loss of data.

For a CLI to perform these operations manually,
please see the documentation for the
[`norca operator`](/docs/commands/operator/) command.

Please choose a sub-section in the navigation for more information
