---
title: "Command: operator metrics"
linkTitle: "operator metrics"
description: "The `operator metrics` command queries the metrics API endpoint for metrics data related to the current Norca process."
upstream:
  path: "website/content/docs/commands/operator/metrics.mdx"
---

The `operator metrics` command queries the [metrics API endpoint](/docs/api/metrics/).

## Usage

```plaintext
norca operator metrics [options]
```

## General Options

- `-address=<addr>`: The address of the Norca server. Overrides the `NORCA_ADDR`
  environment variable if set. Defaults to `http://127.0.0.1:4646`.

- `-region=<region>`: The region of the Norca server to forward commands to.
  Overrides the `NORCA_REGION` environment variable if set. Defaults to the
  Agent's local region.

- `-no-color`: Disables colored command output. Alternatively,
  `NORCA_CLI_NO_COLOR` may be set. This option takes precedence over
  `-force-color`.

- `-force-color`: Forces colored command output. This can be used in cases where
  the usual terminal detection fails. Alternatively, `NORCA_CLI_FORCE_COLOR`
  may be set. This option has no effect if `-no-color` is also used.

- `-ca-cert=<path>`: Path to a PEM encoded CA cert file to use to verify the
  Norca server SSL certificate. Overrides the `NORCA_CACERT` environment
  variable if set.

- `-ca-path=<path>`: Path to a directory of PEM encoded CA cert files to verify
  the Norca server SSL certificate. If both `-ca-cert` and `-ca-path` are
  specified, `-ca-cert` is used. Overrides the `NORCA_CAPATH` environment
  variable if set.

- `-client-cert=<path>`: Path to a PEM encoded client certificate for TLS
  authentication to the Norca server. Must also specify `-client-key`. Overrides
  the `NORCA_CLIENT_CERT` environment variable if set.

- `-client-key=<path>`: Path to an unencrypted PEM encoded private key matching
  the client certificate from `-client-cert`. Overrides the `NORCA_CLIENT_KEY`
  environment variable if set.

- `-tls-server-name=<value>`: The server name to use as the SNI host when connecting
  via TLS. Overrides the `NORCA_TLS_SERVER_NAME` environment variable if set.

- `-tls-skip-verify`: Do not verify TLS certificate. This is highly not
  recommended. Verification will also be skipped if `NORCA_SKIP_VERIFY` is set.

- `-token`: The SecretID of an ACL token to use to authenticate API requests with.
  Overrides the `NORCA_TOKEN` environment variable if set.

Each `NORCA_*` environment variable above is also accepted with its Nomad
name, for example `NOMAD_ADDR` for `NORCA_ADDR`. The `NORCA_*` variable takes
precedence when both are set.

## Metrics Specific Options

- `-pretty`: Pretty prints the JSON output
- `-format <format>`: Specify output format (`prometheus`)
- `-json`: Output the allocation in its JSON format.
- `-t`: Format and display allocation using a Go template.

## Output

The output of `norca operator metrics` is a JSON representation of the
[metrics API endpoint](/docs/api/metrics/).

```shell
$ norca operator metrics -pretty
{
  "Counters": [
    {
      "Count": 11,
      "Labels": {},
      "Max": 1.0,
      "Mean": 1.0,
      "Min": 1.0,
      "Name": "nomad.nomad.rpc.query",
      "Stddev": 0.0,
      "Sum": 11.0
    }
  ],
  "Gauges": [
    {
      "Labels": {
        "node_id": "cd7c3e0c-0174-29dd-17ba-ea4609e0fd1f",
        "datacenter": "dc1"
      },
      "Name": "nomad.client.allocations.blocked",
      "Value": 0.0
    },
    {
      "Labels": {
        "datacenter": "dc1",
        "node_id": "cd7c3e0c-0174-29dd-17ba-ea4609e0fd1f"
      },
      "Name": "nomad.client.allocations.migrating",
      "Value": 0.0
    }
  ],
  "Samples": [
    {
      "Count": 20,
      "Labels": {},
      "Max": 0.03544100001454353,
      "Mean": 0.023678050097078084,
      "Min": 0.00956599973142147,
      "Name": "nomad.memberlist.gossip",
      "Stddev": 0.005445327799243976,
      "Sum": 0.4735610019415617
    },
    {
      "Count": 1,
      "Labels": {},
      "Max": 0.0964059978723526,
      "Mean": 0.0964059978723526,
      "Min": 0.0964059978723526,
      "Name": "nomad.nomad.client.update_status",
      "Stddev": 0.0,
      "Sum": 0.0964059978723526
    }
  ]
}
```
