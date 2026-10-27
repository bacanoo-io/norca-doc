---
title: "Variable Interpolation"
description: "Learn about the Norca's interpolation and interpreted variables."
upstream:
  path: "website/content/docs/runtime/interpolation.mdx"
---

Norca supports interpreting two classes of variables: node attributes and
runtime environment variables. Node attributes are interpretable in constraints,
task environment variables, and certain driver fields. Runtime environment
variables are not interpretable in constraints because they are only defined
once the scheduler has placed them on a particular node.

Norca supports interpreting two classes of variables: [node attributes](#interpreted_node_vars)
and [runtime environment variables](#interpreted_env_vars). Node attributes are
interpretable in [constraints](/docs/job-specification/constraint/),
[task environment variables](/docs/job-specification/env/), and certain
task driver fields—for example the [`labels`](/docs/drivers/docker#labels)
attribute of the Docker [`config`](/docs/drivers/docker/).

> [!NOTE]
> Runtime environment variables are not defined until after the scheduler
> has placed the job, so they are unavailable for use in job constraints.

## Syntax

The syntax for interpreting variables in the Norca job specification is
`${variable_name}`. The [`template` block](/docs/job-specification/template/)
uses the `env` function to retrieve these variables from the environment, using
`{{env "variable_name"}}` instead. Examples can be seen below:

```hcl
task "docs" {
  driver = "docker"

  # Drivers support interpreting node attributes and runtime environment
  # variables
  config {
    image = "my-app"

    # Interpret runtime variables to inject the address to bind to and the
    # location to write logs to.
    args = [
      "--bind", "${NOMAD_ADDR_RPC}",
      "--logs", "${NOMAD_ALLOC_DIR}/logs",
    ]

    port_map {
      RPC = 6379
    }
  }

  # Constraints only support node attributes as runtime environment variables
  # are only defined after the task is placed on a node.
  constraint {
    attribute = "${attr.kernel.name}"
    value     = "linux"
  }

  template {
    destination = "template.txt"
    data = <<EOT
{{- /*
      Environment variables are available to templates via the env function,
      rather than the ${...} syntax.
*/ -}}
Running on {{env "attr.unique.hostname"}}.
EOT
  }

  # Environment variables are interpreted and can contain both runtime and
  # node attributes. These environment variables are passed into the task.
  env {
    DC      = "Running on datacenter ${node.datacenter}"
    VERSION = "Version ${NOMAD_META_VERSION}"
  }

  # Meta keys are also interpretable.
  meta {
    VERSION = "v0.3"
  }
}
```

## Node Attributes ((#interpreted_node_vars, #node-variables-))

Below is a full listing of node attributes that are interpretable. These
attributes are interpreted by **both** constraints and within the task and
driver.

| Variable              | Description                                 | Example Value                          |
|-----------------------|---------------------------------------------|----------------------------------------|
| `${node.unique.id}`   | 36 character unique client identifier       | `9afa5da1-8f39-25a2-48dc-ba31fd7c0023` |
| `${node.region}`      | Client's region                             | `global`                               |
| `${node.datacenter}`  | Client's datacenter                         | `dc1`                                  |
| `${node.unique.name}` | Client's name                               | `nomad-client-10-1-2-4`                |
| `${node.class}`       | Client's class                              | `linux-64bit`                          |
| `${node.pool}`        | Client's node pool                          | `prod`                                 |
| `${attr.<property>}`  | Property given by `property` on the client  | `${attr.cpu.arch} => amd64`            |
| `${meta.<key>}`       | Metadata value given by `key` on the client | `${meta.foo} => bar`                   |

Below is a table documenting common node properties.

| Property                                           | Description                                                                                                                                            |
| ---------------------------------------------------| ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `${attr.cpu.arch}`                                 | CPU architecture of the client (e.g. `amd64`, `386`)                                                                                                   |
| `${attr.cpu.numcores}`                             | Number of CPU cores on the client. May differ from how many cores are available for reservation due to OS or configuration. See `cpu.reservablecores`. |
| `${attr.cpu.reservablecores}`                      | Number of CPU cores on the client available for scheduling. Number of cores used by the scheduler when placing work with `resources.cores` set.        |
| `${attr.cpu.totalcompute}`                         | `cpu.frequency × cpu.numcores` but may be overridden by `client.cpu_total_compute`                                                                     |
| `${attr.consul.datacenter}`                        | The Consul datacenter of the client (if Consul is found)                                                                                               |
| `${attr.driver.<property>}`                        | See the [task drivers](/docs/drivers/) for property documentation                                                                                 |
| `${attr.unique.hostname}`                          | Hostname of the client                                                                                                                                 |
| `${attr.unique.network.ip-address}`                | The IP address fingerprinted by the client and from which task ports are allocated                                                                     |
| `${attr.kernel.arch}`                              | Kernel architecture of the client (e.g. `x86_64`, `aarch64`)                                                                                           |
| `${attr.kernel.name}`                              | Kernel of the client (e.g. `linux`, `darwin`)                                                                                                          |
| `${attr.kernel.version}`                           | Version of the client kernel (e.g. `3.19.0-25-generic`, `15.0.0`)                                                                                      |
| `${attr.platform.aws.ami-id}`                      | AMI ID of the client (if on AWS EC2)                                                                                                                   |
| `${attr.platform.aws.instance-life-cycle}`         | Instance lifecycle (e.g. spot, on-demand) of the client (if on AWS EC2)                                                                                |
| `${attr.platform.aws.instance-type}`               | Instance type of the client (if on AWS EC2)                                                                                                            |
| `${attr.platform.aws.placement.availability-zone}` | Availability Zone of the client (if on AWS EC2)                                                                                                        |
| `${attr.os.name}`                                  | Operating system of the client (e.g. `ubuntu`, `windows`, `darwin`)                                                                                    |
| `${attr.os.version}`                               | Version of the client OS                                                                                                                               |
| `${attr.os.build}`                                 | Build number (e.g `14393.5501`) of the client OS (if on Windows)                                                                                       |

The full list of node attributes can be obtained by running `norca node status -verbose [node]`.

Here are some examples of using node attributes and properties in a job file:

```hcl
job "docs" {
  # This will constrain this job to only run on 64-bit clients.
  constraint {
    attribute = "${attr.cpu.arch}"
    value     = "amd64"
  }

  # This will restrict the job to only run on clients with 4 or more cores.
  # Note: you may also declare a resource requirement for CPU for a task.
  constraint {
    attribute = "${cpu.numcores}"
    operator  = ">="
    value     = "4"
  }

  # Only run this job on a memory-optimized AWS EC2 instance.
  constraint {
    attribute = "${attr.platform.aws.instance-type}"
    value     = "m4.xlarge"
  }
}
```

## Environment Variables ((#interpreted_env_vars))

The following are runtime environment variables that describe the environment
the task is running in. These are only defined once the task has been placed on
a particular node and as such can not be used in constraints.

Environment variables should be enclosed in brackets `${...}` for
interpolation or accessed using the `env` function inside the template
block—`{{env "..."}}`

### Dots in Variables ((#dots_in_vars))

Norca interprets dots in names as object notation. This causes names that have
multiple consecutive dots to be considered invalid. For example, an environment
variable named `invalid...name` cannot be interpolated using the standard
`"${invalid...name}"` syntax. If you do, the parser will return an
`Extra characters after interpolation expression` error. Norca provides a
variable—`env`—that can access any environment variable, regardless
of its name, using index syntax.

```hcl
job "sample" {
  datacenters = ["dc1"]
  group "g1" {
    task "redis" {

      # Note: to set an environment variable with an invalid name, you must
      # use the HCL2 map assignment syntax for `env`. Otherwise, the job spec
      # parser will throw an `Argument or block definition required` error
      env = {
        "invalid...name" = "value1"
        "valid.name"     = "value2"
      }

      driver = "docker"
      config {
        image  = "redis:7"
        labels {
          label1 = "${env["invalid...name"]}"
          label2 = "${valid.name}"
        }
      }
    }
  }
}
```

### Job-related variables

| Variable                 | Description                                                                                                                                                                                                                                                                     |
|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `NOMAD_ALLOC_DIR`        | The path to the shared `alloc/` directory. See the [Runtime Task Directories documentation][taskdirs] for more information.                                                                                                                                                     |
| `NOMAD_TASK_DIR`         | The path to the task `local/` directory. See the [Runtime Task Directories documentation][taskdirs] for more information.                                                                                                                                                       |
| `NOMAD_SECRETS_DIR`      | Path to the task's `secrets/` directory. See the [Runtime Task Directories documentation][taskdirs] for more information.                                                                                                                                                       |
| `NOMAD_MEMORY_LIMIT`     | Memory limit in MB for the task                                                                                                                                                                                                                                                 |
| `NOMAD_MEMORY_MAX_LIMIT` | The maximum memory limit the task may use if client has excess memory capacity, in MB. Omitted if task isn't configured with memory oversubscription.                                                                                                                           |
| `NOMAD_CPU_LIMIT`        | CPU limit in MHz for the task                                                                                                                                                                                                                                                   |
| `NOMAD_CPU_CORES`        | The specific CPU cores reserved for the task in cpuset list notation. Omitted if the task does not request CPU cores. For example, `0-2,7,12-14`                                                                                                                                |
| `NOMAD_ALLOC_ID`         | Allocation ID of the task                                                                                                                                                                                                                                                       |
| `NOMAD_SHORT_ALLOC_ID`   | The first 8 characters of the allocation ID of the task                                                                                                                                                                                                                         |
| `NOMAD_ALLOC_NAME`       | Allocation name of the task. This is derived from the job name, task group name, and allocation index.                                                                                                                                                                          |
| `NOMAD_ALLOC_INDEX`      | Allocation index; useful to distinguish instances of task groups. From 0 to (count - 1). For system jobs and sysbatch jobs, this value will always be 0. The index is unique within a given version of a job, but canaries or failed tasks in a deployment may reuse the index. |
| `NOMAD_TASK_NAME`        | Task's name                                                                                                                                                                                                                                                                     |
| `NOMAD_GROUP_NAME`       | Group's name                                                                                                                                                                                                                                                                    |
| `NOMAD_JOB_ID`           | Job's ID, which is equal to the Job name when submitted through the command-line tool but can be different when using the API                                                                                                                                                   |
| `NOMAD_JOB_NAME`         | Job's name                                                                                                                                                                                                                                                                      |
| `NOMAD_JOB_PARENT_ID`    | ID of the Job's parent if it has one                                                                                                                                                                                                                                            |
| `NOMAD_DC`               | Datacenter in which the allocation is running                                                                                                                                                                                                                                   |
| `NOMAD_PARENT_CGROUP`    | The parent cgroup used to contain task cgroups (Linux only)                                                                                                                                                                                                                     |
| `NOMAD_NAMESPACE`        | Namespace in which the allocation is running                                                                                                                                                                                                                                    |
| `NOMAD_REGION`           | Region in which the allocation is running                                                                                                                                                                                                                                       |
| `NOMAD_META_<key>`       | The metadata value given by `key` on the task's metadata. <br/> **Note:** this is different from [`${meta.<key>}`](/docs/runtime/interpolation#node-variables-) which are keys in the node's metadata.                                                                    |
| `VAULT_TOKEN`            | The task's Vault token. See the [Vault Integration][vault] documentation for more details                                                                                                                                                                                       |

### Network-related Variables

| Variable                           | Description                                                                                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOMAD_IP_<label>`                 | Host IP for the given port `label`. See the [`network` block documentation][network-block] for more information.                                                                                                                                        |
| `NOMAD_PORT_<label>`               | Port for the given port `label`. Driver-specified port when a port map is used, otherwise the host's static or dynamic port allocation. Services should bind to this port. See the [`network` block documentation][network-block] for more information. |
| `NOMAD_ADDR_<label>`               | Host `IP:Port` pair for the given port `label`.                                                                                                                                                                                                         |
| `NOMAD_HOST_PORT_<label>`          | Port on the host for the port `label`. See the [**Mapped Ports**](/docs/job-specification/network#mapped-ports) section of the `network` block documentation for more information.                                                                |
| `NOMAD_UPSTREAM_IP_<service>`      | IP for the given `service` when defined as a Consul service mesh [upstream][].                                                                                                                                                                          |
| `NOMAD_UPSTREAM_PORT_<service>`    | Port for the given `service` when defined as a Consul service mesh [upstream][].                                                                                                                                                                        |
| `NOMAD_UPSTREAM_ADDR_<service>`    | Host `IP:Port` for the given `service` when defined as a Consul service mesh [upstream][].                                                                                                                                                              |
| `NOMAD_ENVOY_ADMIN_ADDR_<service>` | Local address `127.0.0.2:Port` for the admin port of the envoy sidecar for the given `service` when defined as a Consul service mesh enabled service. Envoy runs inside the group network namespace unless configured for host networking.              |
| `NOMAD_ENVOY_READY_ADDR_<service>` | Local address `127.0.0.1:Port` for the ready port of the envoy sidecar for the given `service` when defined as a Consul service mesh enabled service. Envoy runs inside the group network namespace unless configured for host networking.              |

> [!NOTE]
> Norca replaces characters that are neither alphanumeric nor underscores in
> port labels or task names with underscores when generating environment variable
> names such as `NOMAD_ADDR_<task>_<label>`

### Consul-related Variables

> [!NOTE]
> These variables are only set for Consul service mesh native tasks.

| Variable                 | Description                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONSUL_HTTP_ADDR`       | Specifies the address to the local Consul agent. Will be automatically set to a unix domain socket in bridge networking mode, or a TCP address in host networking mode.                            |
| `CONSUL_HTTP_TOKEN`      | Specifies the Consul ACL token used to authorize with Consul. Will be automatically set to a generated Consul service identity token specific to the service instance if Consul ACLs are enabled.  |
| `CONSUL_HTTP_SSL`        | Specifies whether HTTPS should be used when communicating with Consul. Will be automatically set to true if Norca is configured to communicate with Consul using TLS.                              |
| `CONSUL_HTTP_SSL_VERIFY` | Specifies whether the HTTPS connection with Consul should be mutually verified. Will be automatically set to true if Norca is configured to verify TLS certificates.                               |
| `CONSUL_CACERT`          | Specifies the path to the CA certificate used for Consul communication. Will be automatically set if Norca is configured with the `consul.share_ssl` option.                                       |
| `CONSUL_CLIENT_CERT`     | Specifies the path to the Client certificate used for Consul communication. Will be automatically set if Norca is configured with the `consul.share_ssl` option.                                   |
| `CONSUL_CLIENT_KEY`      | Specifies the path to the Client Key certificate used for Consul communication. Will be automatically set if Norca is configured with the `consul.share_ssl` option.                               |
| `CONSUL_TLS_SERVER_NAME` | Specifies the server name to use as the SNI host for Consul communication. Will be automatically set if Consul is configured to use TLS and the task is in a group using bridge networking mode.   |

[upstream]: /docs/job-specification/upstreams/
[taskdirs]: /docs/runtime/environment#task-directories
[network-block]: /docs/job-specification/network/
[vault]: /docs/integrations/vault-integration/
