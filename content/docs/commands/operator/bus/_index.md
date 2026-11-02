---
title: "Command: operator bus"
linkTitle: "bus"
description: "The operator bus command groups the tools for the system bus of the servers."
---

The `operator bus` command groups the subcommands for the system bus: the NATS
server with JetStream embedded in the Norca servers, configured in the
server's [`bus` block](/docs/configuration/bus).

## Usage

Usage: `norca operator bus <subcommand> [options]`

| Subcommand | Description |
| --- | --- |
| [`status`](/docs/commands/operator/bus/status) | Display the status of the system bus of a server |
