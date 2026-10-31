---
title: "Command: operator"
linkTitle: "operator"
description: "The operator command provides cluster-level tools for Norca operators."
upstream:
  path: "website/content/docs/commands/operator/index.mdx"
---

The `operator` command provides cluster-level tools for Norca operators, such
as interacting with the Raft subsystem.

> [!WARNING]
> Use this command with extreme caution, as improper use could lead to a Norca
> outage and even loss of data.

For an API to perform these operations programmatically, please see the
documentation for the [Operator] endpoint.

## Usage

Usage: `norca operator <subcommand> <subcommand> [options]`

Run `norca operator <subcommand>` with no arguments for help on that subcommand.
The following subcommands are available:

- [`operator autopilot get-config`][get-config] - Display the current Autopilot
  configuration

- [`operator autopilot set-config`][set-config] - Modify the current Autopilot
  configuration

- [`operator backup`](/docs/commands/operator/backup) - (Norca) List, browse
  and restore the scheduled backups of a region

- [`operator bus status`](/docs/commands/operator/bus/status) - (Norca)
  Display the status of the system bus of a server

- [`operator consul-kv migrate`](/docs/commands/operator/consul-kv/migrate) -
  (Norca) Copy the Consul KV from Variables to the system bus

- [`operator debug`][debug] - Build an archive of debug data

- [`operator gossip keyring generate`][gossip_keyring_generate] - Generates a gossip encryption key

- [`operator gossip keyring install`][gossip_keyring_install] - Install a gossip encryption key

- [`operator gossip keyring list`][gossip_keyring_list] - List available gossip encryption keys

- [`operator gossip keyring remove`][gossip_keyring_remove] - Deletes a gossip encryption key

- [`operator gossip keyring use`][gossip_keyring_use] - Sets a gossip encryption key as the active key

- [`operator init`](/docs/commands/operator/init) - (Norca) Scaffold an
  operator project for the controller SDK

- [`operator keyring rewrap`](/docs/commands/operator/keyring-rewrap) - (Norca)
  Move the keyring to another seal

- [`operator raft list-peers`][list] - Display the current Raft peer
  configuration

- [`operator raft remove-peer`][remove] - Remove a Norca server from the Raft
  configuration

- [`operator root keyring list`][root_keyring_list] - List available root encryption keys

- [`operator root keyring remove`][root_keyring_remove] - Deletes a root encryption key

- [`operator root keyring rotate`][root_keyring_rotate] - Rotates the root encryption key

- [`operator seal-status`](/docs/commands/operator/seal-status) - (Norca) Show
  the keyring seal status of the servers

- [`operator scheduler get-config`][scheduler-get-config] - Display the current
  scheduler configuration

- [`operator scheduler set-config`][scheduler-set-config] - Modify the scheduler
  configuration

- [`operator snapshot save`][snapshot-save] - Saves a snapshot of the Norca server state

- [`operator snapshot restore`][snapshot-restore] - Restores a snapshot of the Norca server state

- [`operator snapshot inspect`][snapshot-inspect] - Inspects a snapshot of the Norca server state

- [`operator unseal`](/docs/commands/operator/unseal) - (Norca) Enter an unseal
  share on a server

[debug]: /docs/commands/operator/debug/ 'Builds an archive of configuration and state'
[get-config]: /docs/commands/operator/autopilot/get-config/ 'Autopilot Get Config command'
[gossip_keyring_generate]: /docs/commands/operator/gossip/keyring-generate/ 'Generates a gossip encryption key'
[gossip_keyring_install]: /docs/commands/operator/gossip/keyring-install/ 'Install a gossip encryption key'
[gossip_keyring_list]: /docs/commands/operator/gossip/keyring-list/ 'List available gossip encryption keys'
[gossip_keyring_remove]: /docs/commands/operator/gossip/keyring-remove/ 'Deletes a gossip encryption key'
[gossip_keyring_use]: /docs/commands/operator/gossip/keyring-use/ 'Sets a gossip encryption key as the active key'
[list]: /docs/commands/operator/raft/list-peers/ 'Raft List Peers command'
[operator]: /docs/api/operator/ 'Operator API documentation'
[remove]: /docs/commands/operator/raft/remove-peer/ 'Raft Remove Peer command'
[root_keyring_list]: /docs/commands/operator/root/keyring-list/ 'List available root encryption keys'
[root_keyring_remove]: /docs/commands/operator/root/keyring-remove/ 'Deletes a root encryption key'
[root_keyring_rotate]: /docs/commands/operator/root/keyring-rotate/ 'Rotates the root encryption key'
[set-config]: /docs/commands/operator/autopilot/set-config/ 'Autopilot Set Config command'
[snapshot-save]: /docs/commands/operator/snapshot/save/ 'Snapshot Save command'
[snapshot-restore]: /docs/commands/operator/snapshot/restore/ 'Snapshot Restore command'
[snapshot-inspect]: /docs/commands/operator/snapshot/inspect/ 'Snapshot Inspect command'
[scheduler-get-config]: /docs/commands/operator/scheduler/get-config/ 'Scheduler Get Config command'
[scheduler-set-config]: /docs/commands/operator/scheduler/set-config/ 'Scheduler Set Config command'
