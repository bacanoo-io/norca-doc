---
title: Technology updates
description: Planned changes of the libraries and protocols Norca is built on, with the measurements that decide them.
weight: 21
---

Norca started from Nomad v1.6.5 and its dependencies. Some of these are replaced or updated where a
newer or different library serves Norca better. Each change is planned here first, with its scope, its
risks and the measurements that show whether it was worth it: a baseline is measured before the change
and compared with the same measurements after it.

| Document | Covers | Status |
| --- | --- | --- |
| [Storage and RPC update](/docs/technology-updates/storage-and-rpc-plan) | Baseline performance test; MessagePack kept; the `bacanoo-io/raft` fork updated; BoltDB replaced by Badger (raft log, client state); gRPC stays for plugin connections (drpc dropped) | Done |

> [!NOTE]
> A plan here describes intended work. Until its status says otherwise, Norca runs on the libraries
> listed under [licence and attribution](/docs/introduction/license) and in `THIRD_PARTY_NOTICES.md`.
