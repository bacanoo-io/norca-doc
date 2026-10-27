---
title: "Consul Integration"
description: "Learn how to integrate Norca with Consul and add service discovery to jobs"
upstream:
  path: "website/content/docs/integrations/consul-integration.mdx"
---

Consul is a tool for discovering and configuring services in your
infrastructure. Consul's key features include service discovery, health checking,
a KV store, and robust support for multi-datacenter deployments. Norca's integration
with Consul enables automatic clustering, built-in service registration, and
dynamic rendering of configuration files and environment variables. The sections
below describe the integration in more detail.

## Configuration

In order to use Consul with Norca, you will need to configure and
install Consul on your nodes alongside Norca, or schedule it as a system job.
Norca does not currently run Consul for you.

To enable Consul integration, please see the
[Norca agent Consul integration](/docs/configuration/consul/)
configuration.

## Automatic Clustering with Consul

Norca servers and clients will be automatically informed of each other's
existence when a running Consul cluster already exists and the Consul agent is
installed and configured on each host. See the
[`consul` block](/docs/configuration/consul) (`server_auto_join`,
`client_auto_join`) for more information.

## Service Discovery

Norca schedules workloads of various types across a cluster of generic hosts.
Because of this, placement is not known in advance and you will need to use
service discovery to connect tasks to other services deployed across your
cluster. Norca integrates with Consul to provide service discovery and
monitoring.

To configure a job to register with service discovery, please see the
[`service` job specification documentation][service].

## Dynamic Configuration

Norca's job specification includes a [`template` block](/docs/job-specification/template/)
that utilizes a Consul ecosystem tool called [Consul Template](https://github.com/hashicorp/consul-template). This mechanism creates a convenient way to ship configuration files
that are populated from environment variables, Consul data, Vault secrets, or just
general configurations within a Norca task.

For more information on Norca's template block and how it leverages Consul Template,
please see the [`template` job specification documentation](/docs/job-specification/template/).

## Consul Namespaces

Norca provides integration with Consul Namespaces for service
registrations specified in `service` blocks and Consul KV reads in `template`
blocks.

By default, Norca will not specify a Consul namespace on service registrations or
KV store reads, which Consul then implicitly resolves to the `"default"` namespace.
This default namespace behavior can be modified by setting the [`namespace`][consul_agent_namespace] field
in the Norca agent Consul configuration block.

The agent configuration is the only place to choose the Consul namespace. A job
that sets a Consul namespace (the group level `consul` block `namespace` or the
`-consul-namespace` flag of `job run`) is rejected.

If Consul ACLs are enabled, the Consul token of the agent must belong to the
configured namespace and must be backed by a Consul ACL Policy with sufficient
`service:write` and `kv:read` permissions. An example policy might look like,

```hcl
key_prefix "" {
  policy = "read"
}

service_prefix "" {
  policy = "write"
}
```

## Assumptions

- Consul 0.7.2 or later is needed for `tls_skip_verify` in HTTP checks.

- Consul 0.6.4 or later is needed for using the Script checks.

- Consul 0.6.0 or later is needed for using the TCP checks.

- The service discovery feature in Norca depends on operators making sure that
  the Norca client can reach the Consul agent.

- Tasks running inside Norca also need to reach out to the Consul agent if
  they want to use any of the Consul APIs. Ex: A task running inside a docker
  container in the bridge mode won't be able to talk to a Consul Agent running
  on the loopback interface of the host since the container in the bridge mode
  has its own network interface and doesn't see interfaces on the global
  network namespace of the host. There are a couple of ways to solve this, one
  way is to run the container in the host networking mode, or make the Consul
  agent listen on an interface in the network namespace of the container.

[`allow_unauthenticated`]: /docs/configuration/consul#allow_unauthenticated

[consul_agent_namespace]: /docs/configuration/consul#namespace


[service]: /docs/job-specification/service/ "Norca service Job Specification"
