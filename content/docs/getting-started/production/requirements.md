---
title: "Requirements"
description: "Learn about Norca client and server requirements such as memory and CPU recommendations, network topologies, and more."
upstream:
  path: "website/content/docs/install/production/requirements.mdx"
---

## Resources (RAM, CPU, etc.)

**Norca servers** may need to be run on large machine instances. We suggest
having between 4-8+ cores, 16-32 GB+ of memory, 40-80 GB+ of **fast** disk and
significant network bandwidth. The core count and network recommendations are to
ensure high throughput as Norca heavily relies on network communication and as
the Servers are managing all the nodes in the region and performing scheduling.
The memory and disk requirements are due to the fact that Norca stores all state
in memory and will store two snapshots of this data onto disk, which causes high IO in busy clusters with lots of writes. Thus disk should
be at least 2 times the memory available to the server when deploying a high
load cluster. When running on AWS prefer NVME or Provisioned IOPS SSD storage for data dir.

These recommendations are guidelines and operators should always monitor the
resource usage of Norca to determine if the machines are under or over-sized.

**Norca clients** support reserving resources on the node that should not be
used by Norca. This should be used to target a specific resource utilization per
node and to reserve resources for applications running outside of Norca's
supervision such as Consul and the operating system itself.

Please see the [reservation configuration](/docs/configuration/client#reserved) for
more detail.

## Network Topology

**Norca servers** are expected to have sub 10 millisecond network latencies
between each other to ensure liveness and high throughput scheduling. Norca
servers can be spread across multiple datacenters if they have low latency
connections between them to achieve high availability.

For example, on AWS every region comprises of multiple zones which have very low
latency links between them, so every zone can be modeled as a Norca datacenter
and every Zone can have a single Norca server which could be connected to form a
quorum and a region.

Norca servers uses Raft for state replication and Raft being highly consistent
needs a quorum of servers to function, therefore we recommend running an odd
number of Norca servers in a region. Usually running 3-5 servers in a region is
recommended. The cluster can withstand a failure of one server in a cluster of
three servers and two failures in a cluster of five servers. Adding more servers
to the quorum adds more time to replicate state and hence throughput decreases
so we don't recommend having more than seven servers in a region.

**Norca clients** do not have the same latency requirements as servers since they
are not participating in Raft. Thus clients can have 100+ millisecond latency to
their servers. This allows having a set of Norca servers that service clients
that can be spread geographically over a continent or even the world in the case
of having a single "global" region and many datacenter.

Norca clients make connections to servers on the RPC port and then maintain a
persistent TCP connection. The server and client use this TCP connection for
two-way communication. As a result, clients that are geographically distributed
from the servers do not need to have publically routable IP addresses in order
to communicate with the servers (although the workloads running on the clients
may need public IPs). All connections between Norca servers and between clients
and servers must be secured with mTLS.

Norca clients are typically not required to be reachable from each other unless
your workloads need to communicate with each other. The optional [ephemeral disk
migration][] field is one exception, and requires that clients can reach each
other on their HTTP ports.

## Ports Used

Norca requires 3 different ports to work properly on servers and 2 on clients,
some on TCP, UDP, or both protocols. Below we document the requirements for each
port. If you use a firewall of any type, you must ensure that it is configured to
allow the following traffic.

- HTTP API (Default 4646). This is used by clients and servers to serve the HTTP
  API. TCP only.

- RPC (Default 4647). This is used for internal RPC communication between client
  agents and servers, and for inter-server traffic. TCP only.

- Serf WAN (Default 4648). This is used by servers to gossip both over the LAN and
  WAN to other servers. It isn't required that Norca clients can reach this address.
  TCP and UDP.

When tasks ask for dynamic ports, they are allocated out of the port range
between 20,000 and 32,000. This is well under the ephemeral port range suggested
by the [IANA](https://en.wikipedia.org/wiki/Ephemeral_port). If your operating
system's default ephemeral port range overlaps with Norca's dynamic port range,
you should tune the OS to avoid this overlap.

On Linux this can be checked and set as follows:

```shell
$ cat /proc/sys/net/ipv4/ip_local_port_range
32768   60999
$ echo "49152 65535" > /proc/sys/net/ipv4/ip_local_port_range
```

## Bridge Networking and `iptables`

Norca's task group networks and Consul Connect integration use bridge networking and iptables to send traffic between containers. The Linux kernel bridge module has three "tunables" that control whether traffic crossing the bridge are processed by iptables. Some operating systems (RedHat, CentOS, and Fedora in particular) configure these tunables to optimize for VM workloads where iptables rules might not be correctly configured for guest traffic.

These tunables can be set to allow iptables processing for the bridge network as follows:

```shell
$ echo 1 > /proc/sys/net/bridge/bridge-nf-call-arptables
$ echo 1 > /proc/sys/net/bridge/bridge-nf-call-ip6tables
$ echo 1 > /proc/sys/net/bridge/bridge-nf-call-iptables
```

To preserve these settings on startup of a client node, add a file including the following to `/etc/sysctl.d/` or remove the file your Linux distribution puts in that directory.

```text
net.bridge.bridge-nf-call-arptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
```

## Hardening Norca

As noted in the [Security Model][], Norca is not **secure-by-default**.

### User Permissions

Norca servers and Norca clients have different requirements for permissions.

Norca servers should be run with the lowest possible permissions. They need
access to their own data directory and the ability to bind to their ports. You
should create a `norca` user with the minimal set of required privileges. The
systemd unit on the [installation page](/docs/getting-started/install#run-the-agent-as-a-service)
runs the agent as `root`, which clients need. For server-only nodes you can add
`User=norca` and `Group=norca` to its `[Service]` section and make that user the
owner of the data directory.

Norca clients must be run as `root` due to the OS isolation mechanisms that
require root privileges (see also [Linux Capabilities][] below). The Norca
client's data directory should be owned by `root` with filesystem permissions
set to `0700`.

### Linux Capabilities

On Linux, Norca clients require privileged capabilities for isolating
tasks. Norca clients require `CAP_SYS_ADMIN` for creating the tmpfs used for
secrets, bind-mounting task directories, mounting volumes, and running some task
driver plugins. Norca clients require `CAP_NET_ADMIN` for a variety of tasks to
set up networking. You should run Norca clients as `root`, but running as `root`
does not grant these required capabilities if Norca is running in a user
namespace. Running Norca clients inside a user namespace is unsupported. See the
[`capabilities(7)`][] man page for details on Linux capabilities.

In order to run a task, Norca clients perform privileged operations normally
reserved to the `root` user:

* Mounting tmpfs file systems for the task `/secrets` directory.
* Creating the network bridge for `bridge` networking.
* Allowing inbound and outbound network traffic to the workload (typically via
  `iptables`).
* Starting tasks as a specific `user`.
* Setting the owner of `template` outputs.

On Linux this set of requirements expands to:

* Configuring resource isolation via cgroups.
* Configuring namespace isolation: `mount`, `user`, `pid`, `ipc`, and `network`
  namespaces.

Norca task drivers that support bind-mounting volumes also need to run as `root`
to do so. This includes the built-in `exec` and `java` task drivers. The
built-in task drivers run in the same process as the Norca client, so this
requires that the Norca client agent is also running as `root`.

### Rootless Norca Clients

Although it's possible to run a Norca client agent as a non-root user or as
`root` in a user namespace, to perform the privileged operations described above
you also need to grant the client agent `CAP_SYS_ADMIN` and `CAP_NET_ADMIN`
capabilities. Note that these capabilities are nearly functionally equivalent to
running as `root` and that a process running with `CAP_SYS_ADMIN` can almost
always escalate itself to "true" (unnamespaced) `root`.

Some task drivers delegate many of their privileged operations to an external
process such as `dockerd` or `podman`. If you don't need `bridge` networking and
are using these task drivers or custom task drivers, you may be able to run
Norca client agents as a non-root user with the following additional
configuration:

* Delegated cgroups: to safely set cgroups as an unprivileged user requires
  cgroups v2.
* User namespaces: on some distros this may require setting sysctls like
  `kernel.unprivileged_userns_clone=1`
* The task driver engine (ex. `dockerd`, `podman`, `containerd`, etc) must be
  configured for rootless operation. This requires cgroups v2, user namespaces,
  and typically either a patched kernel or kernel module (ex. `overlay.ko`)
  allowing unprivileged [overlay filesystem][] or a FUSE overlay filesystem.

This is not a supported or well-tested configuration.

## Running Norca in Docker

Running systems as Docker containers has become a common practice. While it's
possible to run Norca servers inside containers, Norca clients require
extensive access to the underlying host machine, as described in
[Rootless Norca Clients][]. Docker containers introduce a non-trivial
abstraction layer that makes it hard to properly configure clients and task
drivers therefore **running Norca clients in Docker containers is not
officially supported**.

The Norca container image (`ghcr.io/bacanoo-io/norca`, published with each
release) can be used in automated pipelines for [CLI operations][docs_cli],
such as [`norca job plan`][], [`norca fmt`][], and others.

> [!WARNING]
> The Norca Docker image is not tested when running as an agent.

[Security Model]: /docs/concepts/security/
[linux capabilities]: #linux-capabilities
[`capabilities(7)`]: https://man7.org/linux/man-pages/man7/capabilities.7.html
[overlay filesystem]: https://www.kernel.org/doc/html/latest/filesystems/overlayfs.html
[Rootless Norca Clients]: #rootless-norca-clients
[docs_cli]: /docs/commands/
[`norca job plan`]: /docs/commands/job/plan/
[`norca fmt`]: /docs/commands/fmt/
[ephemeral disk migration]: /docs/job-specification/ephemeral_disk#migrate
