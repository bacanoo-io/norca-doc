---
title: "Command: alloc checks"
linkTitle: "alloc checks"
description: "Outputs service health check status information."
upstream:
  path: "website/content/docs/commands/alloc/checks.mdx"
---

The `alloc checks` command outputs the latest health check status information for checks in the allocation.

## Usage

```plaintext
norca alloc checks [options] <allocation>
```

Outputs the latest health check status information for services in the allocation
using the Norca service discovery provider. This command accepts an allocation
ID or prefix as the sole argument.

When ACLs are enabled, this command requires a token with the 'read-job' capability 
for the allocation's namespace. The 'list-jobs' capability is required to run the 
command with an allocation ID prefix instead of the exact allocation ID.

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

## Checks Options

- `-verbose`: Display verbose output.

- `-json`: Output the allocation in its JSON format.

- `-t`: Format and display the health checks status using a Go template.

## Examples

Show checks of an alloc health check using its short ID:

```shell
$ norca alloc checks e0fdbd85

Status of 1 Nomad Service Checks

ID         =  9f4e18fd0867cebb19a8fac3d7a1cf27
Name       =  alive
Group      =  example.cache[0]
Task       =  (group)
Service    =  redis-cache
Status     =  success
Mode       =  healthiness
Timestamp  =  2023-03-09T16:10:23+01:00
Output     =  nomad: tcp ok
```

The `-json` flag can be used to get the health checks status in json format:

```shell
norca alloc checks -json 54fde4f8

{
    "9810e90177a4c21ce3bfe04dc7da6131": {
        "Check": "alive",
        "Group": "example.cache[0]",
        "ID": "9810e90177a4c21ce3bfe04dc7da6131",
        "Mode": "healthiness",
        "Output": "nomad: tcp ok",
        "Service": "redis-cache",
        "Status": "success",
        "StatusCode": 0,
        "Task": "",
        "Timestamp": 1678444309
    }
}
```

Or use the `-t` flag to format and display the health checks using a Go template:

```shell
$ norca alloc checks -t '{{range .}}{{ printf "%s: %s\n" .ID  .Status }}{{end}}' 54

9810e90177a4c21ce3bfe04dc7da6131: success
```
