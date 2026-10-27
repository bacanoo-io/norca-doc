---
title: "Base Plugin"
description: "The interface that every autoscaler plugin implements."
upstream:
  path: "website/content/tools/autoscaling/concepts/plugins/base.mdx"
---

The base plugin is an interface required of all autoscaler plugins,
providing a set of common operations.

## Plugin API

#### `PluginInfo() (*PluginInfo, error)`

A `PluginInfo` contains metadata about the plugin. For example,
the Prometheus APM plugin returns the following;

```go
PluginInfo{
    // Name of the plugin
    Name: "prometheus",
    // Plugin type: "apm" or "strategy"
    PluginType: "apm"
}
```

#### `SetConfig(config map[string]string) error`

The `SetConfig` function is called when starting an instance of the plugin. It
contains the configuration of a named instance of the plugin, the `config` map of
its `apm` or `strategy` block in the server's
[`autoscaler` block][plugin_config]. External plugins receive it again every
time their process is restarted.

[plugin_config]: /docs/configuration/autoscaler
