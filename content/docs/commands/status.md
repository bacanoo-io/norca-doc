---
title: "Command: status"
linkTitle: "status"
description: "Display the status output for any Norca resource."
upstream:
  path: "website/content/docs/commands/status.mdx"
---

The `status` command displays the status output for any Norca resource.

## Usage

```plaintext
norca status [options] <identifier>
```

The status command accepts any Norca identifier or identifier prefix as its sole
argument. The command detects the type of the identifier and routes to the
appropriate status command to display more detailed output.

If the ID is omitted, the command lists out all of the existing jobs. This is
for backwards compatibility and should not be relied on.

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

## Examples

Display the status of a job:

```shell
$ norca status example
ID            = example
Name          = example
Submit Date   = 08/28/17 23:01:39 UTC
Type          = service
Priority      = 50
Datacenters   = dc1
Status        = running
Periodic      = false
Parameterized = false

Summary
Task Group  Queued  Starting  Running  Failed  Complete  Lost
cache       0       0         1        0       0         0

Latest Deployment
ID          = f5506391
Status      = running
Description = Deployment is running

Deployed
Task Group  Desired  Placed  Healthy  Unhealthy
cache       1        1       0        0

Allocations
ID        Node ID   Task Group  Version  Desired  Status   Created At
e1d14a39  f9dabe93  cache       0        run      running  08/28/17 23:01:39 UTC
```

Display the status of an allocation:

```shell
$ norca status e1d14a39
ID                  = e1d14a39
Eval ID             = cc882755
Name                = example.cache[0]
Node ID             = f9dabe93
Job ID              = example
Job Version         = 0
Client Status       = running
Client Description  = <none>
Desired Status      = run
Desired Description = <none>
Created At          = 08/28/17 23:01:39 UTC
Deployment ID       = f5506391
Deployment Health   = healthy

Task "redis" is "running"
Task Resources
CPU        Memory           Disk     Addresses
4/500 MHz  6.3 MiB/256 MiB  300 MiB  db: 127.0.0.1:21752

Task Events:
Started At     = 08/28/17 23:01:39 UTC
Finished At    = N/A
Total Restarts = 0
Last Restart   = N/A

Recent Events:
Time                   Type        Description
08/28/17 23:01:39 UTC  Started     Task started by client
08/28/17 23:01:39 UTC  Task Setup  Building Task Directory
08/28/17 23:01:39 UTC  Received    Task received by client
```

Display the status of a deployment:

```shell
$ norca status f5506391
ID          = f5506391
Job ID      = example
Job Version = 0
Status      = successful
Description = Deployment completed successfully

Deployed
Task Group  Desired  Placed  Healthy  Unhealthy
cache       1        1       1        0
```

Display the status of a node:

```shell
$ norca status f9dabe93
ID      = f9dabe93
Name    = nomad-server01
Class   = <none>
DC      = dc1
Drain   = false
Status  = ready
Drivers = docker,exec,java,qemu,raw_exec,rkt
Uptime  = 4h17m24s

Allocated Resources
CPU           Memory           Disk
500/8709 MHz  256 MiB/2.0 GiB  300 MiB/24 GiB

Allocation Resource Utilization
CPU         Memory
3/8709 MHz  6.3 MiB/2.0 GiB

Host Resource Utilization
CPU           Memory           Disk
116/8709 MHz  335 MiB/2.0 GiB  12 GiB/38 GiB

Allocations
ID        Node ID   Task Group  Version  Desired  Status   Created At
e1d14a39  f9dabe93  cache       0        run      running  08/28/17 23:01:39 UTC
```
