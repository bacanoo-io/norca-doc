---
title: "The Norca pack registry"
linkTitle: "Pack registry"
weight: 7
description: "The public pack registry of Norca (bacanoo-io/norca-registry): the operations packs of a Norca cluster, how to add it pinned to a release tag, and what each pack deploys."
---

The [Norca pack registry](https://github.com/bacanoo-io/norca-registry) is the public pack registry of
Norca: the operations packs that install the infrastructure around a Norca cluster (NATS, the
cross-region mTLS gateway, the backup store, the git server and image registry, PostgreSQL,
observability with OpenObserve and the OpenTelemetry Collector, optional Consul) and the reference
operator pack. `norca pack` uses it like any git pack registry. Its packs use Norca's
[extended package format](/docs/features/packages/releases#extended-package-format): object kinds, ACL
and admission policies next to jobs, and `validation` and `rule` blocks for the variables, which also
build their install form in the [web UI catalog](/docs/features/packages/catalog).

The packs and the documentation of the registry are licensed under the Mozilla Public License 2.0.
The software the packs install keeps its own license. The packs **reference** that software (images,
release archives) by name, tag and optionally digest; they never include it, and the registry
distributes none of it. Consul in particular is BSL 1.1, Forgejo GPL-3.0-or-later and OpenObserve
AGPL-3.0.

## Adding the registry

Add the registry once, pinned to a release tag, and use the packs by name:

```shell
norca pack registry add norca https://github.com/bacanoo-io/norca-registry --ref=v0.1.0
norca pack registry list

norca pack info   rustfs --registry=norca
norca pack render rustfs --registry=norca -f rustfs.hcl      # the jobs, without submitting them
norca pack plan   rustfs --registry=norca -f rustfs.hcl
norca pack run    rustfs --registry=norca -f rustfs.hcl
```

`--ref` takes a tag, a branch or a commit; without it the default branch is used. The cache keeps
every ref in its own directory, and the registry remembers the ref it was last added or updated with:
`render`, `plan`, `run` and the other pack commands without `--ref` use the packs at that ref (here
`v0.1.0`), and without `--name` the release is named after the pack (`rustfs`), so it keeps its name
when the registry moves to a new tag. An explicit `--ref` selects another cached ref; the default
release name is then `pack-ref`. See [refs and deployment names](/docs/commands/pack#refs-and-deployment-names).

`--target=<pack>` downloads a single pack. `norca pack registry update norca --ref=<tag>` downloads
another tag next to the cached ones and makes it the default ref (`norca pack upgrade rustfs
--registry=norca -f rustfs.hcl` then upgrades the release to it), and `norca pack registry delete
norca` removes the registry (`--ref` removes one ref). Added under the name `default`, the packs can
be used without `--registry`:

```shell
norca pack registry add default https://github.com/bacanoo-io/norca-registry --ref=v0.1.0
norca pack run nats
```

Releases installed by earlier versions without `--name` and `--ref` are named `pack-latest`
(deployment `pack@latest`); manage them with `--ref=latest`.

From a checkout, the packs can also be used by path, without a registry:

```shell
git clone https://github.com/bacanoo-io/norca-registry
norca pack run ./norca-registry/packs/nats -f nats.hcl
```

### On a cluster

The registry can also be a [cluster pack registry](/docs/features/packages/catalog): in the web UI,
**Packages → Registries → Add registry**, type *Git repository*, source
`https://github.com/bacanoo-io/norca-registry`, reference a release tag, and a sync interval. Its packs
then appear under **Catalog** and are installed from their form. A release of the registry can notify
a cluster so that it syncs at once: the `notify` job of its release workflow sends a
[push notice](/docs/features/system-bus#pack-push-notices) to `NORCA_ADDR` (repository variable) with
the token `NORCA_TOKEN` (secret).

Example variable files for the packs are in `examples/<pack>/` of the registry; the
[deployment examples](/docs/getting-started/examples) use the packs of this registry. Pinning,
updating and air-gapped use are described in
[Operating with the pack registry](/docs/operations/pack-registry).

## Packs

| Pack | Version | In `v0.1.0` | What it deploys |
| --- | --- | --- | --- |
| [consul](#consul) | 0.2.0 | 0.2.0 | The official HashiCorp Consul release (BSL 1.1, referenced, never shipped; accepted by the user at install): servers on host volumes over datacenters, client agents, gossip/TLS/ACL bootstrap from Variables, optional snapshots to S3, optional agent metrics |
| [forgejo](#forgejo) | 0.2.0 | 0.2.0 | Forgejo (GPL-3.0-or-later, referenced, never shipped) as the internal git server and container registry: SQLite and repositories on a host volume, packages and LFS in RustFS, secrets from the built-in secret store, optional HTTPS, SSH, initial admin and periodic dumps; optional `/metrics` |
| [loadbalancer-operator](#loadbalancer-operator) | 0.1.0 | 0.1.0 | The LoadBalancer operator as an operator pack: object kind (webhooks, limits), ACL policy bound to the controller job, admission policy, controller job |
| [mtls-gateway](#mtls-gateway) | 0.2.1 | 0.2.0 | The cross-region native mTLS gateway of a region (`mtls { mode = "gateway" }`): SNI passthrough Envoy on the gateway nodes, injected by the servers or defined by the pack; optional Envoy statistics |
| [nats](#nats) | 0.6.0 | 0.2.0 | A NATS cluster per region for the applications (JetStream, supercluster gateways, TLS and auth from Variables, or users in accounts with subject permissions and passwords from the built-in secret store), optional Prometheus exporter |
| [openobserve](#openobserve) | 0.2.0 | 0.1.0 | OpenObserve (AGPL-3.0, referenced, never shipped) as the observability backend (logs, metrics, traces): single node on a host volume or a cluster of node roles on PostgreSQL, NATS and RustFS, TLS with Norca's workload certificates, root user and the ingest credentials of the collectors in the built-in secret store |
| [otel-collector](#otel-collector) | 0.1.1 | 0.1.0 | The OpenTelemetry Collector (contrib, Apache-2.0) on every node: host, Norca agent, NATS, RustFS, Forgejo, mTLS gateway, Consul and PostgreSQL metrics found through the native catalog, an OTLP receiver for the applications, export to OpenObserve trusting Norca's CA |
| [postgres](#postgres) | 0.1.0 | 0.1.0 | A single PostgreSQL server (PostgreSQL License, referenced, never shipped): data on a host volume, superuser, application databases and a `pg_monitor` role from the built-in secret store, optional TLS with Norca's workload certificates, optional periodic dumps to S3 |
| [rustfs](#rustfs) | 0.2.0 | 0.2.0 | RustFS (Apache-2.0) as the S3 store of the Norca backups: single node or distributed, credentials from the built-in secret store, host volumes, health check roles, optional bucket creation, optional OTLP metrics |
| [traefik](#traefik) | 0.1.0 | – | Traefik Proxy (MIT, the official image) as the edge router of a region: entrypoints for HTTP, HTTPS, TCP and UDP edited as a table in the install form, certificates from the built-in secret store applied without a restart, routes from the tags of the native catalog and static configuration; examples for web, WebSocket, gRPC and TCP (Norca 0.3.0) |

The *Version* column shows the pack versions on the registry's `main` branch; the `v0.1.0` tag
contains `mtls-gateway` 0.2.0 (its printed upstream example lacks the label of the `upstream`
block), `nats` 0.2.0 (without `auth_mode = "userpass"`, and with tokens that contain `<`, `>` or `&`
rejected by the NATS parser), `openobserve` 0.1.0 (without its dedicated NATS user, with a sidecar
that restarts OpenObserve every 6 hours for the certificate renewals) and `otel-collector` 0.1.0
(without the reload after a CA rotation). They come with the next registry tag. The packs need Norca 0.1.0 or newer;
packs with `requires` in their `metadata.hcl` state the server features they use.

Each pack's README in the registry (`packs/<pack>/README.md`) describes it completely: what it
deploys, prerequisites, secrets, all variables, health checks, metrics and limitations. The sections
below summarize them.

## consul

Installs and manages the **official, current HashiCorp Consul release**: the Consul servers as a
service job, a Consul client agent on every other node as a system job, and optionally a periodic
snapshot job. It is meant for what still needs a real Consul (Consul Connect with L7 features,
sessions and locks, the full KV, prepared queries, config entries). Service discovery, DNS, the
Consul-compatible read layer and external services do **not** need it; see
[Consul pack](/docs/features/service-discovery/consul-pack).

> [!CAUTION]
> Consul is licensed by HashiCorp under the **Business Source License 1.1 (BSL 1.1)**, not under an
> open source license. Norca does not distribute, include, vendor or modify Consul. The pack only
> references the official image or release archive; the nodes pull it. The pack does not render until
> you set `consul_license_accepted = true`, confirming that you have read the Consul license and that
> your use is permitted.

The bootstrap needs no manual steps: a prestart task generates the gossip key, the CA, the server
certificates and the ACL tokens on the first start and stores them in Norca Variables. ACLs
(default deny) and gossip encryption are always on, TLS is on by default (`tls_enabled`).

| Variable | Default | |
| --- | --- | --- |
| `consul_license_accepted` | `false` | must be `true` (BSL 1.1) |
| `consul_version` | `2.1.0` | provisional; pin your validated release |
| `server_count` | `3` | 3 or 5 (1 for development) |
| `driver` | `docker` | `docker`, `exec`, `raw_exec` |
| `image_registry`, `image_digest` | `docker.io`, `""` | internal mirror, pinning |
| `server_node_meta`, `datacenter_attribute` | `consul_server`, `${node.datacenter}` | placement |
| `host_network` | `""` | private network (VPN) interface |
| `clients_enabled`, `snapshot_enabled` | `true`, `false` | client system job, snapshot job |
| `metrics_enabled` | `false` | agent metrics for the otel-collector pack |

```shell
norca pack run consul --registry=norca --var consul_license_accepted=true
```

Server nodes need the node meta `consul_server = "true"`, one datacenter each (one per
availability zone) and the host volume `consul-server`; with Norca ACLs, the bootstrap task needs the ACL policy that `norca pack run` prints.

## forgejo

[Forgejo](https://forgejo.org) as the internal **git server** and **container (OCI) registry**: one
instance with SQLite and the git repositories on a client host volume; container images, LFS
objects, attachments and avatars in the RustFS of the [rustfs](#rustfs) pack (any S3 store works);
its keys, the admin password, the S3 credentials and the TLS certificate from Norca's
[built-in secret store](/docs/features/secrets); health checks with roles; optional HTTPS, SSH, initial
admin and periodic dumps. The nodes can then pull internal images from Forgejo with one Docker auth
file per client.

Forgejo is licensed under the **GNU GPL v3.0 or later**. The pack only references the official image
(`codeberg.org/forgejo/forgejo:15.0.10-rootless`, the v15 LTS line); Norca does not ship it.

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
| `metrics_enabled` | `false` | `/metrics` for the otel-collector pack |

```shell
norca secret put forgejo/admin password=-
norca pack run forgejo --registry=norca -f forgejo.hcl
```

Git repositories need a POSIX file system, so Forgejo runs as one instance on the one node with the
host volume `forgejo`.

## loadbalancer-operator

The LoadBalancer operator of Norca (the sample operator of the controller SDK) packaged as an
**operator pack**: one release installs, upgrades, rolls back and uninstalls everything the operator
needs, in the fixed order of the extended pack format. It is the reference for writing operator packs
(see the [operator framework](/docs/features/operator-framework)).

| Template | Resource |
| --- | --- |
| `controller.acl.hcl.tpl` | ACL policy bound to the controller job (`job_acl`) |
| `loadbalancer.kind.hcl.tpl` | Object kind `norca.io/LoadBalancer`: JSON Schema with defaults, a CEL transition rule, display columns, optional webhooks, limits |
| `service-marks.admission.hcl.tpl` | Admission policy: services marked with `norca_lb_port` must name a valid port (optional) |
| `controller.nomad.tpl` | The controller job (two instances with leader election) and the optional webhook task |

Key variables: `namespace`, `count`, `driver` and `binary` or `image` (the controller), `acl_policy_enabled`
(set `false` on agents without ACLs), `admission_policy_enabled`, `webhook_enabled`, `webhook_url`,
`classes`, `default_class`, `webhook_failure_policy`, and the limits `write_rate`, `identity_write_rate`,
`max_objects_per_namespace`, `max_watches_per_identity`.

```shell
norca pack plan loadbalancer-operator --registry=norca --name=lb
norca pack run  loadbalancer-operator --registry=norca --name=lb
norca pack status lb
norca pack uninstall lb
```

The controller binary (`norca-loadbalancer`) is built from the Norca repository and installed on the
nodes. A token with less than management rights needs `operator`, `acl` and `admission` write
permissions; applying a release grants no extra permissions.

## mtls-gateway

The cross-region gateway of Norca's [native mTLS](/docs/features/native-mtls): a group with a service
in `gateway` mode (`mtls { mode = "gateway" }`), run in the `default` namespace of every region that
offers services to other regions. The gateway reads the SNI name of each TLS connection and forwards
it, without terminating it, to a healthy instance of the destination service of its region; mTLS stays
end to end between the sidecars. By default the servers inject the Envoy task; with
`envoy_task_enabled = true` the pack defines it. Norca does not distribute Envoy; the nodes pull the
official image.

| Variable | Default | |
| --- | --- | --- |
| `job_type` | `system` | `system`: a gateway on every eligible node; `service`: `count` gateways |
| `service_name` | `mtls-gateway` | the name upstreams look for by default |
| `port`, `host_network` | `8443`, `""` | static port on the nodes, bound to a host network |
| `network_mode` | `bridge` | `bridge` or `host` |
| `envoy_task_enabled`, `envoy_image` | `false`, `""` | the pack defines the Envoy task |
| `metrics_enabled` | `false` | `/stats/prometheus` of the Envoy task defined by the pack |

```shell
norca pack run mtls-gateway --registry=norca --regions=eu-1,eu-2
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
lame duck shutdown. NATS is Apache-2.0; the pack references the official `nats` image.

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

```shell
norca pack run nats --registry=norca -f nats.hcl
```

TLS material and tokens come from a Variable (default `nomad/jobs/<job>`), user passwords from the
built-in secret store (`nats/users/<name>`); never from pack variables. With `auth_mode = "token"`
the item `client_token` holds the token (plain or a bcrypt hash of `nats server passwd`; any
characters, quoted for the NATS configuration parser). `auth_mode = "userpass"` is available from
pack version 0.3.0.

## openobserve

[OpenObserve](https://openobserve.ai) as the observability backend (logs, metrics, traces) of a Norca
cluster: in **single mode** one instance with every role, SQLite metadata and the data on a host
volume; in **cluster mode** a task group per node role (router, ingester, querier, compactor,
alertmanager) with PostgreSQL metadata (the [postgres](#postgres) pack), [NATS](#nats) as the cluster
coordinator and the data in S3 ([rustfs](#rustfs)). TLS uses Norca's workload certificates; a
bootstrap task creates the organizations and a service account for the collectors and stores its
token in the secret store for the [otel-collector](#otel-collector) pack.

OpenObserve (open source edition) is licensed under the **GNU AGPL v3.0**. The pack only references
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
norca pack run openobserve --registry=norca --namespace=observability -f openobserve.hcl
```

OpenObserve reads its certificate only at start. From pack version 0.2.0 its mtls services set
[`change_mode = "restart"`](/docs/features/native-mtls/app-mode#reacting-to-renewals): the client
restarts an instance only after its certificate was renewed or a new CA joined the trust bundle,
once per change (coalesced, with a splay of a few seconds) and without counting against the restart
policy; there are no periodic restarts. Each restart is a short interruption of that instance; after
a CA rotation all instances restart within seconds. Version 0.1.0 restarted every instance every
`tls_restart_interval` (6h) from a sidecar; 0.2.0 still accepts the variable and ignores it.

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
| `ingest_secret_path` | `openobserve/ingest` | written by the openobserve pack |
| `hostmetrics_enabled`, `host_root_volume` | `true`, `hostfs` | host metrics |
| `nomad_metrics_enabled`, `nomad_address` | `true`, `http://127.0.0.1:4646` | the local agent |
| `*_metrics_enabled` | `true` | NATS, Forgejo, mTLS gateway, Consul, PostgreSQL |

```shell
norca pack run otel-collector --registry=norca --namespace=observability -f observability.hcl
```

It needs the openobserve pack in the same namespace, `telemetry { prometheus_metrics = true }` on the
agents and, for host metrics, a read-only host volume `hostfs` of `/`. The collector reads the trust
bundle only when it loads its configuration; from pack version 0.1.1 its mtls block sets
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

PostgreSQL is released under the **PostgreSQL License**. The pack only references the official image
(`docker.io/library/postgres:18.6`); Norca does not ship it.

| Variable | Default | |
| --- | --- | --- |
| `image`, `image_digest` | `docker.io/library/postgres:18.6`, `""` | |
| `host_volume` | `postgres` | mounted at `/var/lib/postgresql` |
| `port` | `5432` | static port on the node |
| `superuser_secret_path` | `postgres/superuser` | |
| `databases` | `[]` | `{name, user, secret_path}` entries |
| `monitoring_enabled` | `true` | the `pg_monitor` role |
| `tls_mode`, `tls_required` | `none`, `false` | `none`, `mtls`, `secret` |
| `dump_enabled`, `dump_cron` | `false`, `0 2 * * *` | the dump job |

```shell
norca secret put postgres/superuser password=-
norca secret put postgres/openobserve password=-
norca pack run postgres --registry=norca -f postgres.hcl
```

## rustfs

[RustFS](https://rustfs.com), an S3-compatible object store (Apache-2.0), as the store of the scheduled
Norca backups (see [backup and restore](/docs/features/backup-restore)): one server with one drive, or
a distributed cluster with one server per node, the root credentials from the built-in secret store,
the data on a client host volume, health checks with the startup, readiness and liveness roles, and
optionally a poststart task that creates the backup bucket. Keep the backups outside the cluster they
protect.

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
norca pack run rustfs --registry=norca --var='buckets=["norca-backup"]'
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
catalog. The registry's `examples/traefik/` has it for a website over HTTPS (`web.hcl`), WebSocket
(`websocket.hcl`), gRPC to h2c backends (`grpc.hcl`) and raw TCP with TLS passthrough and UDP
(`tcp.hcl`).

| Variable | Default | |
| --- | --- | --- |
| `job_type`, `count` | `service`, `2` | `system`: one per node of the node pool |
| `entrypoints` | `web` (80, redirected to 443), `websecure` (443) | name, port, protocol, redirect_to |
| `network_mode`, `host_network` | `host`, `""` | where the ports are bound |
| `admin_port`, `dashboard`, `metrics` | `8080`, `false`, `false` | the admin entrypoint |
| `tls_certificates`, `tls_min_version` | `[]`, `VersionTLS12` | secrets with the items cert and key |
| `catalog_enabled`, `catalog_namespaces` | `true`, `["default"]` | routing by service tags |
| `dynamic_config` | `""` | static routes (YAML) |
| `image` | `docker.io/library/traefik:v3.7.16` | the official image |

```shell
norca secret put traefik/certs/example-com cert=@fullchain.pem key=@privkey.pem
norca pack run traefik --registry=norca -f examples/traefik/web.hcl
```

## Versions and tags

- Every pack has its own semantic version (`pack { version }` in `metadata.hcl`). A change that
  changes rendered jobs raises the patch version, new variables raise the minor version, renamed or
  removed variables and changed defaults that change a running installation raise the major version
  (`0.x`: the minor version).
- The registry is released as a whole with tags `vMAJOR.MINOR.PATCH`. A tag is never moved; pin it
  with `--ref`. `main` is the development branch and may change at any time.
- A registry release lists the pack versions it contains in its release notes. Pinned images change
  only with a pack version.
- Server releases record the pack name and version in the release; `norca pack history` shows which
  version each revision used.

For signed packs and air-gapped clusters, push the packs of a tag into an internal OCI registry
(`norca pack push`, `norca pack sign`) or carry them in an offline bundle
(`norca pack bundle create`); see [supply chain](/docs/features/packages/supply-chain) and
[air-gapped clusters](/docs/operations/pack-registry#air-gapped-clusters).

## Layout of the registry

```plaintext
README.md, LICENSE, REUSE.toml
packs/<name>/            one pack per directory (the layout "norca pack registry add" expects)
  metadata.hcl           name, version, requirements
  variables.hcl          variables with descriptions, defaults, validation blocks and rules
  templates/*.nomad.tpl  jobs; *.kind.hcl.tpl, *.acl.hcl.tpl, ... other resources
  templates/_*.tpl       helper templates
  outputs.tpl            text printed after a deployment
  README.md
examples/<name>/*.hcl    variable files, checked by scripts/check-packs.sh
scripts/check-packs.sh   local and CI checks
```

## Contributing

Contributions are welcome: fixes, new variables, new packs for infrastructure that runs on Norca.
Every commit needs a DCO sign-off (`git commit -s`).

- Write packs as described in [Writing packs](/docs/features/packages/writing-packs) and the
  [extended package format](/docs/features/packages/releases#extended-package-format): `[[ ]]`
  delimiters, `var "name" .` / `vars .` to read variables, `validation` and `rule` blocks in
  `variables.hcl` for anything the variable types can't express
  ([form and constraints](/docs/features/packages/writing-packs#form-and-constraints)).
- New files carry the SPDX header `SPDX-FileCopyrightText: 2026 Norca contributors` /
  `SPDX-License-Identifier: MPL-2.0`; the packs are MPL-2.0.
- Packs reference third-party software by name, tag and optionally digest; they never include it.
  Pin images to a release that is at least two weeks old, state its license in the pack README, and
  take secrets from the built-in secret store or Variables, never from pack variables.
- Every pack needs a README (what it deploys, prerequisites, variables, checks, limitations) and at
  least one variable file in `examples/<pack>/` if its defaults don't cover the main use.
- Check before a pull request, with a `norca` binary built from the Norca repository:

  ```shell
  NORCA=~/bin/norca scripts/check-packs.sh          # all packs
  NORCA=~/bin/norca scripts/check-packs.sh rustfs   # one pack
  norca pack fmt -recursive ./packs/<pack>          # format
  ```

  The script runs `norca pack fmt -check`, renders every pack with its defaults and every file in
  `examples/<pack>/` (which also checks the validation blocks and rules), and validates the rendered jobs with
  `norca job validate` without an agent. Run `norca pack plan` against a test cluster for what local
  validation can't check (drivers, the tasks the servers inject).
