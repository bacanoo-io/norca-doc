---
title: "Core and scheduler"
linkTitle: "Core and scheduler"
description: "The findings of the review of the node endpoint, the core structures and the scheduler stack, with their verdicts, fixes, tests and commits."
weight: 4
---

The review, part of the second round, covered the node and allocation
endpoints of the servers, the drainer, the core structures (job, allocation,
node, evaluation) and the scheduler stack with its feasibility iterators. It
reported 8 findings. The fixes are in commit `d88223f40` of the norca
repository. Paths are relative to the `nomad` directory of the norca
repository. See the [section page](/docs/white-room) for the process.

| ID | Finding | Verdict | Commit |
| --- | --- | --- | --- |
| CORE-SEC-01 | `Node.UpdateAlloc` checks only the node of the first allocation | Valid (worse than reported) | `d88223f40` |
| CORE-NIL-01 | `tasksUpdated` dereferences a missing `LogConfig` | Invalid | — |
| CORE-NIL-02 | `tasksUpdated` dereferences a removed or renamed task group | Invalid | — |
| CORE-NIL-03 | Stop, evict, node evaluations and the drainer dereference `alloc.Job` | Invalid | — |
| CORE-NIL-04 | `AllocAffinityFeasibilityIterator.SetTaskGroup` dereferences a nil group | Invalid | — |
| CORE-SCHED-01 | A task group without a network keeps the network of the previous group | Valid | `d88223f40` |
| CORE-SCHED-02 | `NetworkChecker.SetNetwork` doubles the port list with zero ports | Valid (low impact) | `d88223f40` |
| CORE-SCHED-03 | The shallow copy in `genericAllocUpdateFn` shares data with the state store | Invalid | — |
| extra | `Node.UpdateStatus` never checks the caller | Valid (not in the report) | `d88223f40` |

## Node and allocation endpoints

### CORE-SEC-01 `Node.UpdateAlloc` and the allocations of other nodes

**Report.** `Node.UpdateAlloc` checks only the node of the first allocation of
the request (`args.Alloc[0].NodeID`). Neither the other entries of the request
nor the stored allocations are checked against that node, so any client node
can set the client status (failed, complete) of allocations running on other
nodes, which stops them and triggers rescheduling across the cluster.

**Verdict: valid, worse than reported.** The endpoint, inherited from Nomad,
authenticated the caller but never used the identity: it only checked that the
node named by the first allocation exists and is not down. A node secret is
mapped to the identity of its node only with ACLs enabled, and there a request
without a token resolves to the anonymous token, so not only another client
node but even an anonymous caller could set the client status of any
allocation of the cluster.

**Fix.** Every allocation of the request must name the node of the request,
and every stored allocation that is updated must run on that node; with ACLs
enabled the caller must also be authenticated with the secret ID of that
node. Otherwise the whole request is refused with permission denied, instead
of skipping the foreign entries as the report proposed. With ACLs disabled
the cluster has no authorization at all, so only the consistency checks
apply. File: `nomad/node_endpoint.go`. Two existing tests that sent the
updates of several nodes in one request (`nomad/drainer_int_test.go`,
`nomad/job_endpoint_multiregion_test.go`) now send one request per node.

**Test.** `TestClientEndpoint_UpdateAlloc_OtherNode` in
`nomad/node_endpoint_test.go`, with and without ACLs: a node cannot update
the allocations of another node, whatever node it names in the request, and
with ACLs enabled only with its own secret ID.

**Commit.** `d88223f40`.

## Nil dereferences

### CORE-NIL-01 `tasksUpdated` and a missing `LogConfig`

**Report.** `tasksUpdated` compares `at.LogConfig.Disabled` with
`bt.LogConfig.Disabled` without checking for nil, so a task without a log
configuration panics the scheduler.

**Verdict: invalid.** `Task.Validate` rejects a task without a log
configuration ("Missing Log Config"), and `tasksUpdated` compares only jobs
read from the state store, which have all been validated. The same function
already dereferences the task resources on the same basis. Nothing was
changed.

### CORE-NIL-02 `tasksUpdated` and a removed or renamed task group

**Report.** `tasksUpdated` looks up the task group in both jobs and reads
`len(a.Tasks)` and `len(b.Tasks)`; when the group was removed or renamed, the
lookup returns nil and the scheduler panics.

**Verdict: invalid.** `tasksUpdated` is called only from `inplaceUpdate` and
`genericAllocUpdateFn`, for allocations grouped under a task group of the new
job, and the allocation's own job always contains the group the allocation
belongs to. The allocations of a removed group take the stop path and never
reach this comparison. Nothing was changed.

### CORE-NIL-03 `alloc.Job` in stop, evict, node evaluations and the drainer

**Report.** `Alloc.Stop`, `Alloc.Evict`, the node evaluations of
`createNodeEvals`, the drainer and the mTLS code read `alloc.Job.Priority`,
`alloc.Job.Type` and `alloc.Job.ID` without a nil check. The allocations of a
purged job have no job, so stopping or draining them panics the leader.

**Verdict: invalid.** The state store refuses an allocation without a job and
attaches the job again on every update of an allocation (from the existing
allocation, or by the denormalization of a plan). Purging a job does not
remove the job stored on its allocations. All the cited code paths read the
allocations from the state store. Nothing was changed.

### CORE-NIL-04 `AllocAffinityFeasibilityIterator.SetTaskGroup(nil)`

**Report.** Unlike `allocAffinityTracker.SetTaskGroup`, the iterator's
`SetTaskGroup` reads `tg.Name` without a nil check, so passing a nil task
group panics.

**Verdict: invalid.** The only callers are `GenericStack.Select` and
`SystemStack.Select`, which have already read `tg.Volumes` and `tg.Name`
before the call; nobody passes nil. Nothing was changed.

## Scheduling stack

### CORE-SCHED-01 Network of the previous task group

**Report.** `Select` of the stacks calls `taskGroupNetwork.SetNetwork` only
for a task group with a network. A group without a network that follows one
with a network (for example a bridge network with host ports) inherits its
constraints and is wrongly rejected on the nodes that do not support them.

**Verdict: valid.** The stack is reused for every task group of an
evaluation, so a group without a network was checked against the network
mode and ports of the group placed before it, and rejected on nodes without
that network (after a bridge or CNI group, for example).

**Fix.** `SetNetwork(nil)` resets the checker to its initial state (host
mode, no ports), and both `GenericStack.Select` and `SystemStack.Select` call
it for a group without a network. Files: `scheduler/feasible.go`,
`scheduler/stack.go`.

**Test.** `TestStack_Select_NetworkResetBetweenGroups` in
`scheduler/stack_test.go`: a group without a network is not checked against
the network of the group placed before it.

**Commit.** `d88223f40`.

### CORE-SCHED-02 Zero ports in `NetworkChecker.SetNetwork`

**Report.** `SetNetwork` makes the port slice with its length instead of its
capacity, then appends the ports, so the list has twice as many entries,
half of them zero ports, which costs memory and iterations on every node
checked.

**Verdict: valid, low impact.** The zero ports have no host network and were
skipped by the check, so the results were right; only the work was wasted.

**Fix.** The slice is made with length 0 and the capacity of the ports. File:
`scheduler/feasible.go`.

**Test.** `TestNetworkChecker_SetNetwork` in `scheduler/feasible_test.go`.

**Commit.** `d88223f40`.

### CORE-SCHED-03 Shallow copy in `genericAllocUpdateFn`

**Report.** For an in-place update the scheduler makes a shallow copy of the
allocation from the state store, so pointers and maps (`TaskStates`,
`DesiredTransition`) stay shared with the stored object, and a write through
them corrupts the state store.

**Verdict: invalid.** The shallow copy is intended, as in Nomad: everything
after it replaces top-level fields only, and the Raft apply decodes fresh
objects. The only nested write, `signAllocIdentities` on
`SignedIdentities`, writes only for tasks without an identity, which an
in-place update cannot have: the task names are the same, and all of them
were signed when the allocation was first applied. Nothing was changed.

## Found during the checking

### `Node.UpdateStatus` never checks the caller

This was not in the report. While CORE-SEC-01 was checked, `Node.UpdateStatus`
was found to authenticate the caller without checking it. With ACLs enabled
anyone, even an anonymous caller, could set the status of any node, for
example mark it down and so reschedule its work. On the leader the caller's
connection was also registered as the connection of the node, so the
server-to-client RPCs of that node (logs, exec, file system) would have gone
to the caller.

**Fix.** A client node may update only its own status (authenticated with its
secret ID); any other caller needs node write. The leader's heartbeat timer,
which marks nodes down through this endpoint, now sends the leader token.
Real clients already send their secret ID. Files: `nomad/node_endpoint.go`,
`nomad/heartbeat.go`.

**Test.** `TestClientEndpoint_UpdateStatus_ACL` in
`nomad/node_endpoint_test.go` (a node can update only its own status,
anything else needs node write) and `TestHeartbeat_InvalidateHeartbeat_ACL`
in `nomad/heartbeat_test.go` (the leader marks a node down with ACLs
enabled).

**Commit.** `d88223f40`.

### Left unchanged

`Node.EmitEvents` has the same gap: it does not check the caller either, so
any caller, even an anonymous one with ACLs enabled, can add events to any
node. The impact is low, as node events are informational, and it was not
changed.
