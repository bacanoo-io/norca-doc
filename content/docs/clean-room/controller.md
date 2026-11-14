---
aliases:
  - /docs/white-room/controller
title: "Controller SDK"
linkTitle: "Controller SDK"
description: "The findings of the review of the controller SDK: object paths, owner references, the event recorder, object listing, webhook serving and status updates, with their verdicts, fixes, tests and commits."
weight: 7
---

The review, part of the third round, covered the controller SDK
(`controller` in the norca repository), the runtime that custom controllers
are built on: object kinds and their storage, the informer, owner references,
the event recorder, status updates and the serving of webhooks. It reported 7
findings. The fixes are in commit `1e23e9e83` of the norca repository. Paths
are relative to the `nomad` directory (`norca` since 2026-11-02) of the norca repository. See the
[section page](/docs/clean-room) for the process, and
[Controllers](/docs/features/operator-framework/controllers) for the SDK.

| ID | Finding | Verdict | Commit |
| --- | --- | --- | --- |
| CTRL-COLLISION-01 | Groups that differ only in dots and dashes map to the same Variables path | Valid (less severe than reported) | `1e23e9e83` |
| CTRL-OWNER-01 | An empty namespace in allocation, evaluation and deployment events loses the owner | Invalid | — |
| CTRL-LEAK-01 | `EventRecorder.last` grows without limit; `Forget` is never called | Valid | `1e23e9e83` |
| CTRL-DESERIALIZE-01 | `Objects.List` skips invalid objects silently | Partially valid | `1e23e9e83` |
| CTRL-GOROUTINE-LEAK-01 | `webhook.Serve` leaks its shutdown goroutine when serving fails | Valid | `1e23e9e83` |
| CTRL-STATUS-RACE-01 | A conflict retry of `UpdateStatus` writes a status computed for the old spec | Partially valid | `1e23e9e83` |
| CTRL-NIL-01 | A nil `*Object` panics in `Observe`, `Observed` and `OwnerReference` | Won't fix (by design) | — |
| extra | The group rule of the SDK accepts groups that are not DNS subdomains | Valid (not in the report) | `1e23e9e83` |
| extra | `webhook.Serve` returns before the requests in progress finish, and keeps serving after a failure | Valid (not in the report) | `1e23e9e83` |

## Object paths and owners

### CTRL-COLLISION-01 Colliding path forms of groups

**Report.** `Kind.PathGroup` writes a group into Variables paths by replacing
its dots with dashes, while the group rule allows dashes too. Groups such as
`db.example.com` and `db-example-com` therefore map to the same path,
`crd/db-example-com/...`, and objects of the same name in the two groups
overwrite each other's spec and status.

**Verdict: valid, less severe than reported.** Variables paths do not allow
dots, so the dots had to go, but the mapping was not injective. The objects
of two such kinds shared their Variables: they overwrote each other, a second
`Create` of the same name failed with a conflict, and the two kinds shared
one `crd-schema` Variable. The owner reference in the job meta
(`structs.ObjectOwnerMetaValue` on the server and `ownerMetaValue` in the
UI) used the same mapping, so for jobs without the `norca.owner.kind` meta,
deleting a native object of one group made the object garbage collector stop
the jobs owned by an object of the other group. It is not a privilege
escalation: Variables ACLs are path based, so writing the objects of either
kind already needs write access to that path; the harm is to the integrity of
two kinds deployed side by side.

**Fix.** It follows the escaping the report proposed. The path form of a
group doubles its dashes, then replaces its dots with dashes
(`my-db.example.com` becomes `my--db-example-com`), in the SDK
(`Kind.PathGroup`), on the server (the new `structs.ObjectPathGroup`, used by
`ObjectOwnerMetaValue`) and in the UI. Together with the stricter group rule
(see [below](#the-group-rule-of-the-sdk)), distinct groups have distinct path
forms. Groups without dashes keep their paths (`norca.io` stays `norca-io`).
Files: `controller/object.go`, `controller/doc.go`,
`norca/structs/objects_lifecycle.go`, `api/objects_lifecycle.go` (comment),
`ui/app/utils/objects.js`, `ui/app/utils/job-owner.js` (comment).

**Test.** `TestKind_Paths` in `controller/object_test.go` (groups that differ
only in dots and dashes have distinct paths), `TestObjects_GroupPathsDoNotCollide`
and `TestLifecycle_OwnersAndAdoption` in `controller/lifecycle_test.go` (the
objects of the two kinds do not overwrite each other, and their owner
references differ even without the owner kind),
`TestObjectOwnerMetaValue_GroupsDoNotCollide` in
`norca/structs/objects_lifecycle_test.go`, and an extended case in
`ui/tests/unit/utils/objects-secrets-test.js`. The UI unit test was not run:
the UI test build does not work on the Windows machine of the isolated environment.

**Commit.** `1e23e9e83`.

### CTRL-OWNER-01 Empty namespace in owned job events

**Report.** `OwnedJobsSource.apply` falls back to the event namespace for job
events, but looks up the owner of allocation, evaluation and deployment
events with the namespace of the embedded object. When that namespace is
empty, the lookup key is `/<job>` instead of `default/<job>`, and the changes
of the owned workload never reach the controller.

**Verdict: invalid.** The event stream builds allocation events from a copy
of the stored allocation with the event namespace set to the allocation's
namespace, and evaluation and deployment events in the same way from the
stored object; `api.Allocation.Namespace` is not omitted when empty. The
namespace in the payload therefore always equals the event namespace, and
stored allocations, evaluations and deployments always carry the namespace of
their job. The proposed fallback would change nothing. Nothing was changed.

## Recorder and listing

### CTRL-LEAK-01 Unbounded memory of the event recorder

**Report.** The `EventRecorder` keeps the last event of every object in a
map, and `Forget`, which removes an entry, is called nowhere. On a
long-running controller the map grows with every object ever created, and an
object deleted and re-created with the same name within the window loses its
first event as a repetition.

**Verdict: valid.** The controller creates its own recorder, and nothing
called `Forget`: the entries of deleted objects stayed forever, and the first
event of a re-created object was dropped when it matched the last event of
the deleted one.

**Fix.** `Event` removes the entries older than the window, at most once per
window; such entries could not suppress any event anyway. The delete handler
of the controller's informer calls `Forget`. Files: `controller/lifecycle.go`,
`controller/controller.go`.

**Test.** `TestEventRecorder_SweepsExpired` in `controller/object_test.go`
(entries older than the window are removed) and
`TestNativeController_RecorderForgetsDeleted` in `controller/native_test.go`
(the first event of an object re-created with the same name is recorded).

**Commit.** `1e23e9e83`.

### CTRL-DESERIALIZE-01 Invalid objects skipped by `Objects.List`

**Report.** `Objects.List` skips an object that cannot be decoded without a
log or an error, while the informer logs it. A controller or garbage
collector working from `List` would take the object for deleted and could
remove its children.

**Verdict: partially valid.** Skipping invalid objects is intended and
documented: the informer keeps them marked as seen, so they are not treated
as deleted, and no code of the SDK acts destructively on the result of
`List`. The real part is the missing diagnostic.

**Fix.** `List` logs a warning for every invalid object it skips, and its
documentation says that a missing entry does not prove that the object is
gone. File: `controller/objects.go`.

**Test.** `TestObjects_ListLogsInvalid` in `controller/lifecycle_test.go`.

**Commit.** `1e23e9e83`.

## Webhook serving

### CTRL-GOROUTINE-LEAK-01 Shutdown goroutine of `webhook.Serve`

**Report.** `webhook.Serve` starts a goroutine that waits for the context and
then shuts the server down. When serving fails, `Serve` returns the error,
and with a long-lived context the goroutine stays forever.

**Verdict: valid.** The goroutine waited only for the context, so every
failed `Serve` with a background context leaked it. The checking found two
related defects, listed [below](#webhookserve-shutdown-and-failure).

**Fix.** The goroutine also returns when serving ends. File:
`controller/webhook/webhook.go`.

**Test.** `TestServe_FailureDoesNotLeak` in `controller/webhook/webhook_test.go`:
repeated failing calls of `Serve` leave no goroutine behind.

**Commit.** `1e23e9e83`.

## Status and nil objects

### CTRL-STATUS-RACE-01 Status retry after a conflict

**Report.** On a check-and-set conflict `UpdateStatus` reads the object again
and writes the same status. The conflict usually comes from a spec change,
so the observed generation and spec hash, computed for the previous spec,
claim that the new spec was acted on. The report proposes to return the
conflict instead.

**Verdict: partially valid.** For a spec change the claim is wrong: the
status keeps the observed generation and spec hash of the old spec, so
`Observed` reports the object as not up to date, and the spec change queues a
new reconcile. The real case is an object deleted and re-created between the
read and the write: a new native object starts again at generation 1, so a
status that observed generation 1 of the old object could falsely mark the
new spec as acted on.

**Fix.** The retry checks that the object read again is the same object: the
same ID for native objects, the same create index for Variables. When it was
re-created, `UpdateStatus` returns an error wrapping `ErrNotFound`, as
documented for a missing object. File: `controller/objects.go`.

**Test.** `TestController_StatusConflictRetry` (extended with a re-created
Variables object) and `TestNativeObjects_StatusNotAppliedToRecreated`, both
in `controller/controller_test.go`.

**Commit.** `1e23e9e83`.

### CTRL-NIL-01 Nil objects

**Report.** `CommonStatus.Observe`, `CommonStatus.Observed` and
`OwnerReference` dereference their `*Object` argument without a nil check,
and panic when a controller calls them for a deleted or missing object.

**Verdict: won't fix (by design).** A nil `*Object` is a bug of the caller.
Every other method and helper taking an `*Object` (`Path`, `DecodeSpec`,
`OwnerRef`, `SetOwner`) has the same contract, and the reconcile path hands
over a key, with `Get` returning `ok=false` or `ErrNotFound` for a missing
object. A nil guard would hide the bug or produce wrong data: an
`OwnerReference(nil)` returning nil would make `SetObjectOwner` append a nil
owner. Nothing was changed.

## Found during the checking

### The group rule of the SDK

This was not in the report. The group rule of the SDK allowed empty labels
and labels starting or ending with a dash (`a..b`, `a.-b`), which the server
rejects, and which would make even the escaped path form ambiguous (`a.-b`
and `a-.b` would both map to `a---b`).

**Fix.** `Kind.Validate` checks groups with the rule of the server: a lower
case DNS subdomain of at most 253 characters. File: `controller/object.go`.

**Test.** `TestKind_Paths` in `controller/object_test.go` (groups that are
not DNS subdomains are rejected).

**Commit.** `1e23e9e83`.

### `webhook.Serve` shutdown and failure

This was not in the report. Once the shutdown started, `http.Server.Serve`
returned at once, so `webhook.Serve` returned before the requests in progress
had finished. After a failure, the connections accepted before it kept being
served.

**Fix.** When the context is done, `Serve` waits up to 5 seconds for the
graceful shutdown; when serving fails, it closes the server. File:
`controller/webhook/webhook.go`.

**Test.** `TestServe_WaitsForRequests` in `controller/webhook/webhook_test.go`:
`Serve` returns only after the request in progress has finished. The close on
a failure has no test: the failing listener of `TestServe_FailureDoesNotLeak`
accepts no connection.

**Commit.** `1e23e9e83`.

## Behaviour changes of the SDK

The fixes change no signature of the SDK, but three behaviours:

- `Kind.PathGroup` returns a different value for groups that contain dashes
  (`my-db.example.com` becomes `my--db-example-com`), and so do the Variables
  paths of their objects and the owner references of their jobs. Groups
  without dashes are unchanged. **Objects stored for such groups under the old
  path are not moved.**
- `Kind.Validate` rejects groups that are not lower case DNS subdomains, as
  the server already did.
- `webhook.Serve` waits (up to 5 seconds) for the graceful shutdown before it
  returns.
