---
title: "Deployer examples"
linkTitle: "Examples"
description: "Complete deployment plans with a comment on every setting."
weight: 14
origin: "norca-deployer/examples"
---

Complete plans with a comment on every setting. YAML and HCL plans use the same keys, and the YAML and HCL versions of an example load to the same plan. Paths in a plan (keys, `.deb` files, scripts, policies) are relative to the plan file.

| Example | Content |
| --- | --- |
| [Single node](/docs/deployer/examples/single-node) | One machine running the Norca server and client: TLS, gossip encryption, ACLs, host packages, a script. |
| [Cluster](/docs/deployer/examples/cluster) | Three servers, Linux clients with Docker, a Windows client; firewall, PKI and SPIFFE, node labels and pools, secrets, NATS for the applications, an ACL policy for event stream readers. |
| [Several datacenters with NATS](/docs/deployer/examples/multi-datacenter) | One region over three datacenters: a server per datacenter, the event stream on the system bus with 3 replicas, a NATS cluster with one server per datacenter for the applications. |
| [Local development node](/docs/deployer/examples/local-dev) | Norca on the machine the deployer runs on, without SSH, on loopback only. |
| [Adding a node](/docs/deployer/examples/add-node) | A client added to a running cluster: only the new node is installed. |
| [Removing nodes](/docs/deployer/examples/decommission-node) | Clients and servers taken out of a running cluster: drain, Raft removal, uninstall. |

The cluster example reads the signing key of the Docker APT repository from `keys/docker.asc`; download it from <https://download.docker.com/linux/debian/gpg> next to the plan.
