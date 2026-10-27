---
title: Getting started
description: Build or install the norca binary, run a development agent and follow the deployment examples.
weight: 2
---

Norca is a single binary, `norca`, that runs both the agent (server, client, or both) and the command
line interface.

{{% steps %}}

### Get the binary

[Build it from source or take a release archive](/docs/getting-started/install). Optionally create the
`nomad` [compatibility alias](/docs/introduction/compatibility#the-norca-binary-and-the-nomad-alias).

### Run a development agent

[`norca agent -dev`](/docs/getting-started/first-job) starts a server and a client in one process, with
the web UI, and keeps everything in memory.

### Run a job

Write a job file with `norca job init`, run it with `norca job run`, and watch it in the web UI.

### Follow a deployment example

The [deployment examples](/docs/getting-started/examples) go step by step from a development agent to a
single secured node, a highly available three-node region and a federation of regions, using the Norca
features on the way.

{{% /steps %}}

For production installations, read the [requirements](/docs/getting-started/production/requirements)
and the [reference architecture](/docs/getting-started/production) pages, then the
[02 – Single node](/docs/getting-started/examples/02-single-node) and
[03 – Three nodes](/docs/getting-started/examples/03-three-node) examples.
