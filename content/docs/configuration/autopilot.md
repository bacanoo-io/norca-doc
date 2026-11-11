---
title: "autopilot Block"
linkTitle: "autopilot"
description: "The \"autopilot\" block configures the Norca agent to configure Autopilot behavior."
upstream:
  path: "website/content/docs/configuration/autopilot.mdx"
---

**Placement:** `autopilot`

The `autopilot` block configures the Norca agent to configure Autopilot behavior.
Autopilot manages the Raft peer set of the servers: it removes dead servers and
promotes new servers to voters once they are stable.

```hcl
autopilot {
    cleanup_dead_servers      = true
    last_contact_threshold    = "200ms"
    max_trailing_logs         = 250
    server_stabilization_time = "10s"
    target_voters             = 3
    standby_failover_after    = "1m"
    standby_cooldown          = "5m"
}
```

The agent configuration is the initial autopilot configuration: the cluster
stores it when it bootstraps, and later changes are made with
[`norca operator autopilot set-config`](/docs/commands/operator/autopilot/set-config).

## `autopilot` Parameters

- `cleanup_dead_servers` `(bool: true)` - Specifies automatic removal of dead
  server nodes periodically and whenever a new server is added to the cluster.

- `last_contact_threshold` `(string: "200ms")` - Specifies the maximum amount of
  time a server can go without contact from the leader before being considered
  unhealthy. Must be a duration value such as `10s`.

- `max_trailing_logs` `(int: 250)` specifies the maximum number of log entries
  that a server can trail the leader by before being considered unhealthy.

- `server_stabilization_time` `(string: "10s")` - Specifies the minimum amount of
  time a server must be stable in the 'healthy' state before being added to the
  cluster. Only takes effect if all servers are running Raft protocol version 3
  or higher. Must be a duration value such as `30s`.

- `target_voters` `(int: 0)` - The number of voters autopilot keeps with
  [standby servers](/docs/configuration/server#role) (Norca): `0`, `1`, `3`,
  `5` or `7`. With `0` every server with the role `voter` votes and a standby
  is never promoted. With a target:

  - when the healthy voters are fewer than the target because a voter has been
    unhealthy for `standby_failover_after`, or a voter is gone from the Raft
    configuration (removed by `cleanup_dead_servers` or by hand), autopilot
    promotes a standby: a healthy, stable one within `max_trailing_logs` of
    the leader, from the datacenter of the failed voter first, then the most
    caught up;
  - when a `voter`-role server comes back and the voters are more than the
    target, the least caught-up promoted standby steps back, as long as the
    other voters keep the target healthy;
  - a promoted standby that leads hands the leadership to a voter first.

  At most one standby changes per autopilot round. The failed voter itself is
  removed by `cleanup_dead_servers`, which can happen before
  `standby_failover_after`: then the standby is promoted at once. A
  [manual failover](/docs/commands/operator/raft/promote-standby) does not
  wait.

- `standby_failover_after` `(string: "1m")` - How long a voter must be
  unhealthy before a standby replaces it. A network flap shorter than this
  changes nothing.

- `standby_cooldown` `(string: "5m")` - The minimum time between two changes of
  the voter set made for standbys (a promotion and the step back after it).

- `enable_redundancy_zones` `(bool: false)` - **Not supported in Norca:**
  redundancy zones are not available, and **the agent refuses to start when this
  is set to `true`.**

- `disable_upgrade_migration` `(bool: false)` - **Not supported in Norca:** upgrade
  migrations are not available, and **the agent refuses to start when this is set
  to `true`.**

- `enable_custom_upgrades` `(bool: false)` - **Not supported in Norca:** custom
  upgrade versions are not available, and **the agent refuses to start when this
  is set to `true`.**
