---
title: "Observers and hot standby servers – plan"
weight: 8
status: "In progress"
---

**Status:** In progress · 2026-11-12 (phases 1–4 implemented; phases 5 and 6 postponed) · Feature page: [observers and hot standby servers](/docs/features/server-roles) · Starting point: Nomad v1.6.5 · [Clean room development](/docs/clean-room/development#features)

A region can hold servers that replicate the Raft log and the state but do not vote. **Observers** never vote: they add capacity for stale reads, scheduling and backups without a larger quorum. **Standbys** do not vote until a voter fails: autopilot then gives a caught-up standby the vote, so the voter set is restored without a person. One component owns the voter set, autopilot; the manual command only asks it.

| Topic | Decision |
| --- | --- |
| Roles | `server { role = "voter" \| "standby" \| "observer" }`; replaces `non_voting_server` |
| Who decides the votes | **Autopilot only**, through Norca's own promoter; no other code path changes a vote |
| Hot standby | A standby is promoted only when a voter has been failed long enough and the voters are below the target; the standby in the datacenter of the failed voter is preferred, then the most caught up |
| Manual failover | `norca operator raft promote-standby -id <standby> [-replace <failed voter>]`: checks, removes the failed voter, and lets autopilot promote |
| Reads | Observers and standbys serve stale reads; consistent reads always go to the leader |
| Backups | Scheduled and manual backups may run on an observer (`backup { prefer_observer = true }`); the leader is the fallback |
| Job checks | The static validation and a dry run of the placements on the server that received the request; request limits per ACL token |
| Heartbeats | A relay on observers is a later phase, only after measurements |
| History | No database is added; a longer event history on observers is postponed |

## Table of contents

- [Goals and non-goals](#goals-and-non-goals)
- [Starting point in Nomad 1.6.5](#starting-point-in-nomad-165)
- [Roles and configuration](#roles-and-configuration)
- [The promoter](#the-promoter)
- [Manual failover](#manual-failover)
- [Reads, scheduling and RPC](#reads-scheduling-and-rpc)
- [Backups from an observer](#backups-from-an-observer)
- [Job checks before the leader](#job-checks-before-the-leader)
- [Postponed parts](#postponed-parts)
- [Observability](#observability)
- [Failure scenarios](#failure-scenarios)
- [Testing](#testing)
- [Phases](#phases)
- [Decisions](#decisions)
- [License and clean room](#license-and-clean-room)

## Goals and non-goals

Goals:

1. Servers that replicate the Raft log and the state store but never vote (**observers**): more servers for stale reads, RPC load and backups without a larger quorum.
2. Servers that do not vote until a voter fails (**standbys**): the voter set is restored without a person, in seconds to minutes, by a caught-up server.
3. **One owner of the voter set: autopilot.** Manual commands only ask it.
4. Work taken off the voters where it is safe: backups, reads, job checks.

Non-goals:

- Changes to the Raft protocol.
- Linearizable reads served by observers. That would need a read index protocol; consistent reads go to the leader.
- Observers in another region. Raft stays inside a region.
- A relational or analytical database for history.
- Web UI changes; the API and the CLI carry everything.

## Starting point in Nomad 1.6.5

| Piece | Where | In Nomad v1.6.5 |
| --- | --- | --- |
| `non_voting_server` | `command/agent/config.go`, `NonVoter` of the server configuration | Serf tag `nonvoter=1`; the bootstrap counts voters only and adds such a server without a vote |
| Join | `leader.go`, `addRaftPeer` | Every new server joins without a vote |
| Promotion | `autopilot_oss.go`, the default promoter of autopilot | **Every stable server without a vote is promoted**, so `non_voting_server` has no lasting effect |
| Failed servers | autopilot `CleanupDeadServers`, `MinQuorum` | Failed voters are removed while the voters stay at or above `MinQuorum` |
| Health | autopilot server health | The autopilot health API (`/v1/operator/autopilot/health`) |
| Reads | `forward()` | Stale reads on any server; consistent reads on the confirmed leader |
| Backups | the backup manager of the leader | Scheduled backups run on the leader only (a Norca feature) |
| Admission | `Job.Register` | Validation and admission run after the forward, on the leader |

Non-voting servers that stay without a vote, redundancy zones and the enterprise autopilot are features of Nomad Enterprise, whose code was never published.

## Roles and configuration

```hcl
server {
  enabled = true
  role    = "voter"     # "voter" (default) | "standby" | "observer"
}

autopilot {
  # Number of voters autopilot keeps. 0 (default): every server with the role "voter" votes
  # and no standby is promoted. 3 or 5: standbys fill the gaps up to this number.
  target_voters = 3

  # How long a voter must be failed before a standby replaces it.
  standby_failover_after = "1m"

  # Minimum time between two changes of the voter set made for standbys.
  standby_cooldown = "5m"
}
```

- `role` replaces `non_voting_server`. There are no released versions, so the old option is removed, not kept as an alias.
- The role travels to the other servers as the Serf tag `raft_role`. A missing or unknown value is a voter. Autopilot reads the role from the member data.
- `bootstrap_expect` counts servers with the role `voter` only; standbys and observers never bootstrap.
- `target_voters` must be 0, 1, 3, 5 or 7. A standby in a cluster with `target_voters = 0` logs a warning: it is never promoted.
- The role changes with a restart only, not on a reload: the Serf tag is set at startup.
- **The autopilot configuration is part of the Raft snapshot.** A server that restores its state from a snapshot and becomes the leader keeps what `operator autopilot set-config` had set, `target_voters` among it.

## The promoter

Autopilot asks a *promoter* which servers to promote and demote. Norca replaces the default promoter with its own, which knows the roles. In every autopilot round, with at most one change of a standby per round:

1. **Role voter.** A stable server with the role `voter` and no vote is promoted.
2. **Role observer.** Never promoted. A voter whose role is now `observer` (a server restarted with another role) is demoted, and only while the voters that are left have a healthy majority among themselves.
3. **Standby promotion**, when all of these hold:
   - `target_voters > 0` and the healthy voters are fewer than `target_voters`;
   - a voter has been unhealthy for at least `standby_failover_after`, or is gone from the configuration (removed by the cleanup or by hand);
   - the cooldown has passed;
   - a standby is healthy and stable, and its last log index is within `max_trailing_logs` of the leader.

   The standby that is chosen: the same datacenter as the failed voter first, then the highest log index, then the lowest ID, so the choice is deterministic.
4. **Standby demotion**, when the voters exceed `target_voters` because a `voter`-role server came back and is stable: the least caught-up promoted standby is demoted, after the cooldown. A demotion never brings the voters below `target_voters`.
5. The voter count stays odd where possible.

Three rules keep the timing honest:

- **The cooldown counts from the change itself**, as it shows in the autopilot state, not from the moment the promoter asked for it. A promotion that Raft did not apply is asked for again in the next round. The cooldown lives in the leader's promoter; a new leader starts without one.
- **With a target, a failed voter is not removed before `standby_failover_after`.** The cleanup of dead servers would otherwise remove it at once, the voters would fall below the target, and the standby would be promoted without waiting.
- **Failed observers and standbys can always be removed**; failed voters as before (`MinQuorum`).

Promotion first and removal later is safe. A promoted standby raises the voters by one: with one voter of three failed the quorum is 3 of 4 until the cleanup, which the two healthy voters and the standby provide.

## Manual failover

```text
norca operator raft promote-standby -id <standby> [-replace <failed voter>] [-force]
```

- The request needs the `operator:write` capability and is forwarded to the leader.
- **Checks:** the target exists, has the role `standby`, is healthy and within `max_trailing_logs`; `-replace` names a voter that autopilot reports unhealthy, or that Serf reports failed or left. `-force` skips the health check of the replaced voter only; the checks of the standby always apply.
- **Nothing is removed unless a promotion can follow.** The command refuses when the healthy voters without the replaced one still meet the target, and while a `voter`-role server waits for its vote.
- **Action:** the failed voter is removed from the Raft configuration by its ID. The promotion itself is left to the promoter, which now sees fewer healthy voters than the target. The command waits for it (30 seconds) and reports the new configuration.
- A manual request skips the cooldown and `standby_failover_after`.
- Without `target_voters` the command refuses: nothing would promote the standby.

## Reads, scheduling and RPC

- **Reads.** Observers and standbys answer stale reads from their state store, like followers. Consistent reads are forwarded to the leader. Clients may list observers among their servers.
- **Scheduling workers.** Observers are servers and run scheduler workers by default, which adds scheduling capacity: the workers take their work from the leader's queue. An observer meant only for reads and backups sets `num_schedulers = 0`.
- **Leader load.** The leader replicates to every observer and standby; its CPU and network use grow with their number.
- **Leadership.** A server without a vote never becomes the leader, and a leadership transfer only targets voters.

## Backups from an observer

Raft snapshots for log compaction stay where they are: every server compacts its own log. What moves is the [backup](/docs/features/backup-restore).

- With `backup { prefer_observer = true }` the leader picks a healthy observer, the most caught up first, for each scheduled and manual backup. The observer takes the backup from its local state store, records the Raft index it covers, encrypts and uploads it, and reports back. The leader writes the record and applies the retention.
- **The leader is the fallback:** with no healthy observer, after a refusal or a failed observer backup, the leader takes the backup itself with the same ID. The backup before a full restore is always taken by the leader.
- An observer takes a backup only with the same `backup` configuration as the leader's, compared by a fingerprint of the destinations and the encryption, without the credentials. That is also how an observer is left out.
- The request is accepted only from the current leader, over a connection with a server certificate, and only by a server with the role `observer`.
- The record and the manifest name the server that took the backup (`TakenBy`). Restore is unchanged.

## Job checks before the leader

A job registration is forwarded to the leader, which validates it. The server that receives the request, an observer or any follower, can reject a bad request before it reaches the leader.

1. **Validation.** The receiving server runs the mutators without the webhook mutator, then the static job validation. It skips the check when a mutating webhook applies to the namespace, because the webhook may complete the job.
2. **What stays with the leader:** the validators that read the state (quotas, node pools, namespaces, secrets), the admission policies and the validating webhooks. The state of the receiving server may be behind, which would reject a valid job; the denial events are published by the leader only; and the webhooks would be called twice.
3. **Dry-run capacity check.** `dry_run_capacity` on register and plan runs the scheduler on the state of the receiving server and reports the groups that would not be placed. It does not bind the leader, which schedules as usual.
4. **Request limits per ACL token**, optional and off by default: `limits { token_read_requests_per_second, token_read_burst, token_write_requests_per_second, token_write_burst }` on the HTTP API of the servers. A request over the limit gets `429` with `Retry-After`. Requests without a known ACL token share one bucket. There is no limit per client address.

## Postponed parts

- **Heartbeat relay.** Clients heartbeat to any server, and the request is forwarded to the leader. A relay on observers would answer heartbeats locally and send the leader one batch per interval. It is built only if a measurement shows heartbeat handling as a significant cost of the leader; the existing limit on heartbeats per second already bounds the rate. The failure detection time must stay the same, and the failure of an observer must not mark its nodes down.
- **History on observers.** A second stream of the [system bus](/docs/features/system-bus) with a long retention, stored on observers, and an API to read it. Postponed: the long-term keeping and searching of events is left to the telemetry export, where an external backend does that work.
- **Operator events.** A record of every operator write call (who, what, the result). Moved to the telemetry export work, as audit log records.
- **Operator reads served by observers.** The read endpoints of the operator API answered by an observer with a stale read.

## Observability

- `norca operator raft list-peers` shows a `Role` column next to the vote; the autopilot health API shows the role of every server.
- The metrics store of the leader keeps `norca.cluster.autopilot_voters`, `norca.cluster.autopilot_standbys_ready`, `norca.cluster.autopilot_standby_promotions` and `norca.cluster.autopilot_standby_demotions`; every server counts the backups an observer took for it in `norca.backup.taken_by_observer`.
- Every standby promotion and demotion is an event of the `Server` topic (`StandbyPromoted`, `StandbyDemoted`), published by the leader that sees the change. The events are not written to Raft.
- One log line per change names the failed voter, the chosen standby, its lag and the reason.

## Failure scenarios

| Scenario | Expected behaviour |
| --- | --- |
| One voter of 3 dies, a standby is ready | After `standby_failover_after` the standby is promoted (4 voters, 1 unhealthy), then the cleanup removes the dead voter (3 voters) |
| The dead voter comes back | It joins without a vote; with the role `voter` it is promoted when stable; then there are 4 voters and the standby is demoted after the cooldown |
| A voter is unreachable for less than `standby_failover_after` | Nothing changes |
| Two voters of 3 die | No quorum: Raft needs one for a configuration change, so autopilot cannot change anything; manual recovery |
| A standby is lagging | Not chosen; with no caught-up standby nothing is promoted, and autopilot logs why |
| The leader dies | A normal election among the voters; a standby promotion follows if a voter is still missing |
| All observers die | Stale reads move to the other servers; backups fall back to the leader |
| A server's role changes from voter to observer | After its restart it is demoted; if that leaves fewer voters than `target_voters`, a standby fills in |

## Testing

- **Unit tests** of the promoter on autopilot state fixtures: every rule above, the choice by datacenter and lag, the cooldown, odd counts, no change without a quorum.
- **Server tests** with 3 voters, 1 standby and 1 observer in one process: a voter is stopped, the promotion and the cleanup follow; it comes back, the demotion follows; the observer is never promoted; the checks of `promote-standby`.
- **Lab case** with the same topology on virtual machines in two sites: a voter powered off and back, the manual failover, stale reads from the standby and the observer, a backup taken by the observer and by the leader while the observer is stopped.

## Phases

| Phase | Content | Status |
| --- | --- | --- |
| 1 | `role` and the Serf tag, the promoter (voter and observer rules), `bootstrap_expect`, `list-peers` and health output | Implemented |
| 2 | Standby: `target_voters`, failover and demotion rules, cooldown, `promote-standby`, events and metrics, lab case | Implemented |
| 3 | Backups from observers (`prefer_observer`) | Implemented |
| 4 | Job checks on the receiving server and request limits per ACL token | Implemented |
| 5 | History stream on observers and its API, operator events | Postponed |
| 6 | Heartbeat relay, only if a measurement asks for it | Postponed |

## Decisions

1. **`target_voters` defaults to 0.** Every `voter`-role server votes, as before; standbys are promoted only where a target is set.
2. **A promoted standby steps back** when the old voter returns and is stable.
3. **Observers take scheduled and manual backups**, not only the scheduled ones.
4. **Request limits per token are optional** and off by default; there is no limit per client address.
5. **No database is added** for history.

## License and clean room

Servers that stay without a vote are an Enterprise feature of Nomad, and HashiCorp never published its code. Nomad v1.6.5 (MPL 2.0) contains only the public side: the `non_voting_server` option, the Serf tag, the bootstrap that counts voters only, and the empty extension points of autopilot.

This work is a **clean room development**. Its sources were the Norca tree, the Raft library and the public autopilot library with its promoter interface (both MPL 2.0). No Enterprise code, binary or documentation, and no HashiCorp source or documentation of a BSL release was used; the behaviour is designed from Norca's own requirements. The record of the commits and files is on the [clean room development](/docs/clean-room/development#features) page.
