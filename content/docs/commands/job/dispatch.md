---
title: "Command: job dispatch"
linkTitle: "job dispatch"
description: "The dispatch command is used to create an instance of a parameterized job."
upstream:
  path: "website/content/docs/commands/job/dispatch.mdx"
---

The `job dispatch` command is used to create new instances of a [parameterized
job]. The parameterized job captures a job's configuration and runtime
requirements in a generic way and `dispatch` is used to provide the input for
the job to run against. A parameterized job is similar to a function definition,
and dispatch is used to invoke the function.

Each time a job is dispatched, a unique job ID is generated. This allows a
caller to track the status of the job, much like a future or promise in some
programming languages.

## Usage

```plaintext
norca job dispatch [options] <parameterized job> [input source]
```

Dispatch creates an instance of a parameterized job. A data payload to the
dispatched instance can be provided via stdin by using "-" for the input source
or by specifying a path to a file. Metadata can be supplied by using the meta
flag one or more times.

The payload has a **size limit of 16384 bytes (16KiB)**.

An optional idempotency token can be specified to prevent dispatching more than
one instance of the same job. The token can have any value and will be matched
with existing jobs. If an instance with the same token already exists, the job
will not be dispatched.

Upon successful creation, the dispatched job ID will be printed and the
triggered evaluation will be monitored. This can be disabled by supplying the
detach flag.

On successful job submission and scheduling, exit code 0 will be returned. If
there are job placement issues encountered (unsatisfiable constraints, resource
exhaustion, etc), then the exit code will be 2. Any other errors, including
client connection issues or internal errors, are indicated by exit code 1.

When ACLs are enabled, this command requires a token with the `dispatch-job`
capability for the job's namespace. The `list-jobs` capability is required to
run the command with a job prefix instead of the exact job ID. The `read-job`
capability is required to monitor the resulting evaluation when `-detach` is
not used.

See the [multiregion] documentation for additional considerations when
dispatching parameterized jobs.

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

## Dispatch Options

- `-meta`: Meta takes a key/value pair separated by "=". The metadata key will
  be merged into the job's metadata. The job may define a default value for the
  key which is overridden when dispatching. The flag can be provided more than
  once to inject multiple metadata key/value pairs. Arbitrary keys are not
  allowed. The parameterized job must allow the key to be merged.

- `-detach`: Return immediately instead of monitoring. A new evaluation ID
  will be output, which can be used to examine the evaluation using the
  [eval status] command

- `-idempotency-token`: Optional identifier used to prevent more than one
  instance of the job from being dispatched.

- `-id-prefix-template`: Optional prefix added to dispatched job IDs.

- `-verbose`: Show full information.

## Examples

Dispatch against a parameterized job with the ID "video-encode" and
passing in a configuration payload via stdin:

```shell
$ cat << EOF | norca job dispatch video-encode -
{
  "s3-input": "https://video-bucket.s3-us-west-1.amazonaws.com/cb31dabb1",
  "s3-output": "https://video-bucket.s3-us-west-1.amazonaws.com/a149adbe3",
  "input-codec": "mp4",
  "output-codec": "webm",
  "quality": "1080p"
}
EOF
Dispatched Job ID = video-encode/dispatch-1485379325-cb38d00d
Evaluation ID     = 31199841

==> Monitoring evaluation "31199841"
    Evaluation triggered by job "example/dispatch-1485379325-cb38d00d"
    Allocation "8254b85f" created: node "82ff9c50", group "cache"
    Evaluation status changed: "pending" -> "complete"
==> Evaluation "31199841" finished with status "complete"
```

Dispatch against a parameterized job with the ID "video-encode" and
passing in a configuration payload via a file:

```shell
$ norca job dispatch video-encode video-config.json
Dispatched Job ID = video-encode/dispatch-1485379325-cb38d00d
Evaluation ID     = 31199841

==> Monitoring evaluation "31199841"
    Evaluation triggered by job "example/dispatch-1485379325-cb38d00d"
    Allocation "8254b85f" created: node "82ff9c50", group "cache"
    Evaluation status changed: "pending" -> "complete"
==> Evaluation "31199841" finished with status "complete"
```

Dispatch against a parameterized job with the ID "video-encode" using the detach
flag:

```shell
$ norca job dispatch -detach video-encode video-config.json
Dispatched Job ID = example/dispatch-1485380684-c37b3dba
Evaluation ID     = d9034c4e
```

Dispatch with an idempotency token for the first time:

```shell
$ norca job dispatch -idempotency-token=prod video-encode video-config.json
Dispatched Job ID = video-encode/dispatch-1485379325-cb38d00d
Evaluation ID     = 31199841

==> Monitoring evaluation "31199841"
    Evaluation triggered by job "example/dispatch-1485379325-cb38d00d"
    Allocation "8254b85f" created: node "82ff9c50", group "cache"
    Evaluation status changed: "pending" -> "complete"
==> Evaluation "31199841" finished with status "complete"
```

Dispatch with the same idempotency token:

```shell
$ norca job dispatch -idempotency-token=prod video-encode video-config.json
Job "video-encode/dispatch-1485379325-cb38d00d" already dispatched with idempotency token "prod".
```

Dispatch with an id prefix:

```shell
$ norca job dispatch -id-prefix-template=config1 video-encode video-config1.json
Jb
Dispatched Job ID = video-encode/dispatch-config1-1485379325-cb38d00d
Evaluation ID     = 31199841

==> Monitoring evaluation "31199841"
    Evaluation triggered by job "example/dispatch-config1-1485379325-cb38d00d"
    Allocation "8254b85f" created: node "82ff9c50", group "cache"
    Evaluation status changed: "pending" -> "complete"
==> Evaluation "31199841" finished with status "complete"
```

[eval status]: /docs/commands/eval/status/
[parameterized job]: /docs/job-specification/parameterized/ 'Norca parameterized Job Specification'
[multiregion]: /docs/job-specification/multiregion#parameterized-dispatch
