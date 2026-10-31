---
title: "Plugins"
linkTitle: "Plugins"
description: "The findings of the review of the plugin clients and servers: task drivers, devices, CSI and the shared structures, with their verdicts, fixes, tests and commits."
weight: 5
---

The review, part of the second round, covered the plugin layer (`plugins` in
the norca repository): the gRPC clients and servers of task drivers and
device plugins, the CSI client, the shared attribute structures and the
serving of a plugin binary. It looked for goroutine and resource leaks, races,
lost arguments and panics, and reported 10 findings. The fixes are in commit
`a452d75c1` of the norca repository. Paths are relative to the `nomad`
directory of the norca repository. See the
[section page](/docs/white-room) for the process.

| ID | Finding | Verdict | Commit |
| --- | --- | --- | --- |
| PLUG-LEAK-01 | The stream handlers block forever on the error send | Valid | `a452d75c1` |
| PLUG-LEAK-02 | The `WaitTask` goroutine blocks on an unbuffered channel | Valid | `a452d75c1` |
| PLUG-PIPE-01 | Exec stdin is never closed, the exec input goroutine leaks, the `TaskEvents` server ignores its context | Partially valid | `a452d75c1` |
| PLUG-CONC-01 | Race, connection and timer leak in the CSI `ensureConnected` | Invalid | — |
| PLUG-ARG-01 | `CreateNetwork` drops the `NetworkCreateRequest` | Partially valid | `a452d75c1` |
| PLUG-CSI-01 | A matching block device capability is skipped | Valid (only after a mismatching capability) | `a452d75c1` |
| PLUG-ATTR-01 | `Attribute.Comparable` is not symmetric | Partially valid | `a452d75c1` |
| PLUG-NIL-01 | Missing nil checks in the protobuf and struct converters | Partially valid | `a452d75c1` |
| PLUG-PANIC-01 | The server panics when attaching error details fails | Invalid | — |
| PLUG-SRV-01 | An unsupported plugin type exits silently with code 0 | Partially valid | `a452d75c1` |
| extra | The eventer drops expired consumers without closing their channels | Valid (not in the report) | `a452d75c1` |
| extra | The exec input goroutine can block on a full error channel | Valid (not in the report) | `a452d75c1` |

## Leaks

### PLUG-LEAK-01 Stream handlers blocked on the error send

**Report.** The driver client's `handleFingerprint` and `handleTaskEvents`,
and the device client's `handleFingerprint` and `handleStats`, forward the
responses of a gRPC stream with a `select` on the request context, but send
the stream error with a plain send. The channels have one slot; when the
consumer has stopped reading, the send blocks forever, the deferred `close`
never runs and the goroutine leaks.

**Verdict: valid.** The consumers (the device manager and the driver manager
instances) return on cancellation without draining the channel, so with one
value left unread the error send blocked forever.

**Fix.** The fix differs from the proposed one. A plain `select` on the
request context would drop the cancellation error, which the device client
documents and a test checks. The handlers first try a non-blocking send, and
only when the channel is full wait for either room or the end of the request
context. The error is still delivered whenever there is room for it. Files:
`plugins/drivers/client.go`, `plugins/device/client.go`.

**Test.** `TestDriverClient_StreamErrorAfterCancel` in
`plugins/drivers/client_test.go` and `TestDeviceClient_StreamErrorAfterCancel`
in `plugins/device/client_test.go`: the stream fails after the consumer
cancelled with a value left unread, and the handlers still return.

**Commit.** `a452d75c1`.

### PLUG-LEAK-02 `WaitTask` on an unbuffered channel

**Report.** `WaitTask` of the driver client returns an unbuffered channel fed
by `handleWaitTask`. When the caller cancels its context and stops reading,
the single send blocks forever and the goroutine leaks.

**Verdict: valid.**

**Fix.** The channel has a buffer of one, so the send always completes; a
waiting reader gets the same result as before. File:
`plugins/drivers/client.go`.

**Test.** `TestDriverClient_WaitTaskCancelled` in
`plugins/drivers/client_test.go`.

**Commit.** `a452d75c1`.

### PLUG-PIPE-01 Exec streams and the `TaskEvents` server

**Report.** Three points: (1) the input goroutine of `StreamToExecOptions`
returns when the stream ends or fails without closing the stdin pipe, so the
command never gets EOF on its stdin; (2) the input goroutine of
`ExecTaskStreamingRaw` stays blocked on `Recv` after the command ended; (3)
the `TaskEvents` handler of the driver server waits only on the driver's
channel, not on the stream context, so it hangs when the client goes away.

**Verdict: partially valid.** Points 1 and 3 are real. For point 3, the
shared eventer of the bundled drivers dropped consumers whose context had
ended without closing their channel (see below), so a disconnected client
left the handler waiting forever. Point 2 is not a leak: every caller
releases the input goroutine when it returns (the connection is closed, and
gRPC cancels the stream). But the same goroutine had a related defect: when
the caller's input ended (EOF) it did not half-close its side of the stream,
so the plugin never learned that the input had ended.

**Fix.** `StreamToExecOptions` closes the stdin pipe on every exit of the
input goroutine, with the stream error or with EOF on a clean end.
`ExecTaskStreamingRaw` half-closes the stream (`CloseSend`) when the caller's
input ends. The `TaskEvents` handler also returns when the stream context
ends. No protocol message changed; the visible change is that the command's
stdin is closed when the caller's exec input ends. Files:
`plugins/drivers/execstreaming.go`, `plugins/drivers/client.go`,
`plugins/drivers/server.go`.

**Test.** In `plugins/drivers/client_test.go`:
`TestStreamToExecOptions_InputEnd` (stdin is closed when the input stream
ends or fails), `TestDriverClient_ExecStreamingInputEOF` (the end of the
input reaches the plugin as a half-close) and
`TestDriverServer_TaskEventsClientGone` (the handler returns when the client
goes away although the driver never closes its channel).

**Commit.** `a452d75c1`.

## Concurrency

### PLUG-CONC-01 CSI `ensureConnected`

**Report.** The CSI client has no lock. Concurrent RPCs call
`ensureConnected`, which reads and writes `c.conn` and the RPC clients
without synchronization; two calls can both create a connection and leak one
of them, and the retry timer is never stopped.

**Verdict: invalid.** The only long-lived CSI client that is shared between
goroutines, the one of the CSI manager's plugin instance, is used by the
volume manager only after the first successful fingerprint has connected it;
from then on `ensureConnected` only reads `c.conn`. The other clients are
made per request and closed with a deferred `Close`. A timer that is not
stopped is collected by the Go runtime once it is no longer referenced (since
Go 1.23; Norca builds with Go 1.27). Nothing was changed.

## Protocol and arguments

### PLUG-ARG-01 `CreateNetwork` drops its request

**Report.** The driver client's `CreateNetwork` ignores its
`NetworkCreateRequest` argument, so the hostname never reaches the driver,
although the protobuf request has a `hostname` field and the server decodes
it.

**Verdict: partially valid.** Drivers running in the agent's process get the
request directly and were not affected; only external drivers, reached
through the gRPC client, never got the hostname.

**Fix.** The client fills the existing `hostname` field (field 2) of
`CreateNetworkRequest`. Only an existing proto3 field is filled, so older
drivers ignore it and older clients send it empty as before. File:
`plugins/drivers/client.go`.

**Test.** `TestDriverClient_CreateNetworkHostname` in
`plugins/drivers/client_test.go`.

**Commit.** `a452d75c1`.

### PLUG-CSI-01 Matching block device capability skipped

**Report.** In `compareCapabilities`, a block device capability that matches
the requested block access has no mount part, so it hits `capMount == nil`
and the loop continues instead of accepting it; an error recorded for an
earlier capability then fails the validation.

**Verdict: valid, but only after a mismatching capability.** Alone, the
skipped match is harmless; the validation fails only when an earlier
capability of the response did not match, although a matching one follows.

**Fix.** A matching block device capability is accepted after the access
mode check, like a matching mount capability; a block device has no mount
options to compare. File: `plugins/csi/client.go`.

**Test.** `TestCompareCapabilities_BlockAfterMismatch` in
`plugins/csi/client_test.go`.

**Commit.** `a452d75c1`.

### PLUG-ATTR-01 Asymmetric `Attribute.Comparable`

**Report.** `Comparable` returns true for a number compared with a string or
a bool (it reaches the final `return true`), but false the other way round,
so the relation is not symmetric.

**Verdict: partially valid.** The method is asymmetric, also for empty
attributes. But `Compare` already returned "not comparable" for those pairs
through its comparators, so no scheduling result was wrong. The attributes
are compared in the agent's process only.

**Fix.** A number is comparable only with a number, and an empty attribute
with nothing, so `Comparable` gives the same answer in both directions. File:
`plugins/shared/structs/attribute.go`.

**Test.** `TestAttribute_ComparableSymmetric` in
`plugins/shared/structs/attribute_test.go`.

**Commit.** `a452d75c1`.

## Panics

### PLUG-NIL-01 Nil checks in the converters

**Report.** Several converters dereference their argument without a nil
check: `taskHandleToProto`, the resource usage converters, the attribute map
converters, `LinuxResources.Copy` and the `Get*` methods of `Attribute`.

**Verdict: partially valid.** Real only for the client side decoding of
plugin responses: an external plugin (possibly not written in Go) can leave
a proto message absent, and `exitResultFromProto`, `taskStatusFromProto`,
`TaskStatsFromProto` and `resourceUsageFromProto` then panicked the client
agent. The most important case is in the same tree: `handleWaitTask`
dereferenced `resp.Result`, while the driver server answers
`{Err: "channel closed"}` without a result when a driver closes its wait
channel, which the bundled drivers do on shutdown. The other cases are not
real: protobuf fills the absent values of a map, so `ConvertProtoAttribute`
never gets nil; the only caller of `LinuxResources.Copy` checks for nil; and
`taskHandleToProto`, the struct-to-proto converters and the `Get*` methods
get nil only from in-process code that breaks its own contract.

**Fix.** The decoding converters treat an absent message as empty (exit
result, resource usage) or return an error (task status, task stats), and
`handleWaitTask` reads the result through the protobuf getters. Files:
`plugins/drivers/utils.go`, `plugins/drivers/client.go`.

**Test.** `TestConvertersMissingMessages` (responses with absent messages do
not panic the client) and `TestDriverClient_WaitTaskNoResult` (a wait
response without a result does not panic), both in
`plugins/drivers/client_test.go`.

**Commit.** `a452d75c1`.

### PLUG-PANIC-01 Panic when attaching error details

**Report.** `StartTask` and `TaskStats` of the driver server panic when
`status.WithDetails` fails, instead of returning a gRPC error.

**Verdict: invalid.** `WithDetails` fails only for the code OK or for a detail
that cannot be marshalled. Here the code is always `FailedPrecondition` and
the detail a message with a single bool, so the panic cannot be reached.
Nothing was changed.

### PLUG-SRV-01 Unsupported plugin type

**Report.** When `serve` gets a plugin of an unsupported type, it prints a
line on stdout and the process exits silently with code 0.

**Verdict: partially valid.** The exit is not silent: go-plugin shows the
stdout line as an unrecognized handshake. But the exit code is 0, so a broken
plugin binary looks like a clean exit.

**Fix.** The type is logged as an error, the stdout line is kept (the host
shows it), and the process exits with code 1. File: `plugins/serve.go`.

**Test.** `TestServe_UnsupportedExitCode` in `plugins/serve_test.go`, which
runs the test binary in a child process because `serve` calls `os.Exit`.

**Commit.** `a452d75c1`.

## Found during the checking

### Eventer consumer channels not closed

This was not in the report. While PLUG-PIPE-01 was checked, the shared
eventer of the bundled drivers (`gcConsumers`) was found to drop the
consumers whose context had ended without closing their channel, unlike the
send loop of the same eventer, which closes it. A consumer ranging over the
channel waited forever; this is what left the `TaskEvents` server handler
hanging.

**Fix.** `gcConsumers` closes the channel of every consumer it drops. File:
`drivers/shared/eventer/eventer.go`.

**Test.** `TestEventer_gcConsumersCloses` in
`drivers/shared/eventer/eventer_test.go`.

**Commit.** `a452d75c1`.

### Exec input errors on a full channel

This was not in the report. The input goroutine of `StreamToExecOptions` sent
every unexpected message as an error to a channel with one slot per
goroutine. More unexpected messages than there was room for blocked the
input goroutine, and with it the output goroutines, forever.

**Fix.** Only the first input error is reported, as the result carries a
single error anyway. File: `plugins/drivers/execstreaming.go`.

**Test.** The "unexpected messages" subtest of
`TestStreamToExecOptions_InputEnd` in `plugins/drivers/client_test.go`.

**Commit.** `a452d75c1`.

### Left unchanged

The gRPC client of the executor has the same missing half-close on the end
of the exec input as `ExecTaskStreamingRaw` had (PLUG-PIPE-01). It is outside
the reviewed code and was not changed.
