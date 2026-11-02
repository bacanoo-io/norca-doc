---
title: "Plugins"
description: "Learn about how external plugins work in Norca."
upstream:
  path: "website/content/docs/concepts/plugins/index.mdx"
---

Nomad 0.9 introduced a plugin framework which allows users to extend the
functionality of some components within Norca. The design of the plugin system
is inspired by the lessons learned from the plugin systems of Terraform and
Vault.

The following components are currently pluggable within Norca:

- [Task Drivers](/docs/concepts/plugins/task-drivers/)
- [Devices](/docs/concepts/plugins/devices/)

# Architecture

The Norca plugin framework uses the [go-plugin][goplugin] project to expose
a language independent plugin interface. Plugins implement a set of gRPC
services and methods which Norca manages by running the plugin and calling the
implemented RPCs. This means that plugins are free to be implemented in the
author's language of choice.

To make plugin development easier, a set of go interfaces and structs exist for
each plugin type that abstract away go-plugin and the gRPC interface. The
guides in this documentation reference these abstractions for ease of use.

[goplugin]: https://github.com/hashicorp/go-plugin
