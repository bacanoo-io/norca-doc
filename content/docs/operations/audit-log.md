---
title: "Audit records of operator writes"
linkTitle: "Audit records"
description: "One structured log record per operator write call on the servers: who called, which operation, with which parameters, and the result."
weight: 5
---

Every server writes an **audit record** for each operator write call it
handles: a Raft peer removed, the scheduler configuration changed, a key
rotated, a backup restored, a node drained. The record says who made the
call, what it changed and whether it succeeded, so the question "who did
this?" has an answer that the [event stream](/docs/api/events) alone does not
give: the events show the change, the audit record shows the call that caused
it.

An audit record is an [agent log line](/docs/operations/logging) at the `info`
level, under the logger `norca.audit` of the server, and goes wherever the
server's logs go: standard error, [`log_file`](/docs/configuration#log_file),
syslog, and [`norca monitor`](/docs/commands/monitor). Nothing has to be turned
on.

## What is recorded

- **One record per call, on the server that handles it:** the leader for a
  call forwarded to the leader, the named server for a call sent to one
  server. A server that only forwards the call writes nothing, so a call that
  is forwarded to the leader or to another region is recorded once.
- **The result, also of refused calls:** a call that is denied for lack of
  permission is recorded with `result=denied`, a call that fails with
  `result=error`.
- A call that never reaches the server that would handle it (no leader, a
  region that cannot be reached) is not recorded.
- **Reads are not recorded**, only the writes of the
  [operations below](#recorded-operations).
- **No secret ever enters a record:** never a token, an unseal share, a key,
  recovered key material, the age identity of a restore or a secret value.
  Each operation records only the parameters listed for it.

> [!NOTE]
> The [audit file of the secret store](/docs/configuration/secrets) is a
> separate record of every read and write of secret values; the audit records
> of this page cover the operator calls.

## Fields of a record

```json
{"@level":"info","@message":"operator write call","@module":"norca.audit","@timestamp":"2026-11-27T10:20:01.204512+01:00","accessor_id":"8a3c9f2e-51d0-4b7e-a6c2-0f9e3d4b1a77","audit":true,"deadline":3600000000000,"drain":true,"identity":"token:8a3c9f2e-51d0-4b7e-a6c2-0f9e3d4b1a77","ignore_system_jobs":false,"mark_eligible":false,"node_id":"f2b8c1d4-7e3a-4c95-b0d6-91a2e5f3c8b7","operation":"Node.UpdateDrain","region":"global","result":"success","server":"server-1","token_name":"ops-alice"}
```

The same record in the text layout:

```text
2026-11-27T10:20:01.204+0100 [INFO]  norca.audit: operator write call: audit=true operation=Node.UpdateDrain server=server-1 region=global identity=token:8a3c9f2e-51d0-4b7e-a6c2-0f9e3d4b1a77 accessor_id=8a3c9f2e-51d0-4b7e-a6c2-0f9e3d4b1a77 token_name=ops-alice node_id=f2b8c1d4-7e3a-4c95-b0d6-91a2e5f3c8b7 drain=true mark_eligible=false deadline=1h0m0s ignore_system_jobs=false result=success
```

| Key | Value |
| --- | --- |
| `audit` | `true`, on every audit record and on no other log line |
| `operation` | The RPC method of the call, `Service.Method` (`Node.UpdateDrain`) |
| `server`, `region` | The name and the region of the server that handled the call |
| `identity` | Who made the call ([below](#identity)) |
| `accessor_id`, `token_name` | The accessor ID and the name of the caller's ACL token |
| `alloc_id`, `job_id`, `namespace`, `task` | The allocation, job, namespace and task of a caller with a workload identity |
| `remote_ip` | The address of the caller, when the server knows it |
| the parameters | The parameters of the operation ([below](#recorded-operations)) |
| `result` | `success`, `denied` (permission denied) or `error` |
| `error` | The error, with `denied` and `error` |

### Identity

`identity` names the caller in one of these forms:

| Form | Caller |
| --- | --- |
| `token:<accessor ID>` | An ACL token, with `accessor_id` and `token_name`. A call without a token on a cluster with ACLs is `token:anonymous` (the anonymous token) with `remote_ip`; the leader's own calls are `token:leader`. |
| `alloc:<allocation ID>` | A task with its workload identity, with `alloc_id`, `job_id`, `namespace` and `task` |
| `client:<node ID>` | A client node, by its node secret. The node's ID is only in `identity`: `node_id` is a parameter of the node operations. |
| `ip:<address>` | A caller known only by its address: a call with a token that does not exist |
| `tls:<name>`, `<name>:<address>` | A caller known by the name of its TLS certificate, and its address |
| `anonymous` | A call on a cluster without ACLs: the servers resolve no tokens then, so **every record names `anonymous`** |
| `unauthenticated` | A call that was not authenticated at all |

> [!IMPORTANT]
> Without ACLs the records still show the operations and their results, but
> not who made them. Enable [ACLs](/docs/configuration/acl) for an audit trail
> of callers.

## Recorded operations

| Operation | Parameters in the record |
| --- | --- |
| **Raft and autopilot** | |
| `Operator.RaftRemovePeerByAddress` | `server_addr` |
| `Operator.RaftRemovePeerByID` | `server_id` |
| `Operator.RaftPromoteStandby` | `server_id`, `replace`, `force` |
| `Operator.AutopilotSetConfiguration` | `cas`, `cleanup_dead_servers`, `last_contact_threshold`, `max_trailing_logs`, `min_quorum`, `server_stabilization_time` |
| `Operator.SnapshotRestore` | none |
| **Scheduler and system** | |
| `Operator.SchedulerSetConfiguration` | `cas`, `scheduler_algorithm`, `memory_oversubscription`, `reject_job_registration`, `pause_eval_broker` |
| `System.GarbageCollect` | none |
| `System.ReconcileJobSummaries` | none |
| **Seal and keyring** | |
| `Operator.SealUnseal` | `server_id`, `reset`; never the share |
| `Operator.SealRecover` | `reset`, `with_share` and `with_core_key` (whether a share or the core key was given, never the values) |
| `Keyring.Rotate` | `algorithm`, `full` |
| `Keyring.Update` | `key_id`, `rekey` |
| `Keyring.Delete` | `key_id` |
| `Keyring.Restore` | `key_ids` |
| `Keyring.Rewrap` | `to` (the seal type), `shares`, `threshold` |
| **Backups** | |
| `Backup.Save` | `pin`, `detach`, `labels` (the number of labels) |
| `Backup.Update` | `backup_id`, `labels` and `remove_labels` (numbers), `pinned` when it is set |
| `Backup.Delete` | `backup_ids` |
| `Backup.Restore` | `backup_id`, `mode`, `items` (the number of items), `dry_run`, `destination` |
| `Backup.ApproveRestore` | `restore_id` |
| `Backup.RejectRestore` | `restore_id`, `reason` |
| **Certificate authorities** | |
| `Certificate.ImportAuthority` | none; never the imported key |
| `Certificate.RotateAuthority` | none |
| `Certificate.Revoke` | `name`, `serial`, `reason` |
| `MTLS.RotateCA` | none |
| **Nodes** | |
| `Node.UpdateDrain` | `node_id`, `drain` (on or off), `mark_eligible`; with a drain also `deadline` and `ignore_system_jobs` |
| `Node.UpdateEligibility` | `node_id`, `eligibility` |
| `Node.Deregister` | `node_id` |
| `Node.BatchDeregister` | `node_ids` |
| **Consul KV store** | |
| `Operator.ConsulKVRestore` | `entries` (the number of entries) |
| `Operator.ConsulKVMigrate` | `path`, `dry_run` |

Durations (`deadline`, the times of the autopilot configuration) are
nanoseconds in the JSON layout, as in every log line.

## Find the records

The records are `info` lines: an agent with `log_level = "WARN"` or higher does
not write them to its log outputs, but a stream at the `info` level still
receives them. In JSON logs, filter on `audit`:

```shell
# the records of the leader, live
norca monitor -server-id=leader -log-level=info -json | jq -c 'select(.audit == true)'

# the records in a JSON log file
jq -c 'select(.audit == true)' /var/log/norca/norca.log

# the denied calls
jq -c 'select(.audit == true and .result == "denied")' /var/log/norca/norca.log
```

**Collect the logs of every server.** Most operator calls are handled by the
leader at the time of the call, so after a leader change the records of the
same cluster are in the logs of another server; the calls sent to one server
(an unseal, say) are in that server's log. A log shipper that sends the
server logs to one backend gives one audit trail of the region.

## See also

- [Logging](/docs/operations/logging): the layout and the keys of the log lines
- The [`acl` block](/docs/configuration/acl) and the
  [event stream](/docs/api/events)
