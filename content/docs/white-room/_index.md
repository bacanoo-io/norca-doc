---
title: "White room fixes"
linkTitle: "White room fixes"
description: "How the defects found by an external code review were checked and fixed in an isolated environment, what was fixed, and in which commits."
weight: 20
---

In October 2026 the Norca code was reviewed for defects in two rounds. The
first round covered the Docker driver, concurrency and resource handling, and
access control; the second round the core and the scheduler, the plugins, and
the CSI volume watcher. This section describes how the findings were checked and fixed, and gives the
verdict, the fix, the test and the commit of every finding, so that each fix
can be traced to the code.

## Process

### Finding the defects

The code review was done with Google Gemini, in two rounds. Each round
produced three reports, each a list of findings with an identifier, the affected code, the claimed defect, its
impact and a proposed fix. The reports are summarized on the pages below; they
are not published as they were written.

### Checking and fixing

The validation of each finding and the fixes were done with Claude Code, in a
"white room":

- an empty drive, with only the Norca repositories on it;
- no access to any other directory of the machine;
- no internet access.

The reports were not taken at face value. Every finding was checked against
the code itself: the code path the report named was read, together with its
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
- every fix carries a `// white room bugfix:` comment in the code, which
  explains what was wrong, so the fixes can be found with
  `git grep "white room bugfix"`;
- every fix that can be exercised in a test has one; fixes that need a running
  Docker daemon or a failing plugin launch, or that only remove dead code,
  have none. The report pages name the test, or say that there is none and
  why.

The checking also found defects that were not in the reports; they are listed
on the page of the report whose code they are in.

## Reports

| Report | Area | Findings | Fixed |
| --- | --- | --- | --- |
| [Docker driver](/docs/white-room/docker) | Stop and kill, registry authentication, image references, bind mounts of the Docker driver | 12, and 1 found during the checking | 6, and the 1 found |
| [Concurrency, resource cleanup and nil dereferences](/docs/white-room/concurrency-and-nil) | Docker driver, docker logger, system bus, Consul KV on the bus, backup loading | 16 | 9 |
| [Access control](/docs/white-room/acl) | Release revisions, backup browsing, system bus, Consul KV, event stream, network policies | 6 | 6 |
| [Core and scheduler](/docs/white-room/core-and-scheduler) | Node and allocation endpoints, core structures, scheduler stack | 8, and 1 found during the checking | 3, and the 1 found |
| [Plugins](/docs/white-room/plugins) | Driver and device plugin clients and servers, CSI client, plugin attributes, plugin serving | 10, and 2 found during the checking | 8, and the 2 found |
| [Volume watcher](/docs/white-room/volume-watcher) | CSI volume watcher of the leader | 7, and 1 found during the checking | 5, and the 1 found |

## Commits

The fixes are in the following commits of the Norca repositories. A commit
named for another change contains the white room fix of the finding listed
with it, made in the same code.

| Repository | Commit | Subject | Findings |
| --- | --- | --- | --- |
| norca | `6dc041f60` | Consul KV: migration from Variables, carry-over to a clustered bus | CHAN-04 |
| norca | `e70a54140` | Docker driver: white room bugfixes | Docker 1.1, 2.1, 2.2, 2.3, 3.2, 3.4, docker logger plugin leak; NIL-02, FD-01, FD-02, FD-04, CHAN-01, CHAN-02, LOCK-02 |
| norca | `73cabfdc5` | Backups: a cached backup is served while another one loads | LOCK-03 |
| norca | `20a73b322` | ACL white room bugfixes: release revisions, backups, events, network policies | SEC-01, SEC-02, SEC-03, SEC-05, SEC-06 |
| norca | `80b2a526f` | Consul KV on the bus through the servers; nodes lose direct access | SEC-04 |
| norca | `d6c681885` | Consul KV on the bus: keys kept apart by namespace and path | SEC-04 (remaining gap) |
| norca | `82b586a80` | Volume watcher: white room bugfixes | VOLWATCH-DEADLOCK-01, VOLWATCH-RACE-01, VOLWATCH-SPIN-01, VOLWATCH-KEY-01, VOLWATCH-DEAD-01, watcher state store race |
| norca | `bc65e20b7` | Volume watcher: test for the backoff of a failed volumes query | VOLWATCH-SPIN-01 (test) |
| norca | `a452d75c1` | Plugins: white room bugfixes | PLUG-LEAK-01, PLUG-LEAK-02, PLUG-PIPE-01, PLUG-ARG-01, PLUG-CSI-01, PLUG-ATTR-01, PLUG-NIL-01, PLUG-SRV-01, eventer consumer channels, exec input errors |
| norca | `d88223f40` | Core and scheduler: white room bugfixes | CORE-SEC-01, CORE-SCHED-01, CORE-SCHED-02, `Node.UpdateStatus` caller check |
| norca-doc | `a269151` | Bus event subjects carry the namespace | SEC-05 |
| norca-doc | `69e6f19` | The bus KV goes through the servers' RPC | SEC-04 |
| norca-doc | `0a88c72` | Consul KV: keys kept apart by namespace and path; carry-over of the bus | SEC-04 (remaining gap) |
| norca-deployer | `cf9d8ef` | Bus event subjects carry the namespace | SEC-05 |
