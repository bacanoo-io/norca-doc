---
title: Kubernetes-inspired features
description: Which Norca features take their idea from Kubernetes, and how they fit Norca's model.
weight: 2
---

Several Norca features take their idea from Kubernetes, where the concept has proven useful for
operating many teams' workloads on one cluster. Norca does not run or embed Kubernetes and contains no
Kubernetes code: the design and the implementation of these features are Norca's own, built on the
Nomad v1.6.5 data model (namespaces, jobs, task groups, allocations, Raft state, the event stream and
ACLs).

| Norca feature | The idea comes from Kubernetes | How it fits Norca |
| --- | --- | --- |
| [Namespace quotas](/docs/features/quotas) | ResourceQuota and LimitRange | Quota specifications attached to namespaces, with defaults and maxima per task and limits on the number of allocations, checked when a job is submitted |
| [Admission control](/docs/features/admission-control) | ValidatingAdmissionPolicy (CEL) and admission webhooks | Policies evaluated by the servers when a job or object is submitted, before it is written to Raft |
| [Event stream extensions](/docs/features/event-stream) | Watches with a resource version | New topics (Variables) and resumable subscriptions on the existing event stream |
| [Cross-job affinity](/docs/features/cross-job-affinity) | Inter-pod affinity and anti-affinity | `colocate` and `separate` rules between task groups of different jobs, evaluated by the scheduler |
| [Disruption budget](/docs/features/disruption-budget) | PodDisruptionBudget and the Eviction API | A per-group budget respected by drains and by evictions (`norca alloc stop -respect-disruption`) |
| [Health check roles](/docs/features/health-check-roles) | Startup, readiness and liveness probes | A role on service checks: startup checks gate the others, readiness controls the catalog, liveness restarts the task |
| [Network rules](/docs/features/network-rules) | NetworkPolicy and AdminNetworkPolicy | Namespace policies and cluster-level admin policies enforced with nftables in the allocation's network namespace |
| [Operator framework](/docs/features/operator-framework) | CustomResourceDefinitions and the operator pattern | Native object kinds with schemas stored in Raft, a Go controller SDK and controllers running as Norca jobs |

The [design specification](/docs/design/kubernetes-features-spec) describes for each item how Kubernetes
works, what Nomad v1.6.5 already offered, and the semantics chosen for Norca.

## Common principles

- **Native objects.** Each feature stores its objects in the servers' Raft state like jobs and
  Variables, with ACL capabilities, an event stream topic per object type and API and CLI commands.
- **Compatibility.** Job files without the new blocks behave as in Nomad 1.6.5. New Raft message types
  are ignored safely by servers that don't know them where possible, and the features stay off until
  every server of the region runs a Norca version that supports them.
- **One cluster, many teams.** The features are scoped by namespace where Kubernetes scopes by namespace,
  and cluster-wide objects (admin network policies, object kinds) need management or operator
  permissions.
