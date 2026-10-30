---
title: "Deployer"
linkTitle: "Deployer"
description: "norca-deployer installs and maintains Norca clusters on your own machines from a declarative plan: servers and clients over SSH, rolling restarts, TLS and ACLs, firewall, packages, secrets and packs."
weight: 65
---

## What and why

A Norca cluster on bare metal or virtual machines needs the same steps on every
node: the binary and the CNI plugins, the agent configuration, TLS
certificates, gossip encryption, the ACL bootstrap, systemd units, firewall
rules, and afterwards careful rolling upgrades. `norca-deployer` does all of it
from one declarative plan (YAML or HCL), so a cluster can be created,
extended, upgraded and shrunk by editing the plan and running it again.

It is a separate single binary that runs on the operator's machine (Linux,
macOS or Windows) and reaches the nodes over SSH; nothing has to be
preinstalled on them, and they need no internet access.

## How it works

```shell
norca-deployer init  -c cluster-deploy.yaml   # a sample plan
norca-deployer plan  -c cluster-deploy.yaml   # what would change (dry run)
norca-deployer apply -c cluster-deploy.yaml   # install or update, safe to run again
```

`apply` compares every node with the plan and changes only what differs.
Changed servers restart one at a time, and the deployer waits until each is
healthy, has a leader and sees all Raft peers; clients restart in batches.
After the cluster is up it writes the bootstrap secrets, ACL policies and pack
registries, and deploys the packs of the plan.

## What it covers

| Area | |
| --- | --- |
| Nodes | Servers and clients on Linux and Windows, a datacenter per node, multi-region federation |
| Security | Internal CA with mTLS certificates, optional SPIFFE IDs, gossip encryption, ACL bootstrap, encrypted secrets in the plan |
| Artifacts | Norca and CNI downloaded once and checksum-verified on the operator's machine, or local files; copied to the nodes |
| Host setup | APT repositories and `.deb` packages, scripts in install phases, sysctl, kernel modules, log rotation |
| Network | Agents listen on the cluster address only; firewall rules (ufw, firewalld, iptables) for the API, cluster and allocation ports |
| Scheduling labels | Node meta and class, node pools, host networks, reserved resources, drain on shutdown |
| Lifecycle | Adding nodes, decommissioning (drain, Raft removal, uninstall), a record of the installed nodes |
| After the bootstrap | Secrets and Variables (also generated passwords and NATS NKeys), ACL policies bound to jobs, pack registries and packs |

## Learn more

The [Deployer](/docs/deployer) chapter is the full documentation:
[getting started](/docs/deployer/getting-started),
[how apply works](/docs/deployer/how-apply-works),
the [configuration reference](/docs/deployer/configuration) and complete
[example plans](/docs/deployer/examples/), among them
[one region over several datacenters with NATS](/docs/deployer/multi-datacenter)
and [multi-region](/docs/deployer/multi-region).
