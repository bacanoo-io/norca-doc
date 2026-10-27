---
title: "Gossip Protocol"
description: "Norca uses a gossip protocol to manage membership. All of this is provided through the use of the Serf library."
upstream:
  path: "website/content/docs/concepts/gossip.mdx"
---

Norca uses a [gossip protocol](https://en.wikipedia.org/wiki/Gossip_protocol)
to manage membership. This is provided through the use of the [Serf library](https://www.serf.io/).
The gossip protocol used by Serf is based on
["SWIM: Scalable Weakly-consistent Infection-style Process Group Membership Protocol"](https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf),
with a few minor adaptations. There are more details about [Serf's protocol here](https://www.serf.io/docs/concepts/gossip.html).

> [!WARNING]
> **Advanced Topic!** This page covers technical details of
> the internals of Norca. You do not need to know these details to effectively
> operate and use Norca. These details are documented here for those who wish
> to learn about them without having to go spelunking through the source code.

## Gossip in Norca

Norca makes use of a single global WAN gossip pool that all servers participate in.
Membership information provided by the gossip pool allows servers to perform cross region
requests. The integrated failure detection allows Norca to gracefully handle an entire region
losing connectivity, or just a single server in a remote region. The gossip protocol
is also used to detect servers in the same region to perform automatic clustering
via the [consensus protocol](/docs/concepts/consensus/).

All of these features are provided by leveraging [Serf](https://www.serf.io/). It
is used as an embedded library to provide these features. From a user perspective,
this is not important, since the abstraction should be masked by Norca. It can be useful
however as a developer to understand how this library is leveraged.
