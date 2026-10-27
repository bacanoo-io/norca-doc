---
title: "Runtime Environment"
linkTitle: "Environment"
description: "Learn how to configure the Norca runtime environment."
upstream:
  path: "website/content/docs/runtime/environment.mdx"
---

Some settings you specify in your [job specification][jobspec] are passed
to tasks when they start. Other settings are dynamically allocated when your job
is scheduled. Both types of values are made available to your job through
environment variables.

## Summary

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

## Task Identifiers

Norca will pass both the allocation ID and name, the deployment ID that created
the allocation, the job ID and name, the parent job ID as well as
the task and group's names. These are given as `NOMAD_ALLOC_ID`, `NOMAD_ALLOC_NAME`,
`NOMAD_ALLOC_INDEX`, `NOMAD_JOB_NAME`, `NOMAD_JOB_ID`,
`NOMAD_JOB_PARENT_ID`, `NOMAD_GROUP_NAME` and `NOMAD_TASK_NAME`. The allocation ID
and index can be useful when the task being run needs a unique identifier or to
know its instance count.

## Resources

When you request resources for a job, Norca creates a resource offer. The final
resources for your job are not determined until it is scheduled. Norca will
tell you which resources have been allocated after evaluation and placement.

### CPU and Memory

Norca will pass CPU and memory limits to your job as `NOMAD_CPU_LIMIT`,
`NOMAD_MEMORY_LIMIT`, and `NOMAD_MEMORY_MAX_LIMIT`. Your task should use these
values to adapt its behavior to fit inside the resource allocation that Norca
provides. For example, you can use the memory limit to inform how large your
in-process cache should be, or to decide when to flush buffers to disk.

Both CPU and memory are presented as integers. The unit for CPU limit is
`1024 = 1GHz`. The unit for memory is `1 = 1 megabyte`.

Writing your applications to adjust to these values at runtime provides greater
scheduling flexibility since you can adjust the resource allocations in your
job specification without needing to change your code. You can also schedule workloads
that accept dynamic resource allocations so they can scale up or down as your
cluster gets more or less busy.

### Networking

Norca assigns IP addresses and ports to your jobs and exposes them via environment
variables. See the [Networking](/docs/job-specification/network/) page for more
details.

### Task Directories

Norca creates a working directory for each allocation on a client. The
allocation working directory contains a task working directory for each task
in the allocation.

Norca makes the following directories available to tasks, relative to the task
working directory:

- `alloc/`: This directory is shared across all tasks in a task group and can be
  used to store data that needs to be used by multiple tasks, such as a log
  shipper.
- `local/`: This directory is private to each task. It can be used to store
  arbitrary data that should not be shared by tasks in the task group.
- `secrets/`: This directory is private to each task, not accessible via the
  `norca alloc fs` command or filesystem APIs. Where possible it is backed by an
  in-memory filesystem and mounted `noexec`. It can be used to store secret data
  that should not be visible outside the task.

These directories are persisted until the allocation is removed, which occurs
hours after all the tasks in the task group enter terminal states. This gives
time to view the data produced by tasks.

Depending on the driver and operating system being targeted, the directories
are made available in various ways. For example, on `docker` the directories
are bound to the container, while on `exec` on Linux the chroot is built in
the task working directory, and the directories are mounted into that
chroot. Regardless of how the directories are made available, the path to the
directories can be read through the `NOMAD_ALLOC_DIR`, `NOMAD_TASK_DIR`, and
`NOMAD_SECRETS_DIR` environment variables.

For more details on the task directories, see the [Filesystem internals][].

## Meta

The job specification also allows you to specify a `meta` block to supply arbitrary
configuration to a task. This allows you to easily provide job-specific
configuration even if you use the same executable unit in multiple jobs. These
key-value pairs are passed through to the job as `NOMAD_META_<key>=<value>`
environment variables. Prior to Nomad 0.5.5 the key was uppercased and since
then both the original case and an uppercased version are injected. The
uppercased version will be deprecated in a future release.

Currently there is no enforcement that the meta keys be lowercase, but using
multiple keys with the same uppercased representation will lead to undefined
behavior.

## Host environment variables

Norca passes the environment variables defined in the client host to tasks when
using the `exec`, `raw_exec`, and `java` task drivers. The variables that are
passed to the tasks can be controlled using the client configuration
[`env.denylist`][].

[jobspec]: /docs/job-specification/ 'Norca Job Specification'
[filesystem internals]: /docs/concepts/filesystem/
[`env.denylist`]: /docs/configuration/client#env-denylist
