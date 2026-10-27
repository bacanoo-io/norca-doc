---
title: "Command: operator scheduler set-config"
linkTitle: "operator scheduler set-config"
description: "Modify the scheduler configuration."
upstream:
  path: "website/content/docs/commands/operator/scheduler/set-config.mdx"
---

The scheduler operator set-config command is used to modify the scheduler
configuration.

## Usage

```plaintext
norca operator scheduler set-config [options]
```

If ACLs are enabled, this command requires a token with the `operator:write`
capability.

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

## Set Config Options

- `-check-index` - If set, the scheduler config is only updated if the passed
  modify index matches the current server side version. If a non-zero value is
  passed, it ensures that the scheduler config is being updated from a known
  state.

- `-scheduler-algorithm` - Specifies whether scheduler binpacks or spreads
  allocations on available nodes. Must be one of `["binpack"|"spread"]`.

- `-memory-oversubscription` - When true, tasks may exceed their reserved memory
  limit, if the client has excess memory capacity. Tasks must specify [`memory_max`]
  to take advantage of memory oversubscription. Must be one of `[true|false]`.

- `-reject-job-registration` - When true, the server will return permission denied
  errors for job registration, job dispatch, and job scale APIs, unless the ACL
  token for the request is a management token. If ACLs are disabled, no user
  will be able to register jobs. This allows operators to shed load from automated
  processes during incident response. Must be one of `[true|false]`.

- `-pause-eval-broker` - When set to true, the eval broker which usually runs on
  the leader will be disabled. This will prevent the scheduler workers from
  receiving new work. Must be one of `[true|false]`.

- `-preempt-batch-scheduler` - Specifies whether preemption for batch jobs
  is enabled. Note that if this is set to true, then batch jobs can preempt any
  other jobs. Must be one of `[true|false]`.

- `-preempt-service-scheduler` - Specifies whether preemption for service jobs
  is enabled. Note that if this is set to true, then service jobs can preempt any
  other jobs. Must be one of `[true|false]`.

- `-preempt-sysbatch-scheduler` - Specifies whether preemption for system batch
  jobs is enabled. Note that if this is set to true, then system batch jobs can
  preempt any other jobs. Must be one of `[true|false]`.

- `-preempt-system-scheduler` - Specifies whether preemption for system jobs
  is enabled. Note that if this is set to true, then system jobs can preempt any
  other jobs. Must be one of `[true|false]`.

## Examples

Modify the scheduler algorithm to spread:

```shell
$ norca operator scheduler set-config -scheduler-algorithm=spread
Scheduler configuration updated!
```

Modify the scheduler algorithm to spread using the check index flag:

```shell
$ norca operator scheduler set-config -scheduler-algorithm=spread -check-index=5
Scheduler configuration updated!
```

[`memory_max`]: /docs/job-specification/resources#memory_max
