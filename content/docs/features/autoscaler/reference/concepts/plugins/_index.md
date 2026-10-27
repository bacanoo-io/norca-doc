---
title: "Plugins"
description: "How the built-in autoscaler runs built-in and external APM and strategy plugins."
upstream:
  path: "website/content/tools/autoscaling/concepts/plugins/index.mdx"
---

The built-in autoscaler uses a plugin framework which allows users to extend its
functionality. The following components are pluggable:

- APMs
- Strategies

In addition, each plugin implements a base plugin functionality. Target plugins
of the external autoscaler are not loaded: the built-in autoscaler scales task
groups and custom objects through internal calls.

## Built-in and external plugins

The `nomad-apm` and `prometheus` APMs and the `target-value`, `threshold`,
`fixed-value` and `pass-through` strategies are built into the `norca` binary and
run inside the server process.

External plugins are separate executables in the server's
[`plugin_dir`](/docs/configuration/autoscaler), referenced by the `driver` of an
`apm` or `strategy` block. They use the [go-plugin][goplugin] project to expose
a language-independent plugin interface: plugins implement a set of gRPC services
and methods which the server manages by running the plugin and calling the
implemented RPCs. The handshake, the gRPC services and the messages are those of
the plugin SDK of the external autoscaler (version 0.6), so existing APM and
strategy plugin binaries built with that SDK run unchanged.

Each external plugin runs in its own process. A plugin that crashes, hangs or
fails to start only fails the checks that use it, and it is started again on its
next use with an exponential backoff (from 1 second up to 2 minutes). Plugin
processes run while the server is the leader and the autoscaler is enabled.

To make plugin development easier, a set of Go interfaces and structs exist for
each plugin type that abstract the `go-plugin` and gRPC interfaces. The guides in
this documentation reference these abstractions. The built-in plugins of Norca
can serve as examples: see the
[plugin sources](https://github.com/bacanoo-io/norca/tree/main/nomad/nomad/autoscaler/plugins)
and the [SDK](https://github.com/bacanoo-io/norca/tree/main/nomad/nomad/autoscaler/sdk)
in the Norca repository.

[goplugin]: https://github.com/hashicorp/go-plugin
