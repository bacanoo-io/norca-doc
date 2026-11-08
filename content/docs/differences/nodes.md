---
title: Nodes
linkTitle: Nodes
description: How servers, clients and scaled nodes are installed and joined in Norca compared with Nomad v1.6.5. The deployer installs the servers and clients; scaled nodes come up by themselves with a certificate of a node CA.
weight: 2
---

Nomad v1.6.5 leaves the installation of its agents to the operator: the binary, the configuration,
the service unit and the certificates are put on each machine by hand or with external tools, and
nodes added by scaling come from the external Nomad Autoscaler and the machine image you prepare.
Norca installs the servers and the clients with the [deployer](/docs/deployer): a declarative plan,
applied over SSH, with its own CA, rolling restarts and decommissioning. Nodes added by scaling are
not installed by the deployer: a [node group](/docs/features/node-scaling) asks an operator for
machines, and each new machine joins with a certificate of the **node CA** of its region, a
name-constrained intermediate that the deployer issues.

## Comparison

| Area | Nomad v1.6.5 | Norca | Change |
| --- | --- | --- | --- |
| Installing servers and clients | By hand or with external tools: binary, configuration, service unit | [`norca-deployer`](/docs/deployer): a plan (YAML or HCL), installed over SSH or locally, idempotent `apply`, nothing preinstalled on the nodes | New |
| Restarts after a change | By hand | Only changed nodes restart: servers one at a time with health, leader and peer checks, clients in batches | New |
| TLS, gossip and ACL bootstrap | Set up by the operator | Done by `apply`: mTLS certificates, gossip key, `acl bootstrap` with the token stored locally | New |
| Packages, scripts and packs | External tools | In the plan: APT packages, scripts by phase, packs, secrets and policies | New |
| Removing a node | Drain, stop, purge or remove the Raft peer by hand | [`inventory.decommission`](/docs/deployer/adding-and-removing-nodes): drain, uninstall, purge or remove from Raft | New |
| Certificates of servers and clients | Made by the operator: `nomad tls ca create`, `tls cert create`, or an own CA | Issued by the deployer's [cluster CA](/docs/deployer/security) (or your own CA), copied over SSH | Changed |
| Renewal of those certificates | By hand | Valid 3 years; `apply` re-issues one with less than 30 days left and restarts the agent | New |
| Firewall of the nodes | Outside Nomad | Rules on Linux nodes (ufw, firewalld or iptables) limited to [`cluster_cidrs`](/docs/deployer/networking-and-tuning#firewall) and other ranges | New |
| Adding nodes by scaling | The external Nomad Autoscaler: cluster scaling with cloud target plugins (instance groups) | The [built-in autoscaler](/docs/features/node-scaling) decides `spec.replicas` of a `NodeGroup`; the operator `norca-nodescaler` creates the machines through a provider | Changed |
| Machines of a platform | A target plugin in the autoscaler | A [provider](/docs/features/node-scaling/writing-a-provider) application per platform, registered as a `NodeProvider`, with an HTTP contract; credentials stay in it | Changed |
| What a scaled machine gets | The image and user data you prepare | A bootstrap from the operator, passed on as user data: the agent configuration, the cluster CA, and a certificate and key or a one-time token; the image is a parameter of the group | Changed |
| Preparing a scaled machine | Your image or user data installs the agent | `norca-deployer node-scaling install-script` makes one [install script](/docs/deployer/node-scaling-machines) from the plan (packages, sysctl, `norca`, CNI, `norca-join`, the unit, the same as a native install): run when the image is built (`install: image`), or by the bootstrap at first boot (`install: boot`) | New |
| What the operator gets from the deployer | — | [`node_scaling`](/docs/deployer/configuration#node_scaling): the Variables `nodescaler/bootstrap/<region>` and `nodescaler/network/<region>`, written by `apply` | New |
| Identity of a scaled node | The certificate you put in the image or user data | A certificate of the [node CA](/docs/deployer/security#node-ca-for-nodes-that-come-up-by-themselves) (`pki issue-node-ca`), limited to client names of one region; it cannot make a server certificate | New |
| Basic mode | — | The operator makes the key and a 60-day certificate; they travel in the user data; the node is replaced before the certificate expires | New |
| Join mode | — | [`norca-join`](/docs/features/node-scaling/nodegroup#nodes-that-make-their-own-keys) makes the key on the machine, joins with a one-time token, gets a 7-day certificate, renews it at two thirds of its life with a new key and sends the agent `SIGHUP`; the join and the renewals are accepted only from the addresses the provider reports for the instance (`join_check_address`) | New |
| Shutting out a node CA | No distrust list; replace the CA | [`distrusted_ca_file`](/docs/configuration/tls) on the servers; the deployer writes it from `distrusted_ca_files` | New |
| Foreign or cloned nodes | Not detected | A ready node with the marks of a group but no instance is `foreign`: condition `ForeignNode`, made ineligible | New |
| Network of a scaled node | — | The `network` of a group is checked against the published ranges: condition `NetworkCovered` | New |
| A template that does not work | — | After `join.max_failures` failures in a row the group stops asking (`JoinFailing`) | New |
| Scale down | The autoscaler drains a node chosen by its node selector, then terminates it | One node at a time, `least_busy` or `empty`, drained with the disruption budgets; `norca.scale.protect` keeps a node | Changed |
| Rolling replacement | Not in Nomad | By template revision, `rolling.generation`, age or a mark; the new node comes first (`max_surge`) | New |
| Deleting a group | — | `deletion.policy`: `drain`, `terminate` or `orphan`; orphans are reported | New |
| A node drained by hand | — | Still counted by the operator; a scale down or replacement that stops gives it back ineligible (`held`) | New |
| Nodes installed by hand or by the deployer | — | Need no cloud-init and no `norca-join`; the operator leaves nodes without the marks of a group alone | New |

## Left out or not used

| Item | In Norca | Why |
| --- | --- | --- |
| Providers for clouds | None yet; the mock and a docker provider for labs, with the contract checks (`providertest`) | The first cloud provider is built later and tested where it will run |
| Target plugins of the Nomad Autoscaler (instance groups) | Not built in and not loaded | Machines come from provider applications; `engine = "external"` on a group leaves it to an external autoscaler |
| Scaling the servers | Not done; only clients are scaled | A server is a Raft member, installed by the deployer |
| Consul on a scaled node | Not set up | Not part of the bootstrap template |
| The gossip key on a scaled node | Not delivered | Scaled nodes are clients, and clients take no part in the gossip |
| Hot standby or stopped (warm) instances | Not kept | Free capacity is kept with `min` and the headroom |
| Revocation of node certificates | No revocation list | A node CA is short-lived (180 days) and can be shut out with `distrusted_ca_file` |
| Scaling across regions | Not done | Each region has its own decisions, operator and providers |
