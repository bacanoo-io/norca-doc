---
title: "Command: alloc status"
linkTitle: "alloc status"
description: "Display status and metadata about existing allocations and their tasks."
upstream:
  path: "website/content/docs/commands/alloc/status.mdx"
---

The `alloc status` command displays status information and metadata
about an existing allocation and its tasks. It can be useful while
debugging to reveal the underlying reasons for scheduling decisions or
failures, as well as the current state of its tasks. As of Norca
0.7.1, alloc status also shows allocation modification time in
addition to create time. As of Nomad 0.8, alloc status shows
information about reschedule attempts. As of Nomad 0.11, alloc status
shows volume claims when a job claims volumes.

## Usage

```plaintext
norca alloc status [options] <allocation>
```

An allocation ID or prefix must be provided. If there is an exact match, the
full details of the allocation will be displayed. Otherwise, a list of matching
allocations and information will be displayed.

When ACLs are enabled, this command requires a token with the `read-job` and
`list-jobs` capabilities for the allocation's namespace.

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

## Alloc Status Options

- `-short`: Display short output. Shows only the most recent task event.
- `-stats`: Display detailed resource usage statistics.
- `-verbose`: Show full information.
- `-json` : Output the allocation in its JSON format.
- `-t` : Format and display the allocation using a Go template.

## Examples

Short status of an alloc:

```shell
$ norca alloc status --short 0af996ed
ID                  = 0af996ed
Eval ID             = be9bde98
Name                = example.cache[0]
Node ID             = 43c0b14e
Job ID              = example
Job Version         = 0
Client Status       = running
Client Description  = <none>
Desired Status      = run
Desired Description = <none>
Created At          = 07/25/17 16:12:48 UTC
Deployment ID       = 0c83a3b1
Deployment Health   = healthy

Tasks
Name   State    Last Event  Time
redis  running  Started     07/25/17 16:12:48 UTC
web    running  Started     07/25/17 16:12:49 UTC
```

Full status of an alloc, which shows one of the tasks dying and then being restarted:

```shell
$ norca alloc status 0af996ed
ID                   = 0af996ed
Eval ID              = be9bde98
Name                 = example.cache[0]
Node ID              = 43c0b14e
Job ID               = example
Job Version          = 0
Client Status        = running
Client Description   = <none>
Desired Status       = run
Desired Description  = <none>
Created              = 5m ago
Modified             = 5m ago
Deployment ID        = 0c83a3b1
Deployment Health    = healthy
Replacement Alloc ID = 0bc894ca
Reschedule Attempts  = 1/3

Task "redis" is "running"
Task Resources
CPU        Memory           Disk     Addresses
1/500 MHz  6.3 MiB/256 MiB  300 MiB  db: 127.0.0.1:27908

CSI Volumes:
ID            Plugin  Provider  Schedulable  Mount Options
vol-4150af42  ebs0    aws.ebs   true         <none>

Task Events:
Started At     = 07/25/17 16:12:48 UTC
Finished At    = N/A
Total Restarts = 0
Last Restart   = N/A

Recent Events:
Time                   Type        Description
07/25/17 16:12:48 UTC  Started     Task started by client
07/25/17 16:12:48 UTC  Task Setup  Building Task Directory
07/25/17 16:12:48 UTC  Received    Task received by client

Task "web" is "running"
Task Resources
CPU        Memory           Disk     Addresses
1/500 MHz  6.3 MiB/256 MiB  300 MiB  db: 127.0.0.1:30572

Task Events:
Started At     = 07/25/17 16:12:49 UTC
Finished At    = N/A
Total Restarts = 0
Last Restart   = N/A

Recent Events:
07/25/17 16:12:49 UTC  Started     Task started by client
07/25/17 16:12:48 UTC  Task Setup  Building Task Directory
07/25/17 16:12:48 UTC  Received    Task received by client
```

Verbose status can also be accessed:

```shell
$ norca alloc status -verbose 0af996ed
ID                     = 0af996ed-aff4-8ddb-a566-e55ebf8969c9
Eval ID                = be9bde98-0490-1beb-ced0-012d10ddf22e
Name                   = example.cache[0]
Node ID                = 43c0b14e-7f96-e432-a7da-06605257ce0c
Job ID                 = example
Job Version            = 0
Client Status          = running
Client Description     = <none>
Desired Status         = run
Desired Description    = <none>
Created                = 07/25/17 16:12:48 UTC
Modified               = 07/25/17 16:12:48 UTC
Deployment ID          = 0c83a3b1-8a7b-136b-0e11-8383dc6c9276
Deployment Health      = healthy
Reschedule Eligibility = 2m from now
Evaluated Nodes        = 1
Filtered Nodes         = 0
Exhausted Nodes        = 0
Allocation Time        = 38.474µs
Failures               = 0

Task "redis" is "running"
Task Resources
CPU        Memory           Disk     Addresses
1/500 MHz  6.3 MiB/256 MiB  300 MiB  db: 127.0.0.1:27908

Task Events:
Started At     = 07/25/17 16:12:48 UTC
Finished At    = N/A
Total Restarts = 0
Last Restart   = N/A

Recent Events:
Time                   Type        Description
07/25/17 16:12:48 UTC  Started     Task started by client
07/25/17 16:12:48 UTC  Task Setup  Building Task Directory
07/25/17 16:12:48 UTC  Received    Task received by client

Task "web" is "running"
Task Resources
CPU        Memory           Disk     Addresses
1/500 MHz  6.3 MiB/256 MiB  300 MiB  db: 127.0.0.1:30572

Task Events:
Started At     = 07/25/17 16:12:49 UTC
Finished At    = N/A
Total Restarts = 0
Last Restart   = N/A

Recent Events:
Time                   Type        Description
07/25/17 16:12:49 UTC  Started     Task started by client
07/25/17 16:12:48 UTC  Task Setup  Building Task Directory
07/25/17 16:12:48 UTC  Received    Task received by client
```
