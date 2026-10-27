---
title: "Node Pools"
description: "Node pools group clients and restrict the clients that jobs are placed on."
upstream:
  path: "website/content/docs/concepts/node-pools.mdx"
---

Node pools are a way to group clients and segment infrastructure into logical
units that can be targeted by jobs for a strong control over where allocations
are placed.

Without node pools, allocations for a job can be placed in any eligible client
in the cluster. Affinities and constraints can help express preferences for
certain nodes, but they do not easily prevent other jobs from placing
allocations in a set of nodes.

A node pool can be created using the [`norca node pool apply`][cli_np_apply]
command and passing a node pool [specification file][np_spec].

```hcl
# dev-pool.nomad.hcl
node_pool "dev" {
  description = "Nodes for the development environment."

  meta {
    environment = "dev"
    owner       = "sre"
  }
}
```

```shell
$ norca node pool apply dev-pool.nomad.hcl
Successfully applied node pool "dev"!
```

Clients can then be added to this node pool by setting the
[`node_pool`][client_np] attribute in their configuration file, or using the
equivalent [`-node-pool`][cli_agent_np] command line flag.

```hcl
client {
  # ...
  node_pool = "dev"
  # ...
}
```

To help streamline this process, nodes can create node pools on demand. If a
client configuration references a node pool that does not exist yet, Norca
creates the node pool automatically on client registration.

> [!NOTE]
> This behavior does not apply to clients in non-authoritative regions. Refer
> to <a href="#multi-region-clusters">Multi-region Clusters</a> for more
> information.

Jobs can then reference node pools using the [`node_pool`][job_np] attribute.

```hcl
job "app-dev" {
  # ...
  node_pool = "dev"
  # ...
}
```

Similarly to the `namespace` attribute, the node pool must exist beforehand,
otherwise the job registration results in an error. Only nodes in the given
node pool are considered for placement. If none are available the deployment
is kept as pending until a client is added to the node pool.

## Multi-region Clusters

In federated multi-region clusters, node pools are automatically replicated
from the authoritative region to all non-authoritative regions, and requests to
create or modify a new node pool are forwarded from non-authoritative to the
authoritative region.

Since the replication data only flows in one direction, clients in
non-authoritative regions are not able to create node pools on demand.

A client in a non-authoritative region that references a node pool that does
not exist yet is kept in the `initializing` status until the node pool is
created and replicated to all regions.

## Built-in Node Pools

In addition to the user generated node pools Norca automatically creates two
built-in node pools that cannot be deleted nor modified.

- `default`: Node pools are an optional feature of Norca. The `node_pool`
  attribute in both the client configuration and job files are optional. When
  not specified, these values are set to use the `default` built-in node pool.

- `all`: In some situations, it is useful to be able to run a job across all
  clients in a cluster, regardless of their node pool configuration. For these
  scenarios the job may use the built-in `all` node pool which always includes
  all clients registered in the cluster. Unlike other node pools, the `all`
  node pool can only be used in jobs and not in client configuration.

## Multi-region Jobs

Multi-region jobs can specify different node pools to be used in each region by
overriding the top-level `node_pool` job value in each `region` block. See
[multi-region deployments](/docs/features/multiregion).

```hcl
job "multiregion" {
  node_pool = "dev"

  multiregion {
    # This region will use the top-level "dev" node pool.
    region "north" {}

    # While the regions below will use their own specific node pool.
    region "east" {
      node_pool = "dev-east"
    }

    region "west" {
      node_pool = "dev-west"
    }
  }
  # ...
}
```

## Node Pool Patterns

The sections below describe some node pool patterns that can be used to achieve
specific goals.

### Infrastructure and System Jobs

This pattern illustrates an example where node pools are used to reserve nodes
for a specific set of jobs while also allowing system jobs to cross node pools
boundaries.

It is common for Norca clusters to have certain jobs that are focused on
providing the underlying infrastructure for more business focused applications.
Some examples include reverse proxies for traffic ingress, CSI plugins, and
periodic maintenance jobs.

These jobs can be isolated in their own namespace but they may have different
scheduling requirements.

Reverse proxies, and only reverse proxies, may need to run in clients that are
exposed to public traffic, and CSI controller plugins may require clients to
have high-privileged access to cloud resources and APIs.

Other jobs, like CSI node plugins and periodic maintenance jobs, may need to
run as `system` jobs in all clients of the cluster.

Node pools can be used to achieve the isolation required by the first set of
jobs, and the built-in `all` node pool can be used for the jobs that must run
in every client. To keep them organized, all jobs are registered in the same
`infra` namespace.

```hcl
job "ingress-proxy" {
  namespace = "infra"
  node_pool = "ingress"
  # ...
}
```

```hcl
job "csi-controller" {
  namespace = "infra"
  node_pool = "csi-controllers"
  # ...
}
```

```hcl
job "csi-nodes" {
  namespace = "infra"
  node_pool = "all"
  # ...
}
```

```hcl
job "maintenance" {
  type      = "batch"
  namespace = "infra"
  node_pool = "all"

  periodic { /* ... */ }
  # ...
}
```

Use positive and negative constraints to fine-tune placements when targeting
the built-in `all` node pool.

```hcl
job "maintenance-linux" {
  type      = "batch"
  namespace = "infra"
  node_pool = "all"

  constraint {
    attribute = "${attr.kernel.name}"
    value     = "linux"
  }

  constraint {
    attribute = "${node.pool}"
    operator  = "!="
    value     = "ingress"
  }

  periodic { /* ... */ }
  # ...
}
```

[cli_np_apply]: /docs/commands/node-pool/apply/
[cli_agent_np]: /docs/commands/agent#node-pool
[client_np]: /docs/configuration/client#node_pool
[job_np]: /docs/job-specification/job#node_pool
[np_spec]: /docs/other-specifications/node-pool/
