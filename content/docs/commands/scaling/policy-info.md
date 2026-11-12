---
title: "Command: scaling policy info"
linkTitle: "scaling policy info"
description: "Display an individual Norca scaling policy."
upstream:
  path: "website/content/docs/commands/scaling/policy-info.mdx"
---

Info is used to return detailed information on the specified scaling policy.

## Usage

```plaintext
norca scaling policy info [options] <policy_id>
```

If ACLs are enabled, this command requires a token with the `read-job` and
`list-jobs` capabilities for the policy's namespace.

## General Options

- `-address=<addr>`: The address of the Norca server. Overrides the `NORCA_ADDR`
  environment variable if set. Defaults to `http://127.0.0.1:4646`.

- `-region=<region>`: The region of the Norca server to forward commands to.
  Overrides the `NORCA_REGION` environment variable if set. Defaults to the
  Agent's local region.

- `-namespace=<namespace>`: The target namespace for queries and actions bound
  to a namespace. Overrides the `NORCA_NAMESPACE` environment variable if set.
  If set to `'*'`, subcommands which support this functionality query all
  namespaces authorized to user. Defaults to the "default" namespace.

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


## Policy Info Options

- `-verbose` : Display full information.
- `-json` : Output the scaling policy in its JSON format.
- `-t` : Format and display the scaling policy using a Go template.

## Examples

Inspect an individual scaling policy:

```shell
$ norca scaling policy info 31a53813-24df-b2ad-77dc-1b4bad4e7dca

ID      = 31a53813-24df-b2ad-77dc-1b4bad4e7dca
Enabled = true
Target  = Namespace:default,Job:webapp,Group:demo
Min     = 1
Max     = 20

Policy:
{
    "check": [
        {
            "avg_sessions": [
                {
                    "query": "scalar(sum(traefik_entrypoint_open_connections{entrypoint=\"horizontal-webapp\"}))",
                    "source": "prometheus",
                    "strategy": [
                        {
                            "target-value": [
                                {
                                    "target": 10.0
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ],
    "cooldown": "1m",
    "evaluation_interval": "30s"
}
```

## Last Evaluation

For a policy that the built-in autoscaler evaluates, the command also prints
its last evaluation (the
[status of the policy](/docs/api/scaling-policies#read-the-status-of-a-scaling-policy)):
**what the checks read and asked for, and why nothing was done when nothing
was.**

```plaintext
Last Evaluation:
Time              = 2026-11-12T10:00:00Z
Desired / Running = 6 / 4
Result            = held (settling) since 2026-11-12T09:59:00Z
Checks ask for    = 2 (down)
Detail            = 4 of 6 run, not settled for 1m0s

Check  Value  Vote  Count
cpu    25     down  2
```

- `Desired / Running` is the count that was asked for and what runs of it;
  the checks are measured against the first.
- `Result` is `scaled`, `none` (the checks ask for the count the group has),
  `held` with the reason, or `error`.
- A check whose source gave no value votes `no data`.

Nothing is printed for a policy that has not been evaluated since the leader
was elected, and for a policy of the external engine.
