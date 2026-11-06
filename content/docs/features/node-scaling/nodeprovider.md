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

The node scaling operator (`norca-nodescaler`, the `nodescaler-operator` pack) reads these objects
and calls the providers. The `provider` of a `NodeGroup` names one of them. How to write a provider,
and what the operator relies on, is in [Writing a node provider](/docs/features/node-scaling/writing-a-provider).

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

## Events

`norca object events norca.io/NodeProvider <name>` shows the log of a provider. The operator writes
`OrphanedInstance` there for an instance of a node group that is gone and that still runs a node: it
is left as it is (see [the deletion of a group](/docs/features/node-scaling/nodegroup#the-deletion-of-a-group)).

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
