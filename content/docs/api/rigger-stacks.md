---
title: "Rigger Stacks HTTP API"
linkTitle: "Rigger Stacks"
description: "The servers plan, apply and destroy stacks of Rigger: an apply or a destroy runs on the leader as an operation, with its full log on the system bus."
---

The servers can run a **stack** of Rigger, the package manager, themselves: a published stack (of the
global registry or a git repository) or a local stack sent as files. A plan and the status of a stack
answer at once; **an apply and a destroy run on the leader as an operation**, an object of the kind
`rigger.norca.io/Operation` in the namespace of the stack, and answer with it at once. The Go client is
`client.Rigger()` in `github.com/bacanoo-io/norca/norca/api`.

Every request is in the namespace of the stack (the `namespace` query parameter or
`X-Nomad-Namespace`); a stack of another namespace is refused. The releases are applied through the
[release API](/docs/api/releases) with the caller's token.

## The request

| Field | Meaning |
| --- | --- |
| `Source`, `Version` | A published stack: `<namespace>/<name>` of the global registry, or a git address; `Version` is a version constraint. A stack of the global registry needs a [sync](/docs/api/rigger-registries#sync-a-registry) of the registry `global`. |
| `Files` | A local stack sent as files instead (base64 in JSON): the archive the `rigger` program makes of a stack directory (`Stack.Archive` of the Go library). |
| `Values` | The values of the variables, as a values file (HCL). |
| `Prune` | An apply uninstalls the releases the stack no longer has. |
| `Adopt` | An apply takes over releases another manager applied. |

The token needs object `write` on `packs.norca.io/Release` in the namespace, and for a published stack
also object `read` on `rigger.norca.io/Registry`.

| Method | Path | Answers |
| --- | --- | --- |
| `PUT`, `POST` | `/v1/rigger/stack/plan` | the plan: the action of each release (`install`, `upgrade`, `unchanged`, `remove`), the values an apply generates, the secrets, the warnings |
| `PUT`, `POST` | `/v1/rigger/stack/status` | the releases the stack owns, their current revision and their drift |
| `PUT`, `POST` | `/v1/rigger/stack/apply` | the operation of the apply, started |
| `PUT`, `POST` | `/v1/rigger/stack/destroy` | the operation of the uninstall of the releases of the stack, started |

```shell-session
$ curl -X PUT -H "X-Nomad-Token: $TOKEN" "https://localhost:4646/v1/rigger/stack/apply?namespace=shop" \
    -d '{"Source": "acme/shop", "Version": "~> 1.2", "Values": "replicas = 3\n"}'
```

## Operations

An operation is planned before it starts, so an invalid stack is an error of the call. Then the leader
runs it and records it:

| Status field | Meaning |
| --- | --- |
| `phase` | `Running`, then `Succeeded`, `Failed`, `Cancelled` or `Interrupted`. |
| `plan`, `outcomes` | The action of each release, and what was done to it (the revision, or skipped). |
| `error` | The error of a failed operation. |
| `startedAt`, `finishedAt` | The times. |
| `logSubject`, `logStored`, `logDropped` | Where its log is on the bus, whether it was stored there, and how many records were not. |
| `cancelRequested` | A cancel was asked for. |

- **One operation of a stack at a time.** Another apply or destroy of the same stack is refused
  (409) and names the running one.
- **A cancel stops between two releases**: the release being applied finishes, the rest are skipped,
  the phase is `Cancelled`.
- **The token of the caller lives only in the memory of the leader**, never in the state of the
  cluster. When the leader changes, a running operation can't go on: the new leader marks it
  `Interrupted`. Apply the stack again; the releases already done come back unchanged.
- **The last 10 operations of a stack are kept**; the leader deletes older finished ones with their
  logs.

Operations are written by the servers only; they are read (and deleted) with the
[Custom Objects HTTP API](/docs/api/objects): `/v1/objects/rigger.norca.io/Operation?namespace=shop`,
`/v1/object/rigger.norca.io/Operation/<name>?namespace=shop`.

### Cancel an operation

| Method | Path | ACL Required |
| --- | --- | --- |
| `PUT`, `POST` | `/v1/rigger/operation/:name/cancel` | object `write` on `packs.norca.io/Release` in the namespace |

An operation that has ended can't be cancelled (409).

### Read the log of an operation

| Method | Path | ACL Required |
| --- | --- | --- |
| `GET` | `/v1/rigger/operation/:name/log` | object `read` on `rigger.norca.io/Operation` in the namespace |

**The full log of an operation is in a stream of the [system bus](/docs/configuration/bus)**, a
subject per operation, every record of Rigger at every level: what it fetched, verified, evaluated
and applied, as a tree of operations. It is followed while the operation runs and read in full
afterwards; it is kept within `bus.rigger_logs_max_bytes` and `bus.rigger_logs_max_age`. A server
without the bus keeps the log only in its own log. **Only the servers write these subjects, and they
are read through this endpoint only**: a [bus rule](/docs/other-specifications/acl-policy#bus-rules)
reaches neither side of `norca.rigger.oplog.>`, so no token writes into the log of an operation or
reads it past the right to read operations.

| Parameter | Meaning |
| --- | --- |
| `after` | The sequence of the last record read; the records after it. |
| `limit` | At most this many records (default 500, at most 1000). |
| `wait` | How long to wait for the first record (`10s`, at most `30s`). |

```json
{
  "Lines": [
    {"Seq": 41, "Line": {"time": "2026-11-22T12:00:01Z", "level": "INFO", "msg": "started", "op": "release.apply", "release": "db"}}
  ],
  "Phase": "Running",
  "Finished": false
}
```

To follow a running operation, read again with `after` set to the last `Seq` and a `wait`, until
`Finished` is true and no records come.
