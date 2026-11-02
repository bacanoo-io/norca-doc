---
title: "Command: operator metrics-store"
linkTitle: "metrics-store"
description: "The operator metrics-store command groups the tools for the metrics store of the servers."
---

The `operator metrics-store` command groups the subcommands for the metrics
store: the history of the task group usage every server keeps, configured in
the server's [`metrics_store` block](/docs/configuration/metrics_store).

## Usage

Usage: `norca operator metrics-store <subcommand> [options]`

| Subcommand | Description |
| --- | --- |
| [`status`](/docs/commands/operator/metrics-store/status) | Display the state of the metrics store of a server |
