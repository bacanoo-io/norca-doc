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
}
```

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

- `enable_redundancy_zones` `(bool: false)` - Not supported in Norca:
  redundancy zones are not available, and the agent refuses to start when this
  is set to `true`.

- `disable_upgrade_migration` `(bool: false)` - Not supported in Norca: upgrade
  migrations are not available, and the agent refuses to start when this is set
  to `true`.

- `enable_custom_upgrades` `(bool: false)` - Not supported in Norca: custom
  upgrade versions are not available, and the agent refuses to start when this
  is set to `true`.
