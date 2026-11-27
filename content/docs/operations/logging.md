---
title: "Logging"
linkTitle: "Logging"
description: "The structured logs of the Norca agent: where they go, the text and JSON layout, the key convention, the log levels, and the trace IDs that join log lines to traces."
weight: 4
---

Every Norca agent, server or client, writes structured logs: a constant
message and key/value pairs. The keys follow one convention across the agent,
so the same key means the same thing in every component, and a log backend
can filter on it. This page describes the layout of the log lines, the keys
and the levels. The [audit records](/docs/operations/audit-log) of operator
write calls are log lines of this kind too.

## Where the logs go

The agent's logs go to every output that is configured, with the
[agent configuration](/docs/configuration):

- **standard error** of the agent process, always;
- **a file** with [`log_file`](/docs/configuration#log_file), rotated by size,
  time or count (`log_rotate_bytes`, `log_rotate_duration`,
  `log_rotate_max_files`);
- **syslog** with [`enable_syslog`](/docs/configuration#enable_syslog) (Unix
  only);
- **a live stream** with [`norca monitor`](/docs/commands/monitor) or
  [`/v1/agent/monitor`](/docs/api/agent#stream-logs), at the level the stream
  asks for, whatever `log_level` the agent writes with.

[`log_level`](/docs/configuration#log_level) sets the lowest level the agent
writes (`trace`, `debug`, `info`, `warn` or `error`; `info` by default) and is
reloaded on `SIGHUP`. [`log_json`](/docs/configuration#log_json) switches the
outputs from text to JSON, and
[`log_include_location`](/docs/configuration#log_include_location) adds the
source file and line of each call.

## Layout of a log line

### Text

A text line has the time, the level, the name of the logger (the component),
the message and the key/value pairs:

```text
2026-11-27T10:15:42.481+0100 [INFO]  client.alloc_runner.task_runner: restarting task: alloc_id=4d1f0c7e-8b2a-6f3e-91c4-2d0e5b7a9c13 task=web reason="Restart within policy" delay=15.73s
2026-11-27T10:15:42.493+0100 [DEBUG] http: request complete: trace_id=4bf92f3577b34da6a3ce929d0e0e4736 span_id=00f067aa0ba902b7 http_method=PUT http_path=/v1/jobs duration=1.445739ms
```

The keys a component adds to all of its lines (the allocation of an
allocation runner, the trace of a request) come first.

### JSON

With `log_json = true` every line is one JSON object:

```json
{"@level":"debug","@message":"request complete","@module":"http","@timestamp":"2026-11-27T10:15:42.493118+01:00","duration":1445739,"http_method":"PUT","http_path":"/v1/jobs","span_id":"00f067aa0ba902b7","trace_id":"4bf92f3577b34da6a3ce929d0e0e4736"}
```

| Field | Value |
| --- | --- |
| `@timestamp` | The time of the line, with microseconds and the time zone offset |
| `@level` | `trace`, `debug`, `info`, `warn` or `error` |
| `@module` | The logger: `agent`, `http`, `worker`, `client`, `client.alloc_runner`, `nomad.audit`, ... |
| `@message` | The message, a constant text |
| `@caller` | The source file and line, with `log_include_location` only |
| every other field | A key of the call, at the top level |

- **Errors** are their message, a string.
- **Durations** (`duration` and the other `time.Duration` values) are integers
  in nanoseconds; the text layout writes them as `1.445739ms`.
- **Messages never contain values.** A message is the same text on every call
  (`request complete`, `failed to evaluate plan`), and what varies is in the
  keys, so a message can be searched for as it is.

## Key convention

A key is a lower case snake_case word or phrase that names its value. The
identities below use the same key in every component:

| Key | Value |
| --- | --- |
| `error` | The error; a second error of the same line ends in `_error` (`create_error`) |
| `namespace` | Namespace name |
| `job_id`, `job_version` | Job ID, job version |
| `task_group`, `task` | Task group name, task name |
| `alloc_id`, `alloc_name` | Allocation ID, allocation name |
| `eval_id` | Evaluation ID |
| `deployment_id` | Deployment ID |
| `node_id`, `node_name` | Client node ID, client node name |
| `server_id`, `server`, `server_addr` | Server ID, server name, server address |
| `region`, `datacenter`, `node_pool` | Region, datacenter, node pool |
| `rpc_method` | RPC method, as `Service.Method` (`Job.Register`) |
| `http_method`, `http_path`, `http_status` | HTTP API request: method, path with the query string, status code |
| `duration` | A duration |
| `index` | A Raft or state store index |
| `address` | A network address |
| `driver`, `plugin`, `plugin_type` | Plugin name and type |
| `volume_id` | Volume ID |
| `object_kind`, `object_name` | Custom objects |
| `trace_id`, `span_id` | The trace of the line ([below](#trace-ids-in-the-log-lines)) |

Rules that hold for every log call of the agent, which the build checks:

- **An object is logged by its ID, never as a whole:** an allocation as
  `alloc_id`, a job as `job_id`, an ACL token as `accessor_id`.
- **No secret is logged:** never the secret ID of a token or an
  authentication token.
- **A key appears once per line.**

### Context of a component

A component that works on one object adds its identity to all of its lines,
so the lines of one evaluation, plan, allocation or task can be filtered by
one key:

| Component | Keys on every line |
| --- | --- |
| Scheduling worker (`worker`) | `worker_id`; for the evaluation in process `eval_id`, `job_id`, `namespace` |
| Plan applier of the leader | `eval_id`, `job_id`, `namespace` of the plan |
| Node drainer | `node_id` of a draining node; `job_id`, `namespace` of a draining job |
| Built-in autoscaler | `policy_id`, `namespace` and the target: `job_id` and `task_group`, or `node_group` |
| Allocation runner (`client.alloc_runner`) | `alloc_id` |
| Task runner | `alloc_id`, `task` |

## Levels

| Level | Used for |
| --- | --- |
| `error` | Something failed and needs an operator, or data or work was lost. |
| `warn` | Degraded or retried; recovers by itself; worth a look when it repeats. |
| `info` | Lifecycle and state changes of the agent and of long-lived objects (leadership, joins, allocations started and stopped), and the [audit records](/docs/operations/audit-log). Not per request. |
| `debug` | Per request and per decision: every HTTP request (`request complete`), every evaluation the worker processes. |
| `trace` | Per iteration, and payloads. |

An HTTP API request that fails with a client error (4xx) is logged at
`debug`; one that fails with a server error (5xx) at `error`.

## Trace IDs in the log lines

With an [`otlp` block](/docs/configuration/telemetry#otlp) in the agent's
`telemetry` block, the log lines of a traced operation carry the
`trace_id` and the `span_id` of its span, the same IDs as in the exported
[traces](/docs/operations/tracing):

- the HTTP API's `request complete` and `request failed` lines;
- the scheduling worker's lines of an evaluation (dequeue, scheduler run,
  plan submission, evaluation update and acknowledgement);
- the plan applier's lines of a plan;
- the error lines of the phases of an allocation on a client (`prerun failed`,
  `prestart failed`, `running driver failed`, `poststart failed`, the errors
  of a stop or a destroy).

**A trace ID exists even when the trace is not sampled**, so the lines of one
request correlate at any `sample_ratio`, and with `traces { enabled = false }`
too. Without an `otlp` block the agent creates no trace IDs and the lines have
no such keys; the routes and RPC methods that are
[not traced](/docs/operations/tracing#what-is-not-traced) have none either.

A line of a request can be found from the `Norca-Trace-Id` header of the HTTP
response, which carries the same trace ID:

```shell
norca monitor -log-level=debug -json | jq -c 'select(.trace_id == "4bf92f3577b34da6a3ce929d0e0e4736")'
```

## See also

- [Audit records](/docs/operations/audit-log) of operator write calls
- [Tracing](/docs/operations/tracing)
- The [agent configuration](/docs/configuration) (`log_level`, `log_json`,
  `log_file`, `enable_syslog`) and [`norca monitor`](/docs/commands/monitor)
