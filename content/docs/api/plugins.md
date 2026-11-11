---
title: "Plugins HTTP API"
linkTitle: "Plugins"
description: "The `/plugin` endpoints are used to query for and interact with dynamic plugins."
upstream:
  path: "website/content/api-docs/plugins.mdx"
---

The `/plugin` endpoints are used to query for and interact with
dynamic plugins. Currently only Container Storage Interface (CSI)
plugins are dynamic.

## List Plugins

This endpoint lists all dynamic plugins.

| Method | Path          | Produces           |
| ------ | ------------- | ------------------ |
| `GET`  | `/v1/plugins` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required                |
| ---------------- | --------------------------- |
| `YES`            | `namespace:csi-list-plugin` |

### Parameters

- `type` `(string: "")` - Specifies the type of plugin to
  query. Currently only supports `csi`. This is specified as a query
  string parameter. **Returns an empty list if omitted.**

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/plugins?type=csi
```

### Sample Response

```json
[
  {
    "ID": "example",
    "Provider": "aws.ebs",
    "ControllerRequired": true,
    "ControllersHealthy": 2,
    "ControllersExpected": 3,
    "NodesHealthy": 14,
    "NodesExpected": 16,
    "CreateIndex": 52,
    "ModifyIndex": 93
  }
]
```

## Read Plugin

Get details of a single plugin, including information about the
plugin's job and client fingerprint data.

| Method | Path                        | Produces           |
| ------ | --------------------------- | ------------------ |
| `GET`  | `/v1/plugin/csi/:plugin_id` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required                |
| ---------------- | --------------------------- |
| `YES`            | `namespace:csi-read-plugin` |

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/plugin/csi/example_plugin_id
```

### Sample Response

```json
[
  {
    "ID": "example_plugin_id",
    "Provider": "aws.ebs",
    "Version": "1.0.1",
    "ControllersRequired": true,
    "ControllersHealthy": 1,
    "Controllers": {
      "example_node_id": {
        "PluginID": "example_plugin_id",
        "Provider": "aws.ebs",
        "ProviderVersion": "1.0.1",
        "AllocID": "alloc-id",
        "Healthy": true,
        "HealthDescription": "healthy",
        "UpdateTime": "2020-01-31T00:00:00.000Z",
        "RequiresControllerPlugin": true,
        "RequiresTopologies": true,
        "ControllerInfo": {
          "SupportsReadOnlyAttach": true,
          "SupportsAttachDetach": true,
          "SupportsListVolumes": true,
          "SupportsListVolumesAttachedNodes": false
        }
      }
    },
    "NodesHealthy": 1,
    "Nodes": {
      "example_node_id": {
        "PluginID": "example_plugin_id",
        "Provider": "aws.ebs",
        "ProviderVersion": "1.0.1",
        "AllocID": "alloc-id",
        "Healthy": true,
        "HealthDescription": "healthy",
        "UpdateTime": "2020-01-30T00:00:00.000Z",
        "RequiresControllerPlugin": true,
        "RequiresTopologies": true,
        "NodeInfo": {
          "ID": "example_node_id",
          "MaxVolumes": 51,
          "AccessibleTopology": {
            "key": "val2"
          },
          "RequiresNodeStageVolume": true
        }
      }
    }
  }
]
```

## Read Plugin Capacity

Ask a controller of the plugin for the capacity of its storage (CSI
`GetCapacity`, Norca). The plugin needs the `GET_CAPACITY` controller
capability. Every field of the body is optional; without them the answer is
for the whole storage. `Topology` is only allowed for a plugin with
topologies. The capacity the leader asked last is in `Capacity` of
[Read Plugin](#read-plugin).

| Method | Path                                 | Produces           |
| ------ | ------------------------------------ | ------------------ |
| `PUT`  | `/v1/plugin/csi/:plugin_id/capacity` | `application/json` |

| Blocking Queries | ACL Required  |
| ---------------- | ------------- |
| `NO`             | `plugin:read` |

### Sample Payload

```json
{
  "Parameters": { "tier": "fast" },
  "Capabilities": [
    { "AccessMode": "single-node-writer", "AttachmentMode": "file-system" }
  ]
}
```

### Sample Request

```shell
$ curl -X PUT --data @payload.json \
    https://localhost:4646/v1/plugin/csi/example_plugin_id/capacity
```

### Sample Response

```json
{
  "AvailableCapacity": 10737418240,
  "MaximumVolumeSize": 5368709120,
  "At": "2026-11-11T21:05:12.123Z"
}
```
