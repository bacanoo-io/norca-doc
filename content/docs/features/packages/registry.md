---
title: "The Norca registry"
linkTitle: "Norca registry"
weight: 7
description: "The public module registry of Norca (bacanoo-io/norca-registry): the operations modules of a Norca cluster, how Rigger installs them, and what each module deploys."
---

The [Norca registry](https://github.com/bacanoo-io/norca-registry) is the public registry of the
**modules** of [Rigger](/docs/features/packages), the package manager of Norca: the operations modules
that install the infrastructure around a Norca cluster (NATS, the cross-region mTLS gateway, the backup
store, the git server and image registry, PostgreSQL, observability with OpenObserve and the
OpenTelemetry Collector, the edge router, optional Consul) and the operator modules. The
[global registry](https://github.com/bacanoo-io/norca-global-registry) of Rigger lists their versions
as `norca/<module>`. A module holds object kinds, ACL and admission policies next to its jobs, and
`validation` blocks and rules for its variables, which also build its install form in the
[catalog of the web UI](/docs/features/packages/rigger-catalog). See
[modules and stacks](/docs/features/packages/modules) for the files and the language of a module.

The modules and the documentation of the registry are licensed under the Mozilla Public License 2.0.
The software the modules install keeps its own license. The modules **reference** that software
(images, release archives) by name, tag and optionally digest; **they never include it, and the
registry distributes none of it.** Consul in particular is BSL 1.1, Forgejo GPL-3.0-or-later and
OpenObserve AGPL-3.0.

## Installing a module

Rigger installs a module as a [release](/docs/features/packages/releases). **The servers install a
module of the global registry by its name**, from the registry as they last synced it. Nothing syncs
on its own: sync the global registry once in every region, then send the install to the servers:

```shell
norca rigger registry sync global
norca operator api -X PUT /v1/rigger/install <<'EOF'
{"Release": "rustfs", "Registry": "global", "Module": "norca/rustfs", "Version": "~> 0.2",
 "ValuesJSON": {"buckets": ["norca-backup"], "console_enabled": true}}
EOF
norca rigger release status rustfs
```

- `Version` is a version constraint: `~> 0.2` takes the newest 0.2.x of the last sync.
- `ValuesJSON` holds the values of the module's variables. **A value has the JSON type of its
  variable**: a number as a number, a list as a list, a bool as a bool.
- The release is in the namespace and the region of the request: `-namespace <ns>` and
  `-region <region>` of `norca operator api`. **A module has no `namespace` variable**: its jobs are
  in the namespace of the release.
- The servers fetch the version from its repository and refuse it unless it has the tree digest the
  global registry lists and a signature by a key of its namespace.
- The request waits until the release is ready. **The same request with other values upgrades the
  release.**

See the [install API](/docs/api/rigger-install) for the request and its answer.

[`norca rigger install`](/docs/commands/rigger/install) installs the same module by its name. With
`-server` the servers fetch it from their last sync, as the request above does; without it the
program fetches and verifies it itself:

```shell
norca rigger install norca/rustfs -version "~> 0.2" -name rustfs -f rustfs.hcl -server
```

**From a checkout** of the registry, a module installs by its path, without the global registry:

```shell
git clone https://github.com/bacanoo-io/norca-registry
norca rigger install ./norca-registry/modules/rustfs -name rustfs -f rustfs.hcl
```

`-name` is the name of the release, `-namespace` and `-region` choose where it is, `-f` gives a file
of values and `-var name=value` one value (`-var 'buckets=["norca-backup"]'`).

**In a stack**, a module of the global registry is named by its source, and Rigger installs the
modules of the stack as releases:

```hcl
# stack.hcl
rigger {
  name = "operations"
}

module "rustfs" {
  source  = "norca/rustfs"
  version = "~> 0.2"

  values = {
    buckets         = ["norca-backup"]
    console_enabled = true
  }
}
```

```shell
norca rigger stack sync .     # resolve the versions, fetch and verify the modules, write rigger.lock.hcl
norca rigger stack plan .     # what an apply would change
norca rigger stack apply .    # install or upgrade, release after release
```

**From the web UI**: **Packages → Catalog**, registry `global`, `norca/<module>`, **Install**. The
form is built from the variables of the module. The registry `global` shows only the modules selected
for it until *The whole index* is switched on; see the
[Rigger catalog](/docs/features/packages/rigger-catalog).

**Check the values without a cluster** before an install: `module render` checks them against the
`validation` blocks and the rules of the module and prints its resources as JSON, and
`module validate` checks the files of a module and renders its example values.

```shell
norca rigger module render ./norca-registry/modules/rustfs -f rustfs.hcl
norca rigger module validate ./norca-registry/modules/rustfs
```

**The releases** are listed and managed one by one:

```shell
norca rigger release list
norca rigger release status rustfs
norca rigger release history rustfs
norca rigger release rollback rustfs
norca rigger release uninstall rustfs
```

Each takes `-namespace <ns>` for a release outside `default`.

Example values of a module are in its `examples/` directory (`modules/<module>/examples/*.vars.hcl`);
the [deployment examples](/docs/getting-started/examples) use the modules of this registry.

## Modules

| Module | Version | What it deploys |
| --- | --- | --- |
| [consul](#consul) | 0.2.1 | The official HashiCorp Consul release (BSL 1.1, referenced, never shipped; accepted by the user at install): servers on host volumes over datacenters, client agents, gossip/TLS/ACL bootstrap from Variables, optional snapshots to S3, optional agent metrics |
| [forgejo](#forgejo) | 0.2.1 | Forgejo (GPL-3.0-or-later, referenced, never shipped) as the internal git server and container registry: SQLite and repositories on a host volume, packages and LFS in RustFS, secrets from the built-in secret store, optional HTTPS, SSH, initial admin and periodic dumps; optional `/metrics` |
| [loadbalancer-operator](#loadbalancer-operator) | 0.5.1 | The LoadBalancer operator as an operator module: object kind (webhooks, limits), the LoadBalancerClass kind, ACL policy bound to the controller job, admission policy, controller job |
| [mtls-gateway](#mtls-gateway) | 0.2.2 | The cross-region native mTLS gateway of a region (`mtls { mode = "gateway" }`): SNI passthrough Envoy on the gateway nodes, injected by the servers or defined by the module; optional Envoy statistics |
| [nats](#nats) | 2.0.1 | A NATS cluster per region for the applications (JetStream, supercluster gateways, TLS and auth from Variables, or users in accounts with subject permissions and passwords from the built-in secret store), optional Prometheus exporter |
| [nats-demo](https://github.com/bacanoo-io/norca-registry/blob/main/modules/nats-demo/README.md) | 1.0.0 | A demonstration of the language of the modules: a NATS cluster per region in a smaller shape (JetStream, users in accounts, TLS, optionally the changes of the Norca region as a leaf node of the system bus) |
| [nodescaler-operator](https://github.com/bacanoo-io/norca-registry/blob/main/modules/nodescaler-operator/README.md) | 0.11.1 | The node scaling operator of Norca (`norca-nodescaler` of norca-platform) as one release: the ACL policy bound to its job and the job, two instances on different nodes, never on a node the operator created; the kinds NodeGroup and NodeProvider are registered by the core (Norca 0.3.0) |
| [norca-acme](#norca-acme) | 0.3.1 | The ACME operator (`norca-acme` of norca-platform) as a job: the controller of the certificate issuers that sign through an ACME certificate authority such as Let's Encrypt; it fulfils the certificate orders of the servers, answers the HTTP-01 challenge behind the traefik module and proves names in the DNS zones of norca-provider; ACL policy bound to the job (Norca 0.3.0) |
| [norca-dns](#norca-dns) | 0.3.1 | The DNS records operator (`norca-dns` of norca-platform) as a job: the `norca.io/DNSRecord` object kind and the controller that keeps their record sets (A, AAAA, CNAME, TXT; values given or from a LoadBalancer object) in the zones of norca-provider that allow records, under the allow list of each namespace; ACL policy bound to the job (Norca 0.3.0) |
| [norca-provider](#norca-provider) | 0.5.1 | `norca-provider` of norca-platform as a job: the node providers, load balancer classes and DNS zones of its configuration, registered as NodeProvider, LoadBalancerClass and DNSZone objects, with its ACL policy and a `/healthz` check; the DNSZone object kind (Norca 0.3.0) |
| [openobserve](#openobserve) | 0.2.2 | OpenObserve (AGPL-3.0, referenced, never shipped) as the observability backend (logs, metrics, traces): single node on a host volume or a cluster of node roles on PostgreSQL, NATS and RustFS, TLS with Norca's workload certificates, root user and the ingest credentials of the collectors in the built-in secret store |
| [otel-collector](#otel-collector) | 0.1.3 | The OpenTelemetry Collector (contrib, Apache-2.0) on every node: host and Norca agent metrics, the NATS, Forgejo, mTLS gateway, Consul and PostgreSQL metrics found through the native catalog, an OTLP receiver for the applications, export to OpenObserve trusting Norca's CA |
| [postgres](#postgres) | 0.4.1 | A single PostgreSQL server (PostgreSQL License, referenced, never shipped): data on a host volume, superuser, application databases and a `pg_monitor` role from the built-in secret store, optional TLS with Norca's workload certificates, optional periodic dumps to S3 |
| [postgres-demo](https://github.com/bacanoo-io/norca-registry/blob/main/modules/postgres-demo/README.md) | 0.3.1 | A demonstration of the language of the modules: a single PostgreSQL server, application databases created by a hook job, credentials from the secret store, optional periodic dumps to an S3 store |
| [redis](https://github.com/bacanoo-io/norca-registry/blob/main/modules/redis/README.md) | 0.4.2 | One Redis server (the official image, referenced, not shipped): a service in the catalog, a password from a Norca Variable that the server requires, optional persistence on a host volume; no replication and no failover |
| [rustfs](#rustfs) | 0.2.1 | RustFS (Apache-2.0) as the S3 store of the Norca backups: single node or distributed, credentials from the built-in secret store, host volumes, health check roles, optional bucket creation, optional OTLP metrics |
| [seaweedfs](https://github.com/bacanoo-io/norca-registry/blob/main/modules/seaweedfs/README.md) | 0.1.1 | A single SeaweedFS server (Apache-2.0, release archive referenced, never shipped): master, volume server and filer in one process with `raw_exec`, data in a directory of the node, in the native catalog; the storage of the `seaweedfs-csi` module |
| [seaweedfs-csi](https://github.com/bacanoo-io/norca-registry/blob/main/modules/seaweedfs-csi/README.md) | 0.1.1 | The SeaweedFS CSI driver (Apache-2.0, binaries referenced, never shipped) on every node with `raw_exec`: the mount service and the driver as a monolith CSI plugin with volume statistics and conditions, the filer found in the native catalog (Norca 0.3.0) |
| [traefik](#traefik) | 0.3.2 | Traefik Proxy (MIT, the official image) as the edge router of a region: entrypoints for HTTP, HTTPS, TCP and UDP edited as a table in the install form, certificates from the built-in secret store applied without a restart, routes from the tags of the native catalog and static configuration; examples for web, WebSocket, gRPC and TCP (Norca 0.3.0) |

The *Version* column shows the newest version of each module (`module { version }` in its
`metadata.hcl`). The modules without a section here are described in their README in the registry.
`lib/placement` (1.1.0) is a library the other modules call for the placement of a job and the
reference of an image; it can't be installed on its own. A module states the Norca version and the
server features it needs in the `requires` block of its `metadata.hcl`
([requirements](/docs/features/packages/releases#requirements)).

Each module's README in the registry (`modules/<module>/README.md`) describes it completely: what it
deploys, prerequisites, secrets, all variables, health checks, metrics and limitations. The sections
below summarize them.

### Operator modules

loadbalancer-operator, nodescaler-operator, norca-acme, norca-dns and norca-provider run their jobs
with ACL policies bound to them. Their jobs, the ACL policies bound to them and, by default, their
token Variables and secrets are in the namespace of the release: **install them with
`-namespace norca-system`**. The modules expect the namespace and don't create it, as a namespace
that a release installs belongs to that release: create it once and give rights in it to the
operators of the cluster only.

```shell
norca namespace apply -description "Norca operators" norca-system
```

**Their jobs keep off nodes with the `raw_exec` driver**, because a `raw_exec` task on a node can read
the secrets of every allocation there ([`raw_exec` isolation](/docs/drivers/raw_exec#resource-isolation)):
they carry a constraint that `${attr.driver.raw_exec}` is not set, their default `driver` is `exec`
(the binary below `/usr`, inside the chroot of `exec`), and `driver = "raw_exec"` is refused by the
rule `raw_exec` of the module. The variable `allow_raw_exec_nodes = true` drops the constraint and
allows `raw_exec`; set it only where every token that may place `raw_exec` work or use
`alloc-node-exec` on those nodes may hold the operators' policies anyway (a lab, a single-tenant
cluster). The docker platform of norca-provider, which calls the docker CLI of its host, needs it.
The constraint counts when an allocation is placed: enabling `raw_exec` on a node later doesn't move
an operator away.

## consul

Installs and manages the **official, current HashiCorp Consul release**: the Consul servers as a
service job, a Consul client agent on every other node as a system job, and optionally a periodic
snapshot job. It is meant for what still needs a real Consul (Consul Connect with L7 features,
sessions and locks, the full KV, prepared queries, config entries). Service discovery, DNS, the
Consul-compatible read layer and external services do **not** need it; see
[Consul module](/docs/features/service-discovery/consul-module).

> [!CAUTION]
> Consul is licensed by HashiCorp under the **Business Source License 1.1 (BSL 1.1)**, not under an
> open source license. Norca does not distribute, include, vendor or modify Consul. The module only
> references the official image or release archive; the nodes pull it. The module does not render
> until you set `consul_license_accepted = true`, confirming that you have read the Consul license and
> that your use is permitted.

The bootstrap needs no manual steps: a prestart task generates the gossip key, the CA, the server
certificates and the ACL tokens on the first start and stores them in Norca Variables. ACLs
(default deny) and gossip encryption are always on, TLS is on by default (`tls_enabled`).

| Variable | Default | |
| --- | --- | --- |
| `consul_license_accepted` | required | must be `true` (BSL 1.1) |
| `consul_version` | `2.1.0` | provisional; pin your validated release |
| `server_count` | `3` | 3 or 5 (1 for development) |
| `driver` | `docker` | `docker`, `exec`, `raw_exec` |
| `image_registry`, `image_digest` | `docker.io`, `""` | internal mirror, pinning |
| `server_node_meta`, `datacenter_attribute` | `consul_server`, `${node.datacenter}` | placement |
| `host_network` | `""` | private network (VPN) interface |
| `clients_enabled`, `snapshot_enabled` | `true`, `false` | client system job, snapshot job |
| `metrics_enabled` | `false` | agent metrics for the otel-collector module |

```shell
norca operator api -X PUT /v1/rigger/install <<'EOF'
{"Release": "consul", "Registry": "global", "Module": "norca/consul", "Version": "~> 0.2",
 "ValuesJSON": {"consul_license_accepted": true}}
EOF
```

Server nodes need the node meta `consul_server = "true"`, one datacenter each (one per
availability zone) and the host volume `consul-server`; with Norca ACLs, the bootstrap task needs the
ACL policy that the output `notes` of the module holds (`norca rigger module render` prints the
outputs).

## forgejo

[Forgejo](https://forgejo.org) as the internal **git server** and **container (OCI) registry**: one
instance with SQLite and the git repositories on a client host volume; container images, LFS
objects, attachments and avatars in the RustFS of the [rustfs](#rustfs) module (any S3 store works);
its keys, the admin password, the S3 credentials and the TLS certificate from Norca's
[built-in secret store](/docs/features/secrets); health checks with roles; optional HTTPS, SSH, initial
admin and periodic dumps. The nodes can then pull internal images from Forgejo with one Docker auth
file per client.

Forgejo is licensed under the **GNU GPL v3.0 or later**. The module only references the official
image (`codeberg.org/forgejo/forgejo:15.0.10-rootless`, the v15 LTS line); Norca does not ship it.

| Variable | Default | |
| --- | --- | --- |
| `image`, `image_digest` | `codeberg.org/forgejo/forgejo:15.0.10-rootless`, `""` | |
| `host_volume` | `forgejo` | mounted at `/var/lib/gitea` |
| `domain` | `forgejo.internal` | `DOMAIN`, `SSH_DOMAIN`, the registry host |
| `https_enabled`, `tls_secret_path` | `false`, `forgejo/tls` | Forgejo's own HTTPS |
| `ssh_enabled`, `ssh_port` | `true`, `2222` | git over SSH (built-in server) |
| `keys_secret_path`, `admin_secret_path` | `forgejo/keys`, `forgejo/admin` | secrets |
| `storage_enabled`, `storage_service`, `storage_bucket` | `true`, `rustfs`, `forgejo` | objects in S3 |
| `dump_enabled`, `dump_cron` | `false`, `0 3 * * *` | the dump job |
| `metrics_enabled` | `false` | `/metrics` for the otel-collector module |

```shell
norca secret put forgejo/admin password=-
norca rigger install ./norca-registry/modules/forgejo -name forgejo -f forgejo.hcl
```

Git repositories need a POSIX file system, so Forgejo runs as one instance on the one node with the
host volume `forgejo`.

## loadbalancer-operator

The LoadBalancer operator of Norca (`norca-loadbalancer`, built on the controller SDK) packaged as an
**operator module**: one release installs, upgrades, rolls back and uninstalls everything the operator
needs (see the [operator framework](/docs/features/operator-framework)).

| File | Resource |
| --- | --- |
| `controller.acl.hcl` | ACL policy bound to the controller job |
| `load-balancer.kind.hcl` | Object kind `norca.io/LoadBalancer`: JSON Schema with defaults, a CEL transition rule, display columns, optional webhooks, limits (`loadbalancer_kind_enabled`) |
| `load-balancer-class.kind.hcl` | Object kind `norca.io/LoadBalancerClass`: the classes the providers register, with their heartbeat (`class_kind_enabled`) |
| `service-marks.admission.hcl` | Admission policy: services marked with `norca_lb_port` must name a valid port (optional) |
| `controller.norca.hcl` | The controller job (two instances with leader election) and the optional webhook task |

Key variables: `watch_namespace`, `count`, `driver` and `binary` or `image` (the controller),
`allow_raw_exec_nodes`, `proxy_driver` (`exec` by default, like the controller), `acl_policy_enabled`
(set `false` on agents without ACLs), `admission_policy_enabled`, `webhook_enabled`, `webhook_url`,
`classes`, `default_class`, `webhook_failure_policy`, and the limits `write_rate`, `identity_write_rate`,
`max_objects_per_namespace`, `max_watches_per_identity`.

**Namespaces.** The controller job runs in the namespace of the release, `norca-system` for the
[operator modules](#operator-modules), with its leader election leases and, by default, the token
Variables of the classes (`class_token_namespace`). `watch_namespace` names the namespace of the
`LoadBalancer` objects apart from the namespace of the job: a namespace (`default` by default), `*`
for every namespace, or empty for the namespace of the job. The job stays in a namespace where only
operators write, outside the quota of the teams it serves; the ACL policy gives the controller its
job, Variable and object rights in the watched namespaces.
A second release for another namespace or region sets `loadbalancer_kind_enabled = false` and
`class_kind_enabled = false`: the kinds belong to the release that installed them first.

```shell
norca namespace apply -description "Norca operators" norca-system
norca operator api -namespace norca-system -X PUT /v1/rigger/install <<'EOF'
{"Release": "lb", "Registry": "global", "Module": "norca/loadbalancer-operator", "Version": "~> 0.5",
 "ValuesJSON": {"watch_namespace": "apps"}}
EOF
norca rigger release status lb -namespace norca-system
norca rigger release uninstall lb -namespace norca-system
```

The controller binary (`norca-loadbalancer`) is built from the repository `norca-platform`
(`go build ./cmd/norca-loadbalancer`) and installed on the nodes. The classes other than `nomad` are
served by providers such as `norca-provider` (the [norca-provider](#norca-provider) module). A token
with less than management rights needs `operator`, `acl` and `admission` write permissions; applying
a release grants no extra permissions.

## mtls-gateway

The cross-region gateway of Norca's [native mTLS](/docs/features/native-mtls): a group with a service
in `gateway` mode (`mtls { mode = "gateway" }`), run in the `default` namespace of every region that
offers services to other regions. The gateway reads the SNI name of each TLS connection and forwards
it, without terminating it, to a healthy instance of the destination service of its region; mTLS stays
end to end between the sidecars. By default the servers inject the Envoy task; with
`envoy_task_enabled = true` the module defines it. Norca does not distribute Envoy; the nodes pull the
official image.

| Variable | Default | |
| --- | --- | --- |
| `job_type` | `system` | `system`: a gateway on every eligible node; `service`: `count` gateways |
| `service_name` | `mtls-gateway` | the name upstreams look for by default |
| `port`, `host_network` | `8443`, `""` | static port on the nodes, bound to a host network |
| `network_mode` | `bridge` | `bridge` or `host` |
| `envoy_task_enabled`, `envoy_image` | `false`, `""` | the module defines the Envoy task |
| `metrics_enabled` | `false` | `/stats/prometheus` of the Envoy task defined by the module |

There is no install into several regions at once: each region syncs the registry and gets its own
release. **The job is always in the `default` namespace**, whatever the namespace of the release:
upstreams of other regions look for gateways only there.

```shell
norca rigger registry sync global -region eu-1
norca operator api -region eu-1 -X PUT /v1/rigger/install <<'EOF'
{"Release": "mtls-gateway", "Registry": "global", "Module": "norca/mtls-gateway", "Version": "~> 0.2"}
EOF
norca rigger registry sync global -region eu-2
norca operator api -region eu-2 -X PUT /v1/rigger/install <<'EOF'
{"Release": "mtls-gateway", "Registry": "global", "Module": "norca/mtls-gateway", "Version": "~> 0.2"}
EOF
```

A sidecar upstream then reaches a service of another region through the gateway of that region
(the label of the `upstream` block is required):

```hcl
mtls {
  mode = "sidecar"

  upstream "api" {
    service    = "api"
    region     = "eu-2"
    local_port = 9090
  }
}
```

It needs native mTLS with federated trust on the servers of every region and network reachability
of the gateway port between the regions. See
[sidecar and gateway](/docs/features/native-mtls/sidecar-and-gateway).

## nats

A NATS cluster for the applications of one Norca region (the events of Norca are on the
[system bus](/docs/features/system-bus) of the servers). Deployed once per region, the gateways join the
regional clusters into a NATS supercluster, JetStream keeps durable streams, and leaf nodes can attach
edge sites. The job uses Norca's health check roles, a `disruption` block (one server at a time) and
lame duck shutdown. NATS is Apache-2.0; the module references the official `nats` image.

| Variable | Default | |
| --- | --- | --- |
| `count` | `3` | servers in the region (odd, at least 3 for JetStream) |
| `driver` | `docker` | `docker`, `raw_exec`, `exec` |
| `gateway_enabled`, `remote_gateways` | `false`, `[]` | supercluster |
| `host_network` | `""` | bind the ports to, for example, the VPN interface |
| `storage` | `ephemeral_disk` | `ephemeral_disk`, `host_volume`, `path` |
| `tls_enabled`, `auth_mode` | `false`, `none` | `auth_mode`: `none`, `token`, `nkey`, `config`, `userpass` |
| `users` | `[]` | `auth_mode = "userpass"`: users, accounts, permissions; passwords from the secret store |
| `metrics_enabled` | `false` | the Prometheus exporter |
| `norca_bus_leaf`, `norca_bus_servers` | `false`, `[]` | receive the changes of the region as a leaf node of the system bus |

```shell
norca operator api -X PUT /v1/rigger/install <<'EOF'
{"Release": "nats", "Registry": "global", "Module": "norca/nats", "Version": "~> 2.0",
 "ValuesJSON": {"count": 3, "metrics_enabled": true}}
EOF
```

With `norca_bus_leaf = true` the servers attach to the system bus of the Norca
servers (`norca_bus_servers`, the leaf node listeners on port 4652) as leaf nodes and receive the
[changes of the region](/docs/features/change-data-capture#through-a-leaf-node), one way. The token
(a `cdc` rule with `leaf = true`) and the CA of the Norca servers are the items `token` and `ca` of
the secret `norca/bus/leaf` (`norca_bus_secret`) in the built-in secret store.

TLS material and tokens come from a Variable (default `nomad/jobs/<job>`; the job is named after the
release unless `job_name` is set), user passwords from the built-in secret store
(`nats/users/<name>`); **never from the variables of the module.** With `auth_mode = "token"`
the item `client_token` holds the token (plain or a bcrypt hash of `nats server passwd`; any
characters, quoted for the NATS configuration parser).

## norca-acme

`norca-acme`, the ACME operator of the repository `norca-platform`, as a job: the controller of the
`norca.io/CertificateIssuer` objects that sign through an ACME certificate authority. The release
holds the job (one instance, or several on different nodes with leader election: `count`,
`leader_election`) with a service that answers the HTTP-01 challenge and carries the router
of the challenge path as catalog tags for the [traefik](#traefik) module, and an ACL policy bound to
the job: `read` and `write-status` on the issuers and the orders, `read` on the DNS zones, the
secrets of the operator below `secret_prefix`, the token Variables of the DNS zones. See
[Certificates from ACME](/docs/features/certificates-acme) for the issuer and the challenges, and
the [README of the module](https://github.com/bacanoo-io/norca-registry/blob/main/modules/norca-acme/README.md)
for its variables.

## norca-dns

`norca-dns`, the DNS records operator of the repository `norca-platform`, as a job: the controller of
the `norca.io/DNSRecord` objects, whose kind the module registers (`record_kind_enabled`). The release
holds the job (one instance, or several on different nodes with leader election: `count`,
`leader_election`) and an ACL policy bound to it: `read`, `write-status`, `write-events`
and `manage-finalizers` on the records, `read` on the load balancers and the DNS zones, `read-job`
for the metadata of the namespaces (their allow lists), the token Variables of the DNS zones. It
writes only zones of [norca-provider](#norca-provider) 0.4.0 or later that say `"records": true`.
See [DNS records](/docs/features/dns-records) for the records, and the
[README of the module](https://github.com/bacanoo-io/norca-registry/blob/main/modules/norca-dns/README.md)
for its variables.

## norca-provider

`norca-provider`, the provider application of the repository `norca-platform`, as a job: it serves
the [load balancer classes](/docs/features/operator-framework/loadbalancer-providers) of the
LoadBalancer operator and the [node providers](/docs/features/node-scaling/writing-a-provider) of the
node scaling operator named in its configuration, on one HTTP server, and registers them
(`norca.io/LoadBalancerClass` and `norca.io/NodeProvider` objects with a heartbeat). The release holds
the job (one instance on a static port, its configuration file rendered from the
variables, a service check on `/healthz`) and an ACL policy bound to the job that may read, write
and write the status of the kinds it registers and nothing else. The token of each provider is in
two Variables that you write: the Variable of the job for the provider, and the Variable its
`token_variable` names for the operators. The kind `norca.io/NodeProvider` is registered by the
core and `norca.io/LoadBalancerClass` by the [loadbalancer-operator](#loadbalancer-operator) module
(`class_kind_enabled`). See the
[README of the module](https://github.com/bacanoo-io/norca-registry/blob/main/modules/norca-provider/README.md)
for its variables.

A provider with a `dns` section also serves **DNS zones**: a `norca.io/DNSZone` object per zone,
whose kind the module registers (`zone_kind_enabled`), for the DNS-01 challenge of
[Certificates from ACME](/docs/features/certificates-acme). Only the challenge records of a zone can
be written through it, unless the zone says `"records": true`: then [norca-dns](#norca-dns) writes
its record sets too.

## openobserve

[OpenObserve](https://openobserve.ai) as the observability backend (logs, metrics, traces) of a Norca
cluster: in **single mode** one instance with every role, SQLite metadata and the data on a host
volume; in **cluster mode** a task group per node role (router, ingester, querier, compactor,
alertmanager) with PostgreSQL metadata (the [postgres](#postgres) module), [NATS](#nats) as the cluster
coordinator and the data in S3 ([rustfs](#rustfs)). TLS uses Norca's workload certificates; a
bootstrap task creates the organizations and a service account for the collectors and stores its
token in the secret store for the [otel-collector](#otel-collector) module.

OpenObserve (open source edition) is licensed under the **GNU AGPL v3.0**. The module only references
the official image (`docker.io/openobserve/openobserve:v1.0.4`); Norca does not ship it.

| Variable | Default | |
| --- | --- | --- |
| `mode` | `single` | `single` or `cluster` |
| `http_port`, `grpc_port` | `5080`, `5081` | static ports of the instance or the routers |
| `host_volume` | `openobserve` | single mode |
| `postgres_service`, `nats_service`, `s3_service` | `postgres`, `nats`, `rustfs` | cluster mode backends from the native catalog |
| `tls_mode` | `mtls` | `mtls`, `secret`, `none` |
| `root_secret_path`, `ingest_secret_path` | `openobserve/root`, `openobserve/ingest` | secrets |
| `acl_policy_enabled` | `true` | the ACL policy bound to the job |
| `telemetry_enabled` | `false` | OpenObserve's usage reporting to its vendor |

```shell
norca secret put -namespace observability openobserve/root password=-
norca operator api -namespace observability -X PUT /v1/rigger/install <<'EOF'
{"Release": "openobserve", "Registry": "global", "Module": "norca/openobserve", "Version": "~> 0.2"}
EOF
```

OpenObserve reads its certificate only at start. Its mtls services set
[`change_mode = "restart"`](/docs/features/native-mtls/app-mode#reacting-to-renewals): the client
restarts an instance only after its certificate was renewed or a new CA joined the trust bundle,
once per change (coalesced, with a splay of a few seconds) and without counting against the restart
policy; there are no periodic restarts. Each restart is a short interruption of that instance; after
a CA rotation all instances restart within seconds.

## otel-collector

The [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/) (contrib distribution,
Apache-2.0) on every node as a system job, shipping to [OpenObserve](#openobserve): metrics of the
host, the Norca agent and the NATS, Forgejo, mTLS gateway, Consul and PostgreSQL instances of the
node, found through the native catalog; an OTLP receiver on every node (gRPC 4317, HTTP 4318) for the
applications; export over OTLP/HTTP with the ingest credentials of the secret store, over TLS that
trusts Norca's CA.

| Variable | Default | |
| --- | --- | --- |
| `image`, `image_digest` | `docker.io/otel/opentelemetry-collector-contrib:0.162.0`, `""` | |
| `otlp_enabled`, `otlp_grpc_port`, `otlp_http_port` | `true`, `4317`, `4318` | OTLP of the applications |
| `openobserve_service`, `openobserve_tls` | `openobserve`, `mtls` | export target and trust |
| `ingest_secret_path` | `openobserve/ingest` | written by the openobserve module |
| `hostmetrics_enabled`, `host_root_volume` | `true`, `hostfs` | host metrics |
| `nomad_metrics_enabled`, `nomad_address` | `true`, `http://127.0.0.1:4646` | the local agent |
| `discovery_namespaces` | `["default"]` | the namespaces the collector looks for metrics services in |
| `*_metrics_enabled` | `true` | NATS, Forgejo, mTLS gateway, Consul, PostgreSQL |

```shell
norca operator api -namespace observability -X PUT /v1/rigger/install <<'EOF'
{"Release": "otel-collector", "Registry": "global", "Module": "norca/otel-collector", "Version": "~> 0.1",
 "ValuesJSON": {"discovery_namespaces": ["default", "apps"]}}
EOF
```

It needs the openobserve module in the same namespace, `telemetry { prometheus_metrics = true }` on
the agents and, for host metrics, a read-only host volume `hostfs` of `/`. The collector reads the
trust bundle only when it loads its configuration; its mtls block sets
`change_mode = "signal"`, `change_signal = "SIGHUP"`, `change_on = "bundle"`, so the client reloads
it when a new CA joins the bundle.

## postgres

A single [PostgreSQL](https://www.postgresql.org) server for the infrastructure of a Norca cluster
(the metadata store of OpenObserve in cluster mode, small internal services): the data on a host
volume, the superuser, application databases with their owner roles and a read-only monitoring role,
all with passwords from the built-in secret store, health checks with roles, a disruption budget, the
service `postgres` in the native catalog, optional TLS with Norca's workload certificates and
optional periodic dumps to S3. Replication, failover, pooling and point-in-time recovery are out of
scope.

PostgreSQL is released under the **PostgreSQL License**. The module only references the official
image (`docker.io/library/postgres:18.6`); Norca does not ship it.

| Variable | Default | |
| --- | --- | --- |
| `image`, `image_digest` | `docker.io/library/postgres:18.6`, `""` | |
| `host_volume` | `postgres` | mounted at `/var/lib/postgresql` |
| `port` | `5432` | static port on the node |
| `superuser_secret_path` | `postgres/superuser` | |
| `databases` | `[]` | `{name, user, secret_path}` entries |
| `monitoring_enabled`, `monitoring_secret_path` | `true`, `postgres/monitoring` | the `pg_monitor` role |
| `tls_mode`, `tls_required` | `none`, `false` | `none`, `mtls`, `secret` |
| `dump_enabled`, `dump_cron` | `false`, `0 2 * * *` | the dump job |

```shell
norca secret put postgres/superuser password=-
norca secret put postgres/openobserve password=-
norca secret put postgres/monitoring password=-
norca operator api -X PUT /v1/rigger/install <<'EOF'
{"Release": "postgres", "Registry": "global", "Module": "norca/postgres", "Version": "~> 0.4",
 "ValuesJSON": {"databases": [{"name": "openobserve", "user": "openobserve", "secret_path": "postgres/openobserve"}]}}
EOF
```

## rustfs

[RustFS](https://rustfs.com), an S3-compatible object store (Apache-2.0), as the store of the scheduled
Norca backups (see [backup and restore](/docs/features/backup-restore)): one server with one drive, or
a distributed cluster with one server per node, the root credentials from the built-in secret store,
the data on a client host volume, health checks with the startup, readiness and liveness roles, and
optionally a poststart task that creates the backup bucket. **Keep the backups outside the cluster they
protect.**

| Variable | Default | |
| --- | --- | --- |
| `mode` | `single` | `single` or `distributed` |
| `nodes` | `[]` | distributed mode: the node addresses (4 or more to survive the loss of one) |
| `image`, `image_digest` | `docker.io/rustfs/rustfs:1.0.1`, `""` | |
| `host_volume` | `rustfs` | mounted at `/data` |
| `s3_port`, `console_enabled` | `9000`, `false` | |
| `secret_path` | `rustfs/root` | items `access_key` and `secret_key` |
| `buckets` | `[]` | buckets the poststart task creates |
| `metrics_enabled` | `false` | OTLP metrics export |

```shell
norca secret put rustfs/root access_key=norca-backup secret_key=-
norca operator api -X PUT /v1/rigger/install <<'EOF'
{"Release": "rustfs", "Registry": "global", "Module": "norca/rustfs", "Version": "~> 0.2",
 "ValuesJSON": {"buckets": ["norca-backup"]}}
EOF
```

## traefik

[Traefik Proxy](https://traefik.io/traefik/) (MIT) as the edge router of a region, from the official
image: a service job with instances on different nodes or a system job on the edge nodes. The
**Entrypoints** tab of the install form is a table of the ports open to the outside (name, port,
protocol `http`, `https`, `tcp` or `udp`, and a redirect from an `http` to an `https` entrypoint); the
admin port serves `/ping` (the health check) and optionally the dashboard and `/metrics`.

Certificates come from the built-in secret store: every secret of `tls_certificates` holds the items
`cert` and `key` (PEM); Traefik picks one by the SNI name, and a renewed certificate is applied without
a restart. Routes come from the tags of the services of Norca's native catalog
(`traefik.enable=true`, `traefik.http.routers.<name>.rule=...`), read with the workload identity of
Traefik, and from `dynamic_config`: Traefik's dynamic configuration (YAML) for backends outside the
catalog. The module's `examples/` directory has it for a website over HTTPS (`web.vars.hcl`),
WebSocket (`websocket.vars.hcl`), gRPC to h2c backends (`grpc.vars.hcl`) and raw TCP with TLS
passthrough and UDP (`tcp.vars.hcl`).

`acme_challenge = true` leaves the path of the ACME HTTP-01 challenge
(`/.well-known/acme-challenge/`) out of the redirect of the http entrypoints, so that the
[norca-acme](#norca-acme) module can answer it (`acme.vars.hcl`).

With `mtls`, Traefik gets a workload certificate of [native mTLS](/docs/features/native-mtls) and
presents it to the backends of `mtls_backends`: one servers transport `mtls-<name>` per backend, which
trusts the trust bundle and checks the backend's DNS name `<service>.service.<namespace>.norca`. A route
uses it with the tags `traefik.http.services.<svc>.loadbalancer.server.scheme=https` and
`...serversTransport=mtls-<name>@file`, and an intention from the service named after the job lets
Traefik in (`norca service intention create -allow traefik api`). The renewed certificate is applied
without a restart. HTTP backends only (gRPC and WebSocket over HTTPS too); example `mtls.vars.hcl`.

| Variable | Default | |
| --- | --- | --- |
| `job_type`, `count` | `service`, `2` | `system`: one per node of the node pool |
| `entrypoints` | `web` (80, redirected to 443), `websecure` (443) | name, port, protocol, redirect_to |
| `network_mode`, `host_network` | `host`, `""` | where the ports are bound |
| `admin_port`, `dashboard`, `metrics` | `8080`, `false`, `false` | the admin entrypoint |
| `tls_certificates`, `tls_min_version` | `[]`, `VersionTLS12` | secrets with the items cert and key |
| `mtls`, `mtls_backends` | `false`, `[]` | native mTLS to the backends |
| `catalog_enabled`, `catalog_namespaces` | `true`, `["default"]` | routing by service tags |
| `dynamic_config` | `""` | static routes (YAML) |
| `image` | `docker.io/library/traefik:v3.7.16` | the official image |

```shell
norca secret put traefik/certs/example-com cert=@fullchain.pem key=@privkey.pem
norca rigger install ./norca-registry/modules/traefik -name traefik \
  -f ./norca-registry/modules/traefik/examples/web.vars.hcl
```

## Versions and tags

- Every module has its own semantic version (`module { version }` in `metadata.hcl`). A change that
  changes rendered jobs raises the patch version, new variables raise the minor version, renamed or
  removed variables and changed defaults that change a running installation raise the major version
  (`0.x`: the minor version).
- A version is released by a tag `<module>/v<version>` (`nats/v2.0.0`). **A tag is never moved.**
  `main` is the development branch and may change at any time.
- A version is signed with the key of the namespace `norca` of the global registry
  (`norca rigger module publish modules/<module> -key norca.key` signs the module, commits the
  signature and tags it). Once the tag is pushed, the global registry lists the version as
  `norca/<module>`.
- An install names a version constraint (`"Version": "~> 0.2"`, `version = "~> 0.2"` in a stack). A
  stack keeps the versions it resolved in its lock file, `rigger.lock.hcl`. Pinned images change
  only with a module version.
- A release records the module and its version; `norca rigger release history` shows which version
  each revision used.

Without access to GitHub from the servers, install from a checkout of the registry by path, point
the registry `global` at a mirror, or carry the modules of a stack in a bundle
(`norca rigger bundle create`); see [supply chain](/docs/features/packages/supply-chain) for the
lock file, the signatures and the bundles.

## Layout of the registry

```plaintext
README.md, LICENSE, REUSE.toml
modules/<name>/             one module per directory
  metadata.hcl              the module block: name, version, description, requirements; the tabs of the install form
  variables.hcl             variables with descriptions, defaults and validation blocks; the rules
  <name>.norca.hcl          a job; <name>.acl.hcl, <name>.kind.hcl, <name>.admission.hcl, <name>.var.hcl:
                            an ACL policy, an object kind, an admission policy, a Norca Variable
  locals.hcl, modules.hcl   locals and the calls of child modules (lib/placement)
  outputs.hcl               outputs, the notes of the module among them
  examples/*.vars.hcl       example values, rendered by "norca rigger module validate"
  tests/*.riggertest.hcl    tests, run by "norca rigger module test"
  .rigger-signatures/       the signatures of the published versions
  README.md
modules/lib/<name>/         library modules the others call
scripts/check-modules.sh    the checks of the modules
scripts/check-modules-server.sh   the jobs of the modules, validated by a Norca server
```

## Contributing

Contributions are welcome: fixes, new variables, new modules for infrastructure that runs on Norca.
Every commit needs a DCO sign-off (`git commit -s`).

<!-- REUSE-IgnoreStart -->

- Write modules as described in [modules and stacks](/docs/features/packages/modules): `validation`
  blocks in the variables and `rule` blocks in `variables.hcl` for anything the variable types can't
  express.
- New files carry the SPDX header `SPDX-FileCopyrightText: 2026 Norca contributors` /
  `SPDX-License-Identifier: MPL-2.0`; the modules are MPL-2.0.
- Modules reference third-party software by name, tag and optionally digest; they never include it.
  Pin images to a release that is at least two weeks old, state its license in the module README, and
  take secrets from the built-in secret store or Variables.
- Every module needs a README (what it deploys, prerequisites, variables, checks, limitations) and at
  least one file of values in its `examples/` directory if its defaults don't cover the main use.
- Check before a pull request, with the `rigger` program on the `PATH` (it has the commands of
  `norca rigger`):

<!-- REUSE-IgnoreEnd -->

  ```shell
  scripts/check-modules.sh                          # all modules
  RIGGER=~/bin/rigger scripts/check-modules.sh      # with another rigger program
  norca rigger module validate ./modules/<module>   # one module
  norca rigger fmt ./modules/<module>               # format
  ```

  The script runs `rigger fmt -check` on the modules, then `rigger module validate` on every module
  (its files, and its defaults and example values rendered, which also checks the validation blocks
  and rules) and `rigger module test` on every module with a `tests/` directory. It fails when a
  module names a `NOMAD_*` environment variable: the environment of a task is `NORCA_*`. For what
  the checks without a cluster can't know, `scripts/check-modules-server.sh` sends every job the
  modules render, for their defaults and every example, to the validation of a Norca server
  (`NORCA_ADDR`, `NORCA_TOKEN`; a test server).
