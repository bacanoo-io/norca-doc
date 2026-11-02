---
title: "Prometheus APM Plugin"
linkTitle: "Prometheus"
description: "The \"prometheus\" APM plugin queries a Prometheus server."
upstream:
  path: "website/content/tools/autoscaling/plugins/apm/prometheus.mdx"
---

The `prometheus` APM plugin allows querying for metrics stored in a
[Prometheus][prometheus_io] server, or in a server that implements the
Prometheus query API. It is built into Norca and runs on the leader.

## Server Configuration Options

Configure a named instance in the [`autoscaler` block](/docs/configuration/autoscaler)
of every server. The label is the name checks use as their `source`:

```hcl
server {
  autoscaler {
    enabled = true

    apm "prometheus" {
      driver = "prometheus"

      config {
        address = "http://prometheus.my.endpoint.io:9090"

        ca_cert = "/path/to/ca.crt"

        basic_auth_user     = "user"
        basic_auth_password = "secret"

        header_X-Scope-OrgID   = "my-org"
        header_X-Custom-Header = "custom-header"
      }
    }
  }
}
```

- `address` `(string: <required>)` - The address of the Prometheus endpoint used
  to perform queries.

- `basic_auth_user` `(string: "")` - The HTTP basic auth user to use when
  making requests to Prometheus.

- `basic_auth_password` `(string: "")` - The HTTP basic auth password to use
  when making requests to Prometheus.

- `ca_cert` `(string: "")` - Path to a PEM encoded CA cert file to use to
  connect to the Prometheus server.

- `header_*` `(string: "")` - Additional HTTP headers to set when making
  requests to Prometheus. Several headers may be specified and the final header
  name will be set as the key with the `header_` prefix removed.

- `skip_verify` `(bool: false)` - Do not verify TLS certificates when
  connecting to the Prometheus server. This is strongly discouraged.

Several instances, for example for two Prometheus servers, are configured with
several `apm` blocks with different labels.

## Policy Configuration Options

```hcl
check "sessions" {
  source = "prometheus"
  query  = "avg((haproxy_server_current_sessions{backend=\"http_back\"}))"
  # ...
}
```

The query should return a single time series. The time range is the check's
`query_window`; with `query_window = "instant"` an instant query is made.

[prometheus_io]: https://prometheus.io/
