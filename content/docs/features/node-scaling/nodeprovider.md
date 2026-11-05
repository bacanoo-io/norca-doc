---
title: "NodeProvider"
linkTitle: "NodeProvider"
weight: 2
description: "Reference of the cluster-scoped kind norca.io/NodeProvider: the registration of an application that creates the machines of a platform."
---

A `NodeProvider` is a custom object of the kind `norca.io/NodeProvider`, cluster-scoped and local to
the region. A **provider** is an application outside the core that handles one platform (a cloud,
or the VMs of a lab): it creates and deletes machines on request and reports the size of a machine
kind. It registers itself by writing its object when it starts and keeps a heartbeat in the status.
Credentials of the platform stay with the provider application and never enter an object.

The core registers the kind when a server becomes leader, like [`NodeGroup`](/docs/features/node-scaling/nodegroup).

> The operator that calls providers is not available yet, so a `NodeProvider` is only validated and
> stored today. The `provider` of a `NodeGroup` names one of these objects.

## Spec

| Field | Type | Meaning |
| --- | --- | --- |
| `endpoint` | URL (`http://` or `https://`), required | Where the operator reaches the provider. |
| `token_variable` | string | The path of the Variable that holds the token the operator presents. |
| `groups` | list | The groups (zones) the provider offers: `name` (required), `max` and `parameters`. |
| `parameters` | object | Parameters the provider publishes. |

## Status

| Field | Meaning |
| --- | --- |
| `status.heartbeat` | Written by the provider; an old heartbeat marks the provider as unavailable. |
| `status.version` | The version of the provider. |
| `status.conditions` | Conditions with a reason. |

## Example

```hcl
kind = "norca.io/NodeProvider"
name = "hetzner-eu"

spec {
  endpoint       = "https://provider.example.org:8443"
  token_variable = "nodescaler/hetzner-eu/token"

  groups = [
    { name = "fsn1", max = 20 },
    { name = "nbg1", max = 20 },
  ]
}
```
