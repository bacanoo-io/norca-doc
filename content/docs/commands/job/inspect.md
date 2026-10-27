---
title: "Command: job inspect"
linkTitle: "job inspect"
description: "The job inspect command is used to inspect a submitted job."
upstream:
  path: "website/content/docs/commands/job/inspect.mdx"
---

**Alias: `norca inspect`**

The `job inspect` command is used to inspect the content of a submitted job.

## Usage

```plaintext
norca job inspect [options] <job>
```

The `job inspect` command requires a single argument, a submitted job's name, and
will retrieve the JSON version of the job. This JSON is valid to be submitted to
the [Job HTTP API]. This command is useful to inspect what version of a job
Norca is running.

When ACLs are enabled, this command requires a token with the `read-job`
capability for the job's namespace. The `list-jobs` capability is required to
run the command with a job prefix instead of the exact job ID.

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

Each `NORCA_*` environment variable above is also accepted with its Nomad
name, for example `NOMAD_ADDR` for `NORCA_ADDR`. The `NORCA_*` variable takes
precedence when both are set.

## Inspect Options

- `-version`: Display only the job at the given job version.
- `-json` : Output the job in its JSON format.
- `-t` : Format and display the job using a Go template.

## Examples

Inspect a submitted job:

```shell
$ norca job inspect redis
{
    "Job": {
        "Region": "global",
        "ID": "redis
        "Name": "redis
        "Type": "service",
        "Priority": 50,
        "AllAtOnce": false,
        "Datacenters": [
            "dc1"
        ],
        "Constraints": [
            {
                "LTarget": "${attr.kernel.name}",
                "RTarget": "linux",
                "Operand": "="
            }
        ],
        "TaskGroups": [
            {
                "Name": "cache",
                "Count": 1,
                "Constraints": null,
                "Tasks": [
                    {
                        "Name": "redis",
                        "Driver": "docker",
                        "User": "",
                        "Config": {
                            "image": "redis:latest",
                            "port_map": [
                                {
                                    "db": 6379
                                }
                            ]
                        },
                        "Constraints": null,
                        "Env": null,
                        "Services": [
                            {
                                "Id": "",
                                "Name": "cache-redis",
                                "Tags": [
                                    "global",
                                    "cache"
                                ],
                                "PortLabel": "db",
                                "Checks": [
                                    {
                                        "Id": "",
                                        "Name": "alive",
                                        "Type": "tcp",
                                        "Command": "",
                                        "Args": null,
                                        "Path": "",
                                        "Protocol": "",
                                        "Interval": 10000000000,
                                        "Timeout": 2000000000
                                    }
                                ]
                            }
                        ],
                        "Resources": {
                            "CPU": 500,
                            "MemoryMB": 256,
                            "DiskMB": 300,
                            "Networks": [
                                {
                                    "Public": false,
                                    "CIDR": "",
                                    "ReservedPorts": null,
                                    "DynamicPorts": [
                                        {
                                            "Label": "db",
                                            "Value": 0
                                        }
                                    ],
                                    "IP": "",
                                    "MBits": 10
                                }
                            ]
                        },
                        "Meta": null,
                        "KillTimeout": 5000000000,
                        "LogConfig": {
                            "MaxFiles": 10,
                            "MaxFileSizeMB": 10
                        },
                        "Artifacts": null
                    }
                ],
                "RestartPolicy": {
                    "Interval": 300000000000,
                    "Attempts": 10,
                    "Delay": 25000000000,
                    "Mode": "delay"
                },
                "Meta": null
            }
        ],
        "Update": {
            "Stagger": 10000000000,
            "MaxParallel": 1
        },
        "Periodic": null,
        "Meta": null,
        "Status": "running",
        "StatusDescription": "",
        "CreateIndex": 5,
        "ModifyIndex": 7
    }
}
```

[job http api]: /docs/api/jobs/
