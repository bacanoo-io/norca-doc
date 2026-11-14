---
aliases:
  - /docs/white-room
title: "Isolated-environment fixes"
linkTitle: "Isolated-environment fixes"
description: "How the defects found by an external code review were checked and fixed in an isolated environment, what was fixed, and in which commits."
weight: 20
---

In October 2026 the Norca code was reviewed for defects in three rounds. The
first round covered the Docker driver, concurrency and resource handling, and
access control; the second round the core and the scheduler, the plugins, and
the CSI volume watcher; the third round the controller SDK. This section describes how the findings were checked and fixed, and gives the
verdict, the fix, the test and the commit of every finding, so that each fix
can be traced to the code.

Features whose Nomad counterpart was Enterprise only (multiregion deployments,
server roles, standby failover and the work of observers) were not fixes but
new development from Norca's own design; their rules, environment and commits
are on [Independent development under source rules](/docs/clean-room/development).

> [!NOTE]
> **These pages were called "clean room" before 2026-11-14.** The words usually mean a
> procedure with two separate teams, which this was not: one person worked with AI coding
> agents, and the roles were separated by sessions and environments. The four things the
> name stood for have their own names now; they are listed in
> [CLEAN_ROOM.md](https://github.com/bacanoo-io/norca/blob/main/CLEAN_ROOM.md#terms). The
> `// clean room bugfix:` comments and "clean room" in commit messages stay as labels the
> audit finds the code by.

## Process

### Finding the defects

The code review was done with Google Gemini, in three rounds. The first two
rounds produced three reports each, the third one report, each a list of findings with an identifier, the affected code, the claimed defect, its
impact and a proposed fix. The reports are summarized on the pages below; they
are not published as they were written.

### Checking and fixing

The validation of each finding and the fixes were done with Claude Code, in an
isolated environment:

- an empty drive, with only the Norca repositories on it;
- no access to any other directory of the machine;
- no internet access.

**The reports were not taken at face value. Every finding was checked against
the code itself:** the code path the report named was read, together with its
callers, to decide whether the defect can happen and with what effect. Each
finding got one of four verdicts:

| Verdict | Meaning |
| --- | --- |
| Valid | The defect exists as described. It was fixed. |
| Partially valid | The defect exists, but narrower than described (a different cause, a smaller impact, or only one of the cases claimed). The real part was fixed. |
| Invalid | The defect cannot happen in the code as it is, or the behaviour described is intended. Nothing was changed. |
| Won't fix (by design) | The behaviour exists, but it is a deliberate design choice, documented or inherited from Nomad. Nothing was changed. |

For the findings that were fixed:

- the fix is the one that removes the cause, not the one the report proposed
  when that differed;
- **every fix carries a `// clean room bugfix:` comment** in the code, which
  explains what was wrong, so the fixes can be found with
  `git grep "clean room bugfix"` (the process was first called the
  "white room"; the subjects of the earlier commits listed below still
  read "white room" in git);
- every fix that can be exercised in a test has one; fixes that need a running
  Docker daemon or a failing plugin launch, or that only remove dead code,
  have none. The report pages name the test, or say that there is none and
  why.

The checking also found defects that were not in the reports; they are listed
on the page of the report whose code they are in.

## Reports

| Report | Area | Findings | Fixed |
| --- | --- | --- | --- |
| [Docker driver](/docs/clean-room/docker) | Stop and kill, registry authentication, image references, bind mounts of the Docker driver | 12, and 1 found during the checking | 6, and the 1 found |
| [Concurrency, resource cleanup and nil dereferences](/docs/clean-room/concurrency-and-nil) | Docker driver, docker logger, system bus, Consul KV on the bus, backup loading | 16 | 9 |
| [Access control](/docs/clean-room/acl) | Release revisions, backup browsing, system bus, Consul KV, event stream, network policies | 6 | 6 |
| [Core and scheduler](/docs/clean-room/core-and-scheduler) | Node and allocation endpoints, core structures, scheduler stack | 8, and 1 found during the checking | 3, and the 1 found |
| [Plugins](/docs/clean-room/plugins) | Driver and device plugin clients and servers, CSI client, plugin attributes, plugin serving | 10, and 2 found during the checking | 8, and the 2 found |
| [Volume watcher](/docs/clean-room/volume-watcher) | CSI volume watcher of the leader | 7, and 1 found during the checking | 5, and the 1 found |
| [Controller SDK](/docs/clean-room/controller) | Object paths and owner references, event recorder, object listing, webhook serving, status updates of the controller SDK | 7, and 2 found during the checking | 5, and the 2 found |

## Commits

The fixes are in the following commits of the Norca repositories. A commit
named for another change contains the fix of the finding listed
with it, made in the same code.

| Repository | Commit | Subject | Findings |
| --- | --- | --- | --- |
| norca | `32e5db098` | Consul KV: migration from Variables, carry-over to a clustered bus | CHAN-04 |
| norca | `d25baac98` | Docker driver: clean room bugfixes | Docker 1.1, 2.1, 2.2, 2.3, 3.2, 3.4, docker logger plugin leak; NIL-02, FD-01, FD-02, FD-04, CHAN-01, CHAN-02, LOCK-02 |
| norca | `6c0a3a5f3` | Backups: a cached backup is served while another one loads | LOCK-03 |
| norca | `72f634912` | ACL clean room bugfixes: release revisions, backups, events, network policies | SEC-01, SEC-02, SEC-03, SEC-05, SEC-06 |
| norca | `77aa0af7e` | Consul KV on the bus through the servers; nodes lose direct access | SEC-04 |
| norca | `8aa389f27` | Consul KV on the bus: keys kept apart by namespace and path | SEC-04 (remaining gap) |
| norca | `d2529f1c9` | Volume watcher: clean room bugfixes | VOLWATCH-DEADLOCK-01, VOLWATCH-RACE-01, VOLWATCH-SPIN-01, VOLWATCH-KEY-01, VOLWATCH-DEAD-01, watcher state store race |
| norca | `0f87349fd` | Volume watcher: test for the backoff of a failed volumes query | VOLWATCH-SPIN-01 (test) |
| norca | `cc4d34a8f` | Plugins: clean room bugfixes | PLUG-LEAK-01, PLUG-LEAK-02, PLUG-PIPE-01, PLUG-ARG-01, PLUG-CSI-01, PLUG-ATTR-01, PLUG-NIL-01, PLUG-SRV-01, eventer consumer channels, exec input errors |
| norca | `4e4b1eaa3` | Core and scheduler: clean room bugfixes | CORE-SEC-01, CORE-SCHED-01, CORE-SCHED-02, `Node.UpdateStatus` caller check |
| norca | `1e23e9e83` | Controller SDK: clean room bugfixes | CTRL-COLLISION-01, CTRL-LEAK-01, CTRL-DESERIALIZE-01, CTRL-GOROUTINE-LEAK-01, CTRL-STATUS-RACE-01, SDK group rule, `webhook.Serve` shutdown and failure |
| norca-doc | first commit | Bus event subjects carry the namespace ([system bus](/docs/features/system-bus), [bus configuration](/docs/configuration/bus)) | SEC-05 |
| norca-doc | first commit | The bus KV goes through the servers' RPC ([client configuration](/docs/configuration/client), [Consul compatibility configuration](/docs/configuration/consul_compat)) | SEC-04 |
| norca-doc | first commit | Consul KV: keys kept apart by namespace and path; carry-over of the bus ([backup restore](/docs/commands/operator/backup/restore), [bus configuration](/docs/configuration/bus)) | SEC-04 (remaining gap) |
| norca-deployer | `cf9d8ef` | Bus event subjects carry the namespace | SEC-05 |

## Similarity audit

On 2026-11-11 this code was compared with the HashiCorp code it must
not be derived from, using [Dolos](https://github.com/dodona-edu/dolos) 2.10.0
(syntax-tree based plagiarism detection, Ghent University). The comparison ran
in a throwaway container that received the Norca checkout read-only, fetched
the HashiCorp side from GitHub and returned only file names and scores; the
HashiCorp code did not enter the development environment, and only the auditor
looked at code of a flagged pair.

| Property | Value |
| --- | --- |
| Norca | `main` at `f194f1920` (with the four phases of [independent development](/docs/clean-room/development)) |
| BUSL files | the 45 files of Nomad v1.6.5 with a BUSL-1.1 header |
| BSL release | Nomad v1.11.3 (`173ab08a0`) |
| Threshold | 0.4 (share of the two files covered by common fragments) |

**Fixes and independent development** (the lines each commit of the table above
and each commit of [independent development](/docs/clean-room/development) added
to a file, against the lines HashiCorp added to the same file between v1.6.5 and
v1.11.3): 7676 pairs; at or above the threshold only the generated msgpack codec
(`structs.generated.go`, 0.507, 0.427, 0.410 and 0.406), which is generated from
the structure definitions. **Every hand-written file scored 0.261 or lower**; the
highest of the server role phases are 0.242 (`command/commands.go`) and 0.224
(`command/agent/operator_endpoint.go`). The runs of 2026-11-08 (`a72e87685`, 2346
pairs) and 2026-11-02 (`e98a2f58b`, 1221 pairs) gave the same picture.

**Replacements of the BUSL files** (each BUSL file against the Norca files of
its directory): Dolos compares syntax, so files of the same shape score high
whatever their content. Two measures separate shape from copying: the MPL
baseline, the highest score of HashiCorp's own MPL files of v1.6.5 against the
same BUSL file (short Ember files reach 0.8 to 1.0 against each other), and a
second, character-level comparison of each replacement with the file it
replaces, which also counts names, literals and comments. **No Norca file
scored above both the threshold and the baseline.** Of the 102 pairs at or
above the threshold, 85 are HashiCorp's own MPL files of v1.6.5, one is the
restored MPL file below, and 16 are Norca files that resemble a BUSL file less
than HashiCorp's own MPL files do (Ember acceptance tests and page objects,
baseline 0.565 and 1.000).

**Restored MPL code.** `e2e/rescheduling/rescheduling.go` (0.497 against
`e2e/rescheduling/rescheduling_test.go`) is not a file Norca wrote: it is
HashiCorp's MPL suite as it stood on 2023-08-09, before the license change,
with 9 of 503 lines adapted (module path, renamed inputs). v1.6.5 replaced it
with a BUSL rewrite that grew out of the same file, hence the similarity. The
audit recognises such files (same path in the last MPL commit before the
license change, at most 10% of the lines changed) and lists them apart.

**Comparison with the newest release.** A second run on 2026-11-11 compared
everything Norca wrote with the whole of Nomad v2.1.1 (`d0f210429`), the newest
BSL release, whatever the path (Norca `7b6609684`, the same Dolos version and
threshold): 1546 new files against every file of the same language, and the
lines Norca added to 1188 changed files against the lines HashiCorp added to
the same files. A new file is a candidate only if it resembles a BSL file more
than HashiCorp's own v1.6.5 code does.

- The **3 candidates among the changed files** are mechanical edits of
  HashiCorp's MPL lines: a `go vet` fix, struct literals realigned by gofmt
  after a removed field, and the forms of the Ember deprecation codemods.
- Of the **109 candidates among the new files**, 34 are in code imported from
  HashiCorp's MPL projects (Nomad Pack, Nomad Autoscaler, nomad-driver-exec2)
  and 5 in the Apache-2.0 copy of tstorage. For 64, a second Dolos run on MPL
  code only found a v1.6.5 file the Norca file resembles at least as closely,
  with a common fragment at least as long: the common part is HashiCorp's MPL
  pattern (CLI commands, the state store, tests).
- **The auditor judged the remaining 6.** Three are bound to MPL interfaces:
  the `raft.LogStore` methods in the tests of the Badger log store, the
  filesystem isolation constants that the MPL exec2 driver imports, and a
  one-line build-tag fallback. Three are independent: no BSL counterpart, or a
  different structure.

The review with every verdict is
[`clean-room-result-full/review.md`](https://github.com/bacanoo-io/norca/blob/main/clean-room-result-full/review.md)
in the Norca repository.

**Rewrites of 2026-11-02.** Earlier runs (2026-11-01 and the morning of
2026-11-02) listed eight Norca files as candidates. They were judged from the
scores and from the Norca files alone, without opening the HashiCorp files:
their common parts were taken to be the shape of Ember modules and Go tests
and names fixed by the MPL code that uses them. To leave no doubt they were
rewritten with a different structure, and the Norca history after 2026-10-24
was rebuilt so that their earlier versions are not part of the repository
(which was not public at that time; it has been since 2026-11-08):

| Norca file | Rewrite | Now (syntax / character level) |
| --- | --- | --- |
| Access Control UI (`ui/app/routes/access-control/*`, `ui/app/controllers/access-control/*`, `ui/app/abilities/role.js`) | A shared record-type layer (`utils/access-control`, the `acl-records` service); route files only pick a route builder; the role ability is the policy ability | at most 0.284 / 0.141 |
| Its acceptance tests and page object | A small test driver (`tests/helpers/acl.js`) instead of a page object; tests split per page | at most 0.475, below the baseline 0.565 |
| `client/pluginmanager/csimanager/testing.go` | Replaced by `fake.go`: one-shot faults per method, a call hook, an expansion log | 0.299 |
| `helper/backoff_test.go` | Tested against an exact `math/big` reference, a step rule, a fuzz test and an example | 0.090 / 0.004 |
| `ui/app/abilities/secret.js` and the other ACL-block abilities | Built from a table of checks (`utils/token-ability.js`) | at most 0.286 |
| `ui/tests/acceptance/auth-methods-test.js` | On the same test driver, expectations in a table | 0.314 |

`testutil/mock_calls.go`, rewritten on 2026-11-01 on a `sync.Map` of atomic
counters (now part of norca `59d6940b1`), scores 0.149 (0.105 at character
level). The other replacements scored below the baseline or the threshold; the
templates (`*.hbs`) all scored 0.14 or lower, `helper/backoff.go` 0.23 (0.11
at character level).
