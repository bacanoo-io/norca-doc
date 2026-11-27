---
title: "Tracing"
linkTitle: "Tracing"
description: "OpenTelemetry traces of the Norca agents: the spans of API requests, RPCs, Raft writes, scheduling and allocation phases, their attributes, sampling, propagation, and how to follow a job from the API to the client."
weight: 6
---

Norca agents trace their own work with [OpenTelemetry](https://opentelemetry.io)
and export the spans over OTLP/gRPC, next to the metrics, through the
[`otlp` block](/docs/configuration/telemetry#otlp). A trace follows one
operation across the agents: an HTTP API request, the RPCs and forwards
between the servers, the Raft write, the scheduling of the evaluation it
created, and the plan the leader applies. The phases of an allocation on a
client (start, stop, restart, garbage collection) are traces of their own,
joined to the scheduling by their attributes.

## Turn it on

Tracing is part of the `otlp` block; its `traces` signal is on by default:

```hcl {filename="norca.hcl"}
telemetry {
  otlp {
    traces {
      sample_ratio = 0.1      # the default
    }
  }
}
```

- **Without an `otlp` block the agent does no tracing work at all:** no
  spans, no trace IDs in the logs, no `Norca-Trace-Id` header.
- **With the block and `traces { enabled = false }`** nothing is exported or
  sampled, but every traced request still gets a trace ID, for the
  [log lines](/docs/operations/logging#trace-ids-in-the-log-lines) and the
  `Norca-Trace-Id` response header.
- The traces go to the receiver of the `otlp` block, or to their own one with
  the `endpoint`, `tls` and `headers` of the `traces` block
  ([per-signal targets](/docs/configuration/telemetry#per-signal-targets)).
- `sample_ratio` is applied again on `SIGHUP`; the other settings need a
  restart.

The keys of the `traces` block are described with the
[`telemetry` block](/docs/configuration/telemetry#traces). Trace every agent,
servers and clients: a trace is only whole when every agent it passes through
exports its part.

## A job run, traced

`norca job run` against a follower gives one trace, from the API request to
the leader's apply of the plan:

```text
PUT /v1/jobs                                    HTTP API of the agent that got the request
└─ Job.Register                                 RPC, on the follower
   └─ forward Job.Register                      norca.forward = leader
      └─ Job.Register                           RPC, on the leader
         └─ raft.apply JobRegisterRequestType
            └─ fsm.apply JobRegisterRequestType
               └─ eval.process                  the scheduling worker, on any server
                  ├─ scheduler.service
                  │  ├─ scheduler.compute
                  │  │  └─ scheduler.select     one per task group
                  │  ├─ plan.submit
                  │  │  └─ Plan.Submit          (forwarded when the worker runs on a follower)
                  │  │     ├─ plan.evaluate     on the leader
                  │  │     └─ plan.apply
                  │  │        └─ fsm.apply ApplyPlanResultsRequestType
                  │  └─ Eval.Update
                  └─ Eval.Ack
```

The allocations the plan placed start on their clients in separate traces,
`alloc.start`, with the same `norca.eval.id` (see
[Follow a job to the client](#follow-a-job-to-the-client)).

## Spans

### HTTP API

Every agent, server or client, starts a **server span per HTTP API request**,
named after the method and the registered route, never the raw path:
`PUT /v1/jobs`, `GET /v1/job/`, `POST /v1/node/`. It carries the standard
HTTP attributes of OpenTelemetry, such as `http.request.method`,
`http.route`, `url.path`, `http.response.status_code`, `server.address` and
`user_agent.original`. **The query string is not recorded.** The request's
RPCs are its children.

The response carries the trace ID of the request in the `Norca-Trace-Id`
header, sampled or not, so a caller can quote it:

```shell
curl -si -X PUT -d @job.json https://127.0.0.1:4646/v1/jobs | grep -i norca-trace-id
Norca-Trace-Id: 4bf92f3577b34da6a3ce929d0e0e4736
```

### Servers

| Span | Kind | Where | Attributes |
| --- | --- | --- | --- |
| `<Service>.<Method>` (`Job.Register`) | server | Every RPC a server serves, from other agents and from itself (the worker's `Eval.Ack`, `Plan.Submit`, ...) | `rpc.system` = `norca`, `rpc.service`, `rpc.method`; an error status when the call fails |
| `forward <Service>.<Method>` | client | A server forwarding a call to the leader, to another server, to another region or to a client | `norca.forward`: `leader`, `server`, `region` or `client` |
| `raft.apply <MessageType>` | internal | A server writing a request to Raft, from the submission to the leader's FSM response | `norca.raft.message_type`, `norca.raft.index`, `norca.raft.size` (bytes) |
| `fsm.apply <MessageType>` | internal | The leader applying the entry to its state; the followers apply it without a span | `norca.raft.message_type`, `norca.raft.index` |
| `eval.process` | internal | A scheduling worker processing one evaluation, from the dequeue to the ack or nack | `norca.eval.id`, `norca.job.id`, `norca.namespace`, `norca.eval.triggered_by`, `norca.scheduler.type`, `norca.eval.status` (the status the scheduler gave it); an error status on a nack |
| `scheduler.<type>` | internal | The scheduler run: `scheduler.service`, `scheduler.batch`, `scheduler.system`, `scheduler.sysbatch`, `scheduler._core` | `norca.scheduler.type` |
| `scheduler.compute` | internal | The reconciliation of the job's allocations with its desired state, placements included | |
| `scheduler.select` | internal | The node selection of one task group, below `scheduler.compute`; never a span per node considered | `norca.task_group`, `norca.scheduler.placed`, `norca.scheduler.failed` |
| `plan.submit` | client | The worker submitting the plan | `norca.eval.id` |
| `plan.evaluate` | internal | The leader checking the plan against its state; the gap between `Plan.Submit` and it is the wait in the plan queue | `norca.eval.id`, `norca.plan.refresh_index` (a forced refresh), `norca.plan.rejected_nodes` |
| `plan.apply` | internal | The leader writing the plan's result to Raft, until it is committed | `norca.eval.id`, `norca.plan.alloc_index` |

The worker's other calls (`Eval.Update`, `Eval.Create`, `Eval.Reblock`) are
children of the scheduler run that made them.

### Clients

The phases of an allocation are **short traces of their own**, never one span
for the life of the allocation, and always sampled:

| Span | Phase |
| --- | --- |
| `alloc.start` | The prerun hooks and the first start of every task, until each one started, failed to start or exited (poststop tasks are not waited for) |
| `alloc.stop` | A stop from the servers: the prekill hooks, the kill of the tasks, and the postrun hooks once the tasks exited |
| `alloc.restart` | A restart of the allocation's tasks through the API or by a check |
| `alloc.gc` | The destroy of the allocation: the kill of the tasks, the postrun and destroy hooks |

They carry `norca.alloc.id`, `norca.eval.id` (the evaluation that placed the
allocation), `norca.job.id`, `norca.namespace` and `norca.task_group`. Below a
phase:

| Span | Kind | What | Attributes |
| --- | --- | --- | --- |
| `alloc.hook.<hook>` | internal | One allocation runner hook (`alloc.hook.network`, `alloc.hook.alloc_dir`, ...): prerun, prekill, postrun, destroy and task restart hooks | |
| `task.start` | internal | One start attempt of a task: the prestart hooks, the driver's start and the poststart hooks; below `alloc.start` or `task.restart` | the allocation's attributes and `norca.task` |
| `task.stop` | internal | The kill of a task, below `alloc.stop` or `alloc.gc` | the same |
| `task.restart` | internal | The restart of a task, below `alloc.restart`; the parent of the task's next `task.start` | the same |
| `task.hook.<hook>` | internal | One task runner hook (`task.hook.artifacts`, `task.hook.template`, ...): prestart, poststart, stop and prekill hooks | |
| `artifact.download` | internal | The download of one artifact, below `task.hook.artifacts` | `norca.artifact.destination` |
| `<Service>.<Method>` | client | An RPC to the servers that a runner or its hooks make within a phase; the server's span of the call is its child | `rpc.system`, `rpc.service`, `rpc.method` |
| the plugin's gRPC method | client | A call of an external driver plugin within a phase: the driver's `StartTask` below `task.start` (`hashicorp.nomad.plugins.drivers.proto.Driver/StartTask`) | the standard gRPC attributes |

The RPC endpoints of a client agent (the calls the servers forward to it, such
as an allocation restart) get server spans like the RPCs of the servers.

## Sampling

The agent decides at the start of a trace whether it is sampled (exported):

- **A span with a parent follows its parent.** The RPCs, forwards, Raft
  writes and the scheduling of a sampled request are sampled, those of an
  unsampled one are not, so a trace is whole or absent.
- **The important operations always start a sampled trace**, at any ratio:
  - the job writes (`Job.Register`, `Job.Deregister`, `Job.Plan`,
    `Job.Dispatch`, `Job.Scale`, `Job.Revert`, `Periodic.Force`, ...), the
    node operations (registration, drain, eligibility), the allocation
    operations (stop, eviction, restart, signal, garbage collection) and the
    deployment operations;
  - the operator calls: Raft and autopilot, the scheduler configuration, the
    seal, the keyring, the backups, garbage collection;
  - the writes of ACL objects, namespaces, node pools, quotas, admission and
    network policies, service intentions, certificate authorities, custom
    objects and their kinds, releases, the Rigger operations, CSI
    volumes and plugins, secrets and secret engines, change data capture
    consumers;
  - the HTTP API writes (`PUT`, `POST`, `DELETE`) of the routes that lead to
    these calls and of the agent's join, force-leave, keyring and scheduler
    worker routes, and also the reads of the Raft, autopilot, scheduler
    configuration and snapshot routes of `/v1/operator/`;
  - the phases of allocations on the clients (`alloc.start`, `alloc.stop`,
    `alloc.restart`, `alloc.gc`).

  The status, finalizers and events subresources of custom objects, which
  their controllers write all the time, are not among them.
- **Every other new trace is sampled at `sample_ratio`**, `0.1` by default:
  the reads of the API, for example, and the evaluations that start a trace
  of their own ([below](#follow-a-job-to-the-client)).

Excluded operations ([below](#what-is-not-traced)) create no span, so
heartbeats and long polls do not use up the ratio.

The decision is made when a trace starts, so an error cannot change it. To
keep every trace with an error or a long duration, set `sample_ratio = 1` and
sample in an OpenTelemetry Collector with its `tail_sampling` processor;
tail sampling needs every span of a trace in the same collector, so it runs
in a central collector that the collectors of the nodes forward to.

## Propagation

- **HTTP:** the agent reads the W3C `traceparent` header of a request. By
  default it is **not trusted**: the request starts a new trace, and the
  incoming context becomes a **link** of its first span. With
  `trust_http_parent = true` the incoming context is the parent, and its
  sampled flag decides for the whole trace, so an API client can then force or
  suppress sampling; turn it on only when the callers of the API are your own
  traced services. Baggage is not read.
- **RPC:** the msgpack RPC has no headers, so the trace context travels in the
  RPC arguments as a W3C `traceparent`. A server continues it, forwards it to
  the leader, another server, another region or a client, and passes it on to
  its Raft write. Trace state and baggage are not carried.
- **Raft:** the log entry of a sampled write carries its trace context, which
  the leader's `fsm.apply` span continues; the followers apply the entry
  without a span. **Nothing trace-related is stored in the state.**
- **Evaluations:** the leader keeps the trace context of the request that
  created an evaluation in memory while the evaluation waits in its broker,
  and the worker that dequeues it continues the trace. The context is not
  replicated: a new leader does not have it.
- **Scheduling to client:** an allocation carries no trace context. The
  client phases start their own traces and are joined to the scheduling by
  their attributes.
- **Plugins:** no trace context is sent to plugin processes; the plugins' side
  of a call is not traced.

## Follow a job to the client

1. **Find the scheduling trace.** `norca job run` prints the evaluation ID;
   the `eval.process` span with that `norca.eval.id` is in the job's trace,
   below the API request. The job's write is always sampled, so this trace is
   there at any ratio. The `Norca-Trace-Id` header of the API response names
   the same trace.
2. **Find the client phases.** Search the `alloc.start` spans with the same
   `norca.eval.id`: one trace per allocation the plan placed, on its client.
   Later phases of an allocation (`alloc.stop`, `alloc.restart`, `alloc.gc`)
   share its `norca.alloc.id`.
3. **Read the log lines.** The log lines of the request, the worker and the
   plan applier carry the `trace_id` of the trace, the client phases' error
   lines the `trace_id` of their phase
   ([log correlation](/docs/operations/logging#trace-ids-in-the-log-lines)).

An evaluation does not always continue the trace of its creator:

- **A blocked evaluation:** when a placement fails for lack of resources, the
  job's trace shows the `Eval.Create` of the blocked evaluation. Its
  processing once resources free up is a new trace, sampled at the ratio, with
  the blocked evaluation's `norca.eval.id`.
- **A leader change:** the new leader enqueues the outstanding evaluations
  again without their trace context; each is processed in a new trace.
- **A nacked evaluation:** its redelivery is processed in a new trace.
- Evaluations that the servers create themselves (a node that misses its
  heartbeats, the periodic garbage collection, `scheduler._core`) start new
  traces.

New traces of evaluations are sampled at `sample_ratio`; their
`eval.process` span has the `norca.eval.id` either way, and the allocations
they place start in always-sampled `alloc.start` traces with that ID.

## What is not traced

- **Excluded RPC methods**, which never get a span: `Status.Ping`,
  `Node.UpdateStatus`, `Node.GetClientAllocs`, `Node.UpdateAlloc`,
  `Eval.Dequeue`, `Alloc.GetAllocs`, the methods of
  [`exclude_rpc`](/docs/configuration/telemetry#traces), blocking queries
  (a minimum index), and streaming RPCs.
- **Excluded HTTP routes:** `/v1/agent/health`, `/v1/metrics` and its
  `history`, `series` and `summary` routes, `/v1/event/stream`,
  `/v1/agent/monitor`, the log and file streams of `/v1/client/fs/`,
  allocation exec sessions, the web UI, `/debug/pprof/`, and blocking queries
  (`index` greater than 0). They get no span, no trace ID in their log lines
  and no `Norca-Trace-Id` header.
- **The followers' FSM:** only the leader's apply of an entry has a span.
- **On the clients:** the calls of CSI plugins; image pulls; the calls of the
  built-in drivers, which run inside the agent; the long-lived plugin calls
  (`WaitTask`, `TaskEvents`, `TaskStats`, exec streams, fingerprints, stats);
  restarts by the restart policy (only restarts within `alloc.restart` are);
  the allocation update hooks; and the runners restored after an agent
  restart, whose first start is not an `alloc.start`.
- **The start of an agent:** the agent starts its server, client and HTTP API
  first and the OTLP export after them, once it has the IDs of its resource.
  In between it traces nothing: no spans, no trace IDs in the log lines and no
  `Norca-Trace-Id` header. The window is short, but a restarted server that
  wins the election again processes its first evaluations in it, untraced.

## Export

The spans are exported in batches of at most `max_export_batch` spans (512),
or after five seconds when fewer are waiting. The agent keeps at most
`max_queue_size` spans (2048) waiting for or in an export. Spans it cannot keep are
dropped and counted:

| Metric | Labels | Meaning |
| --- | --- | --- |
| `norca.agent.otlp.dropped` | `signal` = `traces`, `reason` = `queue_full` | Sampled spans dropped because the queue was full |
| `norca.agent.otlp.dropped` | `signal` = `traces`, `reason` = `export_failed` | Spans of a batch whose export failed after its retries |
| `norca.agent.otlp.export_errors` | `signal` = `traces` | Failed exports |

A rising `queue_full` count means the receiver is slower than the agent, or
the ratio is too high for the queue; see the
[Metrics reference](/docs/operations/metrics-reference#agent-metrics).

## See also

- The [`telemetry` block](/docs/configuration/telemetry#traces): the `traces`
  keys
- [Logging](/docs/operations/logging): `trace_id` and `span_id` in the log lines
- [Monitoring and observability](/docs/operations/monitoring): a collector and
  a backend for the traces from the Norca registry
