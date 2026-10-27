---
title: "Concepts"
description: "The core concepts of Norca and the technical details of its operation."
upstream:
  path: "website/content/docs/concepts/index.mdx"
weight: 3
---

This section covers the core concepts of Norca and explains the
technical details of how Norca functions, its architecture, and
sub-systems.

{{< cards >}}
  {{< card link="/docs/concepts/norca" title="Norca additions" subtitle="The objects and terms Norca adds to the model." >}}
  {{< card link="/docs/concepts/architecture" title="Architecture" subtitle="Regions, servers, clients and the scheduling flow." >}}
  {{< card link="/docs/concepts/scheduling" title="Scheduling" subtitle="Evaluations, placement and preemption." >}}
  {{< card link="/docs/concepts/schedulers" title="Schedulers" subtitle="service, batch, system and sysbatch." >}}
  {{< card link="/docs/concepts/node-pools" title="Node pools" subtitle="Group clients and reserve them for jobs." >}}
  {{< card link="/docs/concepts/acl" title="Access control" subtitle="Tokens, policies, roles and auth methods." >}}
  {{< card link="/docs/concepts/security" title="Security model" subtitle="mTLS, ACLs and the threat model." >}}
  {{< card link="/docs/concepts/variables" title="Variables" subtitle="Encrypted key-value data for jobs." >}}
  {{< card link="/docs/concepts/workload-identity" title="Workload identity" subtitle="Signed identities of tasks." >}}
  {{< card link="/docs/concepts/consensus" title="Consensus" subtitle="Raft and the server quorum." >}}
  {{< card link="/docs/concepts/gossip" title="Gossip" subtitle="Serf membership between servers." >}}
  {{< card link="/docs/concepts/filesystem" title="Filesystem" subtitle="The allocation working directory." >}}
  {{< card link="/docs/concepts/plugins" title="Plugins" subtitle="Task driver, device, CNI and CSI plugins." >}}
{{< /cards >}}
