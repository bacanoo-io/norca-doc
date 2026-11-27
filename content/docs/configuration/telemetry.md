---
title: "telemetry Block"
linkTitle: "telemetry"
description: "The \"telemetry\" block configures Norca's publication of metrics and telemetry to third-party systems."
upstream:
  path: "website/content/docs/configuration/telemetry.mdx"
---

**Placement:** `telemetry`

The `telemetry` block configures the agent's metrics and their outputs: the
optional Prometheus output and the optional OpenTelemetry (OTLP) export.

```hcl
telemetry {
  publish_allocation_metrics = true
  publish_node_metrics       = true
}
```

**The built-in metrics always run, whatever this block sets:** the in-memory
metrics of the last minute behind [`/v1/metrics`](/docs/api/metrics) (JSON),
the [metrics store](/docs/configuration/metrics_store) with its history API,
the charts of the web UI, and the cluster gauges that the built-in autoscaler
(source `norca`) and node scaling decide on. Prometheus and OTLP are outputs
next to them; no Norca feature reads an external metrics system, and an
exporter that is down or misconfigured does not change them.

This section of the documentation only covers the configuration options for
`telemetry` block. To understand the architecture and metrics themselves,
please see the [Telemetry guide](/docs/operations/monitoring-nomad/) and the
[Metrics reference](/docs/operations/metrics-reference).

## `telemetry` Parameters

Due to the number of configurable parameters to the `telemetry` block,
parameters on this page are grouped by the telemetry provider.

### Common

The following options are available on all telemetry configurations.

- `disable_hostname` `(bool: false)` - Leaves the `host` label, the hostname
  of the agent, out of the metrics.

- `collection_interval` `(duration: 1s)` - Specifies the time interval at which
  the Norca agent collects telemetry data.

- `use_node_name` `(bool: false)` - Uses the name of the node instead of the
  hostname, as the `host` label and as the `host.name` resource attribute of
  the OTLP export. If set it will override
  [disable_hostname](#disable_hostname) value.

- `publish_allocation_metrics` `(bool: false)` - Specifies if Norca should
  publish runtime metrics of allocations.

- `publish_node_metrics` `(bool: false)` - Specifies if Norca should publish
  runtime metrics of nodes.

- `filter_default` `(bool: true)` - This controls whether to allow metrics that
  have not been specified by the filter. Defaults to `true`, which will allow all
  metrics when no filters are provided. **When set to `false` with no filters, no
  metrics will be sent.**

- `prefix_filter` `(list: [])` - This is a list of filter rules to apply for
  allowing/blocking metrics by prefix. A leading "<b>+</b>" will enable any
  metrics with the given prefix, and a leading "<b>-</b>" will block them.
  - If
    there is overlap between two rules, **the more specific rule will take
    precedence.**
  - **Blocking will take priority** if the same prefix is listed multiple
    times.
  - The prefixes are matched against the full metric name, so they start with
    `norca.`. The filters apply before any output: the in-memory metrics,
    Prometheus and OTLP see the same metrics.

```python
['-norca.raft', '+norca.raft.apply', '-norca.memberlist']
```

- `disable_dispatched_job_summary_metrics` `(bool: false)` - Specifies if Norca
  should ignore jobs dispatched from a parameterized job when publishing job
  summary statistics. Since each job has a small memory overhead for tracking
  summary statistics, it is sometimes desired to trade these statistics for
  more memory when dispatching high volumes of jobs.

- `disable_rpc_rate_metrics_labels` `(bool: false)` - Leaves the label of the
  requester's identity out of the RPC rate metrics of the servers, to bound
  their number of series where many identities send requests.

### `prometheus`

The `prometheus` block turns on the [Prometheus](https://prometheus.io) output
of the agent at `/v1/metrics?format=prometheus`.

```hcl
telemetry {
  prometheus {
    enabled    = true
    expiration = "60s"
  }
}
```

- `enabled` `(bool: false)` - Serves the metrics in the Prometheus text format
  at `/v1/metrics?format=prometheus`. Without it that format answers with an
  error (`415`), while `/v1/metrics` keeps returning JSON. The
  [development agent](/docs/commands/agent) (`-dev`) turns it on.

- `expiration` `(duration: "60s")` - How long a metric stays in the output
  after its last update, so the series of stopped allocations disappear.
  `"0s"` keeps every metric for the life of the agent.

The Prometheus names are the metric names with underscores:
`norca.server.rpc.request` is `norca_server_rpc_request`. Timers are
summaries.

### `otlp`

The `otlp` block exports the agent's telemetry over
[OTLP](https://opentelemetry.io/docs/specs/otlp/)/gRPC, to an OpenTelemetry
Collector or any OTLP/gRPC receiver. **The export is on as soon as the block
exists**; without it the agent creates no OpenTelemetry exporter. The
smallest form sends to the collector of the agent's own node:

```hcl
telemetry {
  otlp {}
}
```

**The agent configuration is the only source:** the `OTEL_*` environment
variables (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_RESOURCE_ATTRIBUTES`, ...)
have no effect on the agent. The agent never blocks on the receiver: it
connects on the first export, so an absent receiver does not delay or fail
its start. A failed export is logged as a warning at most once a minute per
signal, with the number of failures since the last line, and counted in the
metric `norca.agent.otlp.export_errors` (label `signal`), which the in-memory
metrics show even while the export is down. **Invalid settings and missing
files** (a CA, a client certificate, a headers file) **fail the start of the
agent**, like any other configuration error. The settings of a disabled
signal are checked too.

#### Connection

- `endpoint` `(string: "127.0.0.1:4317")` - The receiver, as `host:port` or
  `dns:///host:port`; no other scheme or path. The default is the collector of
  the agent's own node, for servers and clients alike.

- `insecure` `(bool: <see below>)` - Sends in plain text. A loopback endpoint
  (`127.0.0.0/8`, `::1`, `localhost`) is plain text by default; any other
  endpoint uses TLS unless `insecure = true` is set, and the agent then logs a
  warning at startup. `insecure = true` together with a `tls` block is an
  error.

- `compression` `(string: "gzip")` - `"gzip"` or `"none"`.

- `timeout` `(duration: "10s")` - The time one export may take, retries
  included; when it runs out the batch is dropped.

- `headers` `(map[string]string: {})` - gRPC metadata sent with every export,
  for authentication: `authorization` (Basic or Bearer) or the API key header
  of a hosted backend. The names are case-insensitive and sent in lower case;
  names starting with `grpc-` or `:` and binary (`-bin`) headers are refused.

- `headers_file` `(string: "")` - A file with more headers, one `key=value`
  per line; blank lines and lines starting with `#` are skipped, spaces
  around the key and the value are trimmed. Its values win over `headers` of
  the same name. It keeps the credentials out of the configuration file, is
  read at startup and again on `SIGHUP` (a rotated credential takes effect
  without a restart), and may be at most 64 KiB.

- `tls` <code>([TLS](#otlp-tls): nil)</code> - The CA, the server name and the
  client certificate of a TLS connection.

- `retry` <code>([Retry](#otlp-retry): nil)</code> - The retry of a failed
  export.

> [!IMPORTANT]
> Headers are credentials. **Headers (or a `headers_file`) over plain text to
> a non-loopback endpoint are an error**, so they never travel unencrypted to
> another host. The agent never logs them, and
> [`/v1/agent/self`](/docs/api/agent#query-self) shows their values as
> `<redacted>`.

#### `tls` {#otlp-tls}

Without a `tls` block a non-loopback endpoint is verified against the system
roots. With one, a loopback endpoint uses TLS too.

- `ca_file` `(string: "")` - The PEM CA the receiver's certificate is checked
  against, instead of the system roots.

- `cert_file` `(string: "")` - The client certificate (PEM) for mutual TLS.
  Given together with `key_file`.

- `key_file` `(string: "")` - The key of `cert_file`.

- `server_name` `(string: "")` - The name the receiver's certificate must
  carry; defaults to the host of `endpoint`.

- `insecure_skip_verify` `(bool: false)` - Does not verify the receiver's
  certificate.

#### `retry` {#otlp-retry}

- `enabled` `(bool: true)` - Retries a failed export.

- `initial_interval` `(duration: "5s")` - The first wait; not more than
  `max_interval`.

- `max_interval` `(duration: "30s")` - The longest wait between two attempts.

- `max_elapsed` `(duration: "1m")` - How long one batch is retried; then it is
  dropped.

#### Resource attributes

- `resource_attributes` `(map[string]string: {})` - Attributes added to the
  resource of every signal, for example `deployment.environment.name`. The
  `norca.*` names are reserved for the agent.

The agent sets these resource attributes itself:

| Attribute | Value |
| --- | --- |
| `service.name` | `norca` |
| `service.version` | the agent version |
| `service.instance.id` | the client's node ID, or the server's node ID on a server without a client |
| `host.name` | the hostname, or the node name with `use_node_name` |
| `norca.region`, `norca.datacenter` | the agent's region and datacenter |
| `norca.node.id`, `norca.node.name`, `norca.node_pool` | the client's node (clients only) |
| `norca.server.id` | the server's Raft ID (servers only) |
| `norca.agent.roles` | `server`, `client` or both |
| `os.type`, `process.pid` | the operating system and the process ID |

#### `metrics`

The export of the agent's metrics: the same metrics as `/v1/metrics` and the
Prometheus output, under the same `norca.*` names. The
[Metrics reference](/docs/operations/metrics-reference#metrics-over-otlp)
describes how they map to OTLP.

- `enabled` `(bool: true)` - Exports the metrics.

- `interval` `(duration: "30s")` - How often the metrics are exported.
  `collection_interval` stays how often the agent samples its node and
  allocation gauges.

- `temporality` `(string: "cumulative")` - `"cumulative"` (counters count from
  the start of the agent) or `"delta"`.

- `histograms` `(string: "explicit")` - `"explicit"` buckets or
  `"exponential"` histograms for the timers.

#### `traces`

- `enabled` `(bool: true)` - Turns the trace signal on.

- `sample_ratio` `(float: 0.1)` - The ratio of new root traces that are
  sampled, from `0` to `1`.

- `trust_http_parent` `(bool: false)` - Takes the trace context of HTTP API
  requests (`traceparent`) as the parent of the agent's spans instead of a
  link.

- `exclude_rpc` `(list: [])` - RPC methods (`Service.Method`, for example
  `Node.UpdateStatus`) without spans, on top of the built-in list.

- `max_queue_size` `(int: 2048)` - The spans queued for export; more are
  dropped.

- `max_export_batch` `(int: 512)` - The spans of one export; not more than
  `max_queue_size`.

#### `logs`

- `enabled` `(bool: false)` - Turns the log signal on.

- `level` `(string: "info")` - The lowest level of the signal: `trace`,
  `debug`, `info`, `warn` or `error`; independent of `log_level`.

#### Per-signal targets

The `metrics`, `traces` and `logs` blocks may each set `endpoint`, `insecure`,
`headers`, `headers_file` and `tls`, to send that signal elsewhere. A key the
signal block does not set comes from the `otlp` block. `insecure` and `tls`
count as one setting: a signal block that sets either replaces both, and a
`headers` map replaces the whole map of the `otlp` block.

#### Reload

On `SIGHUP` the agent reads the headers files again (also those of the
signal blocks) and applies a changed `traces.sample_ratio`. **Any other change
of the `otlp` block, adding or removing it included, needs a restart**; the
agent logs a warning when it sees one. The other keys of `telemetry` are not
reloaded either.

### `otlp` Examples

#### The collector of the node

The agent sends to the collector of its own node, in plain text on the
loopback interface; the
[otel-collector module](/docs/operations/monitoring#a-metrics-traces-and-logs-stack-from-the-registry)
in its OTLP mode listens there:

```hcl
telemetry {
  publish_allocation_metrics = true
  publish_node_metrics       = true

  otlp {
    endpoint = "127.0.0.1:4317"   # the default
  }
}
```

#### A central receiver with TLS and a headers file

Every agent sends straight to one receiver, verified against its CA, with a
token from a file that only the agent can read:

```hcl
telemetry {
  otlp {
    endpoint     = "otlp.example.com:4317"
    headers_file = "/etc/norca.d/otlp-headers"

    tls {
      ca_file = "/etc/norca.d/tls/otlp-ca.pem"
    }

    resource_attributes = {
      "deployment.environment.name" = "production"
    }
  }
}
```

```text {filename="/etc/norca.d/otlp-headers"}
# the token of the receiver
authorization=Bearer 0b9f...
```

#### Mutual TLS

The receiver authenticates the agent by its client certificate:

```hcl
telemetry {
  otlp {
    endpoint = "otlp.example.com:4317"

    tls {
      ca_file     = "/etc/norca.d/tls/otlp-ca.pem"
      cert_file   = "/etc/norca.d/tls/otlp-client.pem"
      key_file    = "/etc/norca.d/tls/otlp-client-key.pem"
      server_name = "otlp.example.com"
    }
  }
}
```

#### One signal elsewhere

The metrics go to the collector of the node; the traces go to another
backend over TLS, with their own credentials:

```hcl
telemetry {
  otlp {
    metrics {
      interval = "60s"
    }

    traces {
      endpoint     = "traces.example.com:4317"
      headers_file = "/etc/norca.d/traces-headers"

      tls {
        ca_file = "/etc/norca.d/tls/traces-ca.pem"
      }
    }
  }
}
```
