---
title: "Scheduling"
description: "Learn about how scheduling works in Norca."
upstream:
  path: "website/content/docs/concepts/scheduling/index.mdx"
---

Scheduling is a core function of Norca. It is the process of assigning tasks
from jobs to client machines. The design is heavily inspired by Google's work on
both [Omega: flexible, scalable schedulers for large compute clusters][omega] and
[Large-scale cluster management at Google with Borg][borg]. See the links below
for implementation details on scheduling in Norca.

- [Scheduling Internals](/docs/concepts/scheduling/scheduling/) - An overview of how the scheduler works.
- [Placement](/docs/concepts/scheduling/placement/) - Explains how placements are computed and how they can be adjusted.
- [Preemption](/docs/concepts/scheduling/preemption/) - Details of preemption, an advanced scheduler feature introduced in Nomad 0.9.

[omega]: https://research.google.com/pubs/pub41684.html
[borg]: https://research.google.com/pubs/pub43438.html
