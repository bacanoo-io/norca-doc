---
title: "Access control"
linkTitle: "Access control"
description: "The findings of the access control review: release revisions, backup browsing, the Consul KV on the system bus, the event stream and network policies, with their verdicts, fixes, tests and commits."
weight: 3
---

The review looked for places where a token or a client node can read or
change data it is not entitled to: release revisions, backup browsing, the
system bus and its Consul KV bucket, the event stream and network policies. It
reported six findings, all valid and all fixed. Paths are relative to the
`nomad` directory of the norca repository. See the
[section page](/docs/white-room) for the process.

| ID | Finding | Verdict | Commit |
| --- | --- | --- | --- |
| SEC-01 | Release revisions expose the decrypted values of Variables | Valid | `20a73b322` |
| SEC-02 | Backup read lists every ACL policy and role | Valid | `20a73b322` |
| SEC-03 | Variables list access shows the item names in backups | Valid | `20a73b322` |
| SEC-04 | A node secret gives direct access to the whole Consul KV bucket on the bus | Valid | `80b2a526f`, `d6c681885` |
| SEC-05 | Event subjects carry no namespace | Valid | `20a73b322` |
| SEC-06 | `GetAllocRules` tells existing allocations from missing ones | Valid (low risk) | `20a73b322` |

## SEC-01 Release revisions expose decrypted Variables

**Report.** A release revision stores the resources of the release, encoded in
its spec content, including the Variables of the pack with their decrypted
values. `Release.GetRevision` checks only the release read permission and
`read-job` on the namespace, then decodes and returns all resources. A token
that may read releases and jobs but not Variables gets the values anyway; the
object API (`CustomObject`) returns the encoded content of the revision object
as well.

**Verdict: valid.** The resources were returned without the per-resource check
that the release endpoints already had (`allowReleaseResourceRead`), and the
revision object carried the encoded content to anyone who could read objects
of its kind. The object events of revisions carried it too, which the report
did not mention.

**Fix.**

- `Release.GetRevision` returns only the resources the token may read. When it
  may not read all of them, the encoded content is removed as well, since it
  holds every resource. File: `nomad/release_endpoint.go`.
- The object API (`CustomObject.GetCustomObject` and `CustomObject.List`)
  returns the encoded content of a revision only to a token that may read
  every resource in it. File: `nomad/object_endpoint.go`.
- Object events of release revisions carry no encoded content. Files:
  `nomad/state/state_store_objects.go`, `nomad/structs/release.go`
  (`WithoutRevisionContent`).
- The stored revision keeps its content; rollback needs it.

**Test.** `TestRelease_RevisionVariablesACL` in
`nomad/release_endpoint_test.go`: the management token sees every resource
and the content, a token without Variables read gets the job only and no
content, the object API and the object events carry no content, and the stored
object keeps it.

**Commit.** `20a73b322`. See also the [permissions of
releases](/docs/features/packages/releases#permissions).

## SEC-02 Backup read lists every ACL policy and role

**Report.** Browsing (`Backup.Contents`) and comparing (`Backup.Diff`) backups
with the ACL policies or ACL roles content type filters only by name prefix. A
token with `backup` read gets the names and descriptions of every policy and
role, which `ACL.ListPolicies` and `ACL.ListRoles` show only to a management
token.

**Verdict: valid.**

**Fix.** Contents and diff list ACL policies and roles for a management token
only, as the ACL endpoints do. File: `nomad/backup_browse.go`.

**Test.** `TestBackupEndpoint_ACL` in `nomad/backup_endpoint_test.go`: a
non-management token gets no ACL policies in the contents or in the diff, the
management token gets them in the contents.

**Commit.** `20a73b322`. See [browsing and selective
restore](/docs/features/backup-restore#browsing-and-selective-restore).

## SEC-03 Variables list access shows item names in backups

**Report.** For the Variables content type, backup browsing checks the
Variables `list` capability, but when the keyring is available it decrypts each
Variable and returns the names of its items. `list` is meant to show paths
only; item names can themselves be sensitive.

**Verdict: valid.** The Variables API shows the items of a Variable only with
`read`.

**Fix.** The item names are filled in only when the token has `read` on the
Variable; with `list` alone the path is shown without them. File:
`nomad/backup_browse.go`.

**Test.** `TestBackupEndpoint_ACL` in `nomad/backup_endpoint_test.go`: a token
with `list` gets the path without the item names.

**Commit.** `20a73b322`.

## SEC-04 Node secret and the Consul KV bucket on the bus

**Report.** A client node authenticates to the system bus with its node ID and
secret, and the servers granted it the subjects of the whole `consul-kv` KV
bucket and of its JetStream API. The Variables ACL of the keys was checked
only by the client's Consul-compatible HTTP API, not on the bus, so whoever
obtains a node secret can read and write the Consul KV of every namespace
directly on the bus, without any ACL check.

**Verdict: valid.**

**Fix, first part (commit `80b2a526f`).** Nodes no longer have access to the
bucket. A node may publish its telemetry subject only. The bus KV backend of
the clients calls a new server RPC endpoint, `ConsulKV.Get`, `ConsulKV.Put` and
`ConsulKV.Delete`, with the token of the KV request; the servers check the
Variables rules of the keys with that token (the anonymous policy without
one) and use the bucket over their in-process connection. A listing returns
only the keys the token may read, and a recursive delete needs `destroy` on
every key. Files: `nomad/bus_server.go`, `nomad/consul_kv_endpoint.go`,
`client/consulcompat/kv_bus.go`, `client/bus.go`, `helper/consulkv/store.go`.

**Remaining gap.** After the first part, the bucket still kept the keys of
every namespace and Variables path in one keyspace, while the servers checked
the rules of the namespace and path named in the KV request. A token with
Variables write on any path could therefore write every key, by naming a path
it may write.

**Fix, second part (commit `d6c681885`).** The NATS keys of the bucket are
`<namespace>.<path>.<key>`, so the rules of a namespace and path cover exactly
the keys kept under them, as with the Variables backend. The migration from
Variables, the carry-over to a clustered bus, backup contents, diff and
restore, and the full restore keep the namespace and path of each key. Files:
`helper/consulkv/keys.go`, `helper/consulkv/store.go`, `nomad/bus_kv.go`,
`nomad/consul_kv_endpoint.go`, `nomad/backup_browse.go`,
`nomad/backup_restore.go`.

**Tests.**

- `TestBusServer_Authentication` in `nomad/bus_server_test.go`: a node has no
  access to the KV bucket, its JetStream API subjects or any other stream.
- `TestConsulKVEndpoint_ACL` in `nomad/consul_kv_endpoint_test.go`: the
  Variables rules are applied with the request token, a node secret is denied,
  and (second part) a token that may write below one path writes its own key,
  not the key of the same name under another path or namespace.
- `TestKVKeyEncoding_NATS` in `client/consulcompat/kv_encoding_test.go` and
  `TestBusKV_Backup`, `TestBusKV_Migrate`, `TestBusKV_CarryOver` in
  `nomad/bus_kv_test.go` for the key format.

**Documentation.** norca-doc commits `69e6f19` and `0a88c72`: see the
[Consul compatibility configuration](/docs/configuration/consul_compat) and
the [system bus](/docs/features/system-bus).

## SEC-05 Event subjects carry no namespace

**Report.** The servers publish the events of the region on
`<prefix>.<region>.<topic>`. As the namespace is not in the subject, a bus
`subscribe` rule cannot limit a subscriber to the events of some namespaces:
whoever may subscribe to `nomad.*.Job` receives the job events of every
namespace.

**Verdict: valid.**

**Fix.** Event subjects are `<prefix>.<region>.<namespace>.<topic>`; events
without a namespace (nodes, operator events, gap notices) use `_`, which a
namespace name cannot contain. A subscribe rule such as `nomad.eu.shop.>` now
receives the events of the namespace `shop` only. Files: `nomad/bus/events.go`,
`nomad/bus/config.go`.

**Test.** `TestBusEvents_Publish` in `nomad/bus_events_test.go` checks the
subject `nomad.global.<namespace>.Job`.

**Commits.** norca `20a73b322`; documentation norca-doc `a269151`; the
multi-datacenter example of the deployer norca-deployer `cf9d8ef`. See [the
event stream](/docs/features/system-bus#the-event-stream).

## SEC-06 `GetAllocRules` existence oracle

**Report.** `NetworkPolicy.GetAllocRules` checks the permissions only when the
allocation exists. For a missing allocation it returns an empty rule set; for
an existing allocation the caller may not read, it returns permission denied.
The difference tells which allocation IDs exist.

**Verdict: valid, low risk.** Allocation IDs are random UUIDs, so they cannot
be enumerated in practice; only a known ID can be confirmed.

**Fix.** For a missing allocation, a token caller needs the same permissions
(`read-job` and network policy read) on the namespace of the request, so a
caller without them gets the same answer whether the allocation exists or
not. Requests of client nodes are unchanged: a node keeps blocking on
allocations it does not have yet. File: `nomad/network_policy_endpoint.go`.

**Test.** `TestNetworkPolicyEndpoint_AllocRulesAndStatus` in
`nomad/network_policy_endpoint_test.go`: a token without the permissions gets
the same answer for an existing and a missing allocation; one with them gets
an empty rule set for a missing allocation.

**Commit.** `20a73b322`. See [network rules](/docs/features/network-rules).
