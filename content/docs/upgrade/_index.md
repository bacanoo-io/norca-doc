---
title: "Upgrading"
description: "Learn how to upgrade Norca."
upstream:
  path: "website/content/docs/upgrade/index.mdx"
weight: 17
---

Norca is designed to be flexible and resilient when upgrading from one Norca
version to the next. Upgrades should cause neither a Norca nor a service
outage. However, there are some restrictions to be aware of before upgrading:

- Nomad, the code base of Norca, strives to be backward compatible for at
  least 1 point release, so Nomad v1.6.x hosts work with v1.5.x hosts.
  Upgrading 2 point releases (for example, from v1.4.0 to v1.6.0) may work but
  is untested and unsupported. For moving a Nomad cluster to Norca and for
  upgrades between Norca versions, see [upgrades](/docs/operations/upgrades).

  - Norca does _not_ support downgrading at this time. Downgrading clients
    requires draining allocations and removing the [data directory][data_dir].
    Downgrading servers safely requires re-provisioning the cluster.

  - New features are unlikely to work correctly until all nodes have been
    upgraded.

  - Check the [version upgrade details page][upgrade-specific] for important
    changes and backward incompatibilities.

- When upgrading a Norca Client, if it takes longer than the
  [`heartbeat_grace`][heartbeat_grace] (10s by default) period to restart, all
  allocations on that node may be rescheduled.

Norca supports upgrading in place or by rolling in new servers:

- In Place: The Norca binary can be updated on existing hosts. Running
  allocations will continue running uninterrupted.

- Rolling: New hosts containing the new Norca version may be added followed by
  the removal of old hosts. The old nodes must be drained to migrate running
  allocations to the new nodes.

This guide describes both approaches.

## Upgrade Process

Once you have checked the [upgrade details for the new
version][upgrade-specific], the upgrade process is as simple as updating the
binary on each host and restarting the Norca service.

At a high level we complete the following steps to upgrade Norca:

- **Add the new version**
- **Check cluster health**
- **Remove the old version**
- **Check cluster health**
- **Upgrade clients**

### 1. Add the new version to the existing cluster

While it is possible to upgrade Norca client nodes before servers, this guide
recommends upgrading servers first as many new client features will not work
until servers are upgraded.

In a federated cluster,
new features are not guaranteed to work until all agents in a region and the
server nodes in the authoritative region are upgraded.

Whether you are replacing Norca in place on existing systems or bringing up new
servers you should make changes incrementally, verifying cluster health at each
step of the upgrade.

On a single server, install the new version of Norca. You can do this by
joining a new server to the cluster or by replacing or upgrading the binary
locally and restarting the Norca service.

Note that if you have [`leave_on_terminate`][] or [`leave_on_interrupt`][] set,
you should ensure you're using the expected signal for your upgrade process. For
example, if you have `leave_on_terminate` set and you intend on updating a
server in-place, you should `SIGINT` and not `SIGTERM` when shutting down the
server before restarting it.

### 2. Check cluster health

[Monitor the Norca logs][monitor] on the remaining servers to check that the
new server has joined the cluster correctly.

Run `norca agent-info` on the new servers and check that the `last_log_index`
is of a similar value to the other servers. This step ensures that changes have
been replicated to the new server.

```shell
ubuntu@nomad-server-10-1-1-4:~$ norca agent-info
nomad
  bootstrap = false
  known_regions = 1
  leader = false
  server = true
raft
  applied_index = 53460
  commit_index = 53460
  fsm_pending = 0
  last_contact = 54.512216ms
  last_log_index = 53460
  last_log_term = 1
  last_snapshot_index = 49511
  last_snapshot_term = 1
  num_peers = 2
...
```

Continue with the upgrades across the servers making sure to do a single Norca
server at a time. You can check state of the servers with [`norca server members`][server-members], and the state of the client nodes with [`norca node status`][node-status].

### 3. Remove the old versions from servers

If you are doing an in place upgrade on existing servers this step is not
necessary as the version was changed in place.

If you are doing an upgrade by adding new servers and removing old servers
from the fleet you need to ensure that the server has left the fleet safely.

1. Stop the service on the existing host
2. On another server issue a `norca server members` and check the status, if
   the server is now in a left state you are safe to continue.
3. If the server is not in a left state, issue a `norca server force-leave <server id>`
   to remove the server from the cluster.

Monitor the logs of the other hosts in the Norca cluster over this period.

### 4. Check cluster health

Use the same actions in step #2 above to confirm cluster health.

### 5. Upgrade clients

Following the successful upgrade of the servers you can now update your
clients using a similar process as the servers. You may either upgrade clients
in-place or start new nodes on the new version. See the
[`migrate` block](/docs/job-specification/migrate) for how to migrate running
allocations from the old nodes to the new nodes with the [`norca node drain`](/docs/commands/node/drain/) command.

## Done

You are now running the latest Norca version. You can verify all
Clients joined by running `norca node status` and checking all the clients
are in a `ready` state.

[data_dir]: /docs/configuration#data_dir
[heartbeat_grace]: /docs/configuration/server#heartbeat_grace
[monitor]: /docs/commands/monitor/
[node-status]: /docs/commands/node/status/
[server-members]: /docs/commands/server/members/
[upgrade-specific]: /docs/upgrade/upgrade-specific/

## Upgrading to Raft Protocol 3

This section provides details on upgrading to Raft Protocol 3. Raft
protocol version 3 requires Nomad 0.8.0 or newer (or Norca) on all
servers in order to work. Raft protocol version 2 will be removed in
Nomad 1.4.0.

To see the version of the Raft protocol in use on each server, use the
`norca operator raft list-peers` command.

Note that the format of `peers.json` used for outage recovery is
different when running with the latest Raft protocol.

When using Raft protocol version 3, servers are identified by their
`node-id` instead of their IP address when Norca makes changes to its
internal Raft quorum configuration. This means that once a cluster has
been upgraded with servers all running Raft protocol version 3, it
will no longer allow servers running any older Raft protocol versions
to be added.

### Upgrading a Production Cluster to Raft Version 3

For production raft clusters with 3 or more members, the easiest way
to upgrade servers is to have each server leave the cluster, upgrade
its [`raft_protocol`] version in the `server` block (if upgrading to
a version lower than v1.3.0), and then add it back. Make sure the new
server joins successfully and that the cluster is stable before
rolling the upgrade forward to the next server. It's also possible to
stand up a new set of servers, and then slowly stand down each of the
older servers in a similar fashion.

For in-place raft protocol upgrades, perform the following for each
server, leaving the leader until last to reduce the chance of leader
elections that will slow down the process:

* Stop the server.
* Run `norca server force-leave $server_name`.
* If the upgrade is for a Nomad version lower than v1.3.0, update the
  [`raft_protocol`] in the server's configuration file to `3`.
* Restart the server.
* Run `norca operator raft list-peers` to verify that the
  `RaftProtocol` for the server is now `3`.
* On the server, run `norca agent-info` and check that the
  `last_log_index` is of a similar value to the other servers. This
  step ensures that raft is healthy and changes are replicating to the
  new server.

### Upgrading a Single Server Cluster to Raft Version 3

If you are running a single Norca server, restarting it in-place will
result in that server not being able to elect itself as a leader. To
avoid this, create a new `peers.json` file before
restarting the server with the new configuration. If you have `jq`
installed you can run the following script on the server's host to
write the correct `peers.json` file:

```
#!/usr/bin/env bash

NOMAD_DATA_DIR=$(norca agent-info -json | jq -r '.config.DataDir')
NOMAD_ADDR=$(norca agent-info -json | jq -r '.stats.nomad.leader_addr')
NODE_ID=$(cat "$NOMAD_DATA_DIR/server/node-id")

cat <<EOF > "$NOMAD_DATA_DIR/server/raft/peers.json"
[
  {
    "id": "$NODE_ID",
    "address": "$NOMAD_ADDR",
    "non_voter": false
  }
]
EOF
```

After running this script, if the upgrade is for a Nomad version lower
than v1.3.0, update the [`raft_protocol`] in the server's
configuration to `3` and restart the server.

[`raft_protocol`]: /docs/configuration/server#raft_protocol
[`leave_on_interrupt`]: /docs/configuration#leave_on_interrupt
[`leave_on_terminate`]: /docs/configuration#leave_on_terminate
