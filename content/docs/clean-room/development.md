---
title: "Clean room development"
linkTitle: "Clean room development"
description: "Features whose Nomad counterpart was Enterprise only, built by Norca from its own design: the sources that were allowed, the environment, the commits and what the similarity audit covers."
weight: 10
---

Some features of Norca have a counterpart that existed only in Nomad Enterprise.
HashiCorp never published that code. The MPL tree of Nomad v1.6.5 has only the
public side of such features: configuration options, structures, API types and
stubs built with the `!ent` tag that do nothing or return an error. Norca built
these features from **its own design**, written from Norca's requirements, not
from a description of the Enterprise behaviour.

## Rules

**Allowed sources:**

- the Norca tree: the MPL v1.6.5 base and Norca's own code;
- `hashicorp/raft` (MPL 2.0, as the `bacanoo-io/raft` fork);
- `hashicorp/raft-autopilot` v0.1.6 (MPL 2.0: the `Promoter` interface and the
  `StablePromoter`);
- the design documents of Norca and the requirements written by its maintainer.

**Not used:**

- Enterprise code or binaries, the enterprise autopilot module;
- descriptions of the Enterprise behaviour;
- HashiCorp sources or documentation of BSL releases (after 2023-08-10).

Public option names of the MPL tree (for example `non_voting_server`) may be
named.

**Files:** new files carry the Norca header only. Where a `!ent` stub is filled
and its signature and doc comment are kept, the HashiCorp copyright line stays,
followed by the Norca line.

**Commits:** the commit message says "clean room", so the `bugfix` set of the
[similarity audit](/docs/clean-room#similarity-audit) compares the lines it
adds to files of v1.6.5 with HashiCorp's changes to the same files.

## Environment

The [clean room fixes](/docs/clean-room) of October 2026 were made on an empty
drive without internet access. The work on this page was made in the normal
development environment of Norca:

- the Norca repositories and their Go module cache, which holds the MPL and
  other open source dependencies of the modules (no HashiCorp Nomad module: the
  [license checks](/docs/introduction/license) verify that `go list -m all`
  names none);
- Docker for the Linux tests;
- GitHub for pushes, pull requests and CI.

The rules above decide what was read. For the phases built on 2026-11-11, the
commit message of each phase names its sources. For the second to the fourth
phase, the record of the work shows no web search and no web page fetched.

## Features

| Feature | Norca commits | Record |
| --- | --- | --- |
| Multiregion deployments: registration in every region, the rollout across regions, multiregion pack releases, the region timeline of the UI | `18349e4ef` (2026-10-25), provenance `10cf28620` | [Multiregion deployments](https://github.com/bacanoo-io/norca/blob/main/CLEAN_ROOM.md#multiregion-deployments) |
| Server roles (voter, standby, observer) and the role promoter of autopilot | `8087e57bc` (phase 1) | [Server roles and standby servers](https://github.com/bacanoo-io/norca/blob/main/CLEAN_ROOM.md#server-roles-and-standby-servers) |
| Standby failover: `target_voters`, promotion and step back, `operator raft promote-standby` | `8dd43588b` (phase 2) | as above |
| Backups taken by observers (`backup { prefer_observer }`) | `2914fa12f` (phase 3) | as above |
| Job checks on the receiving server, request limits per ACL token | `231359232` (phase 4) | as above |
| Standby failover rules put right after a review: a manual failover does not wait, a voter is demoted only while a healthy majority stays, the cooldown counts from the change, nothing is removed unless a promotion follows, a failed voter is not removed before the failover time | `a99a443c4` (2026-11-12) | as above |
| The autopilot configuration is part of the Raft snapshot | `9469d0d5f` (2026-11-12) | as above |

The server role features are described on
[observers and hot standby servers](/docs/features/server-roles), their design
on [the plan](/docs/design/server-roles-plan).

The `CLEAN_ROOM.md` records in the Norca repository list the files of each
feature and their headers.

## What the similarity audit covers

- **New files** are in neither set of the audit. The directories of the
  feature files hold none of the 45 BUSL files of v1.6.5, and HashiCorp's
  implementation is not public, so there is no file to compare them with.
- **Lines added to files of v1.6.5** by these commits are in the `bugfix` set.
  They are compared with the lines HashiCorp added to the same files up to the
  BSL release of the run. Examples are `nomad/autopilot.go`, `nomad/leader.go`,
  `nomad/operator_endpoint.go`, `nomad/job_endpoint.go` and the generated
  msgpack codec.
- **The multiregion import commit** is not in the `bugfix` set; its UI timeline
  is in the `busl` set.

The result of each run is on the [clean room page](/docs/clean-room#similarity-audit).
