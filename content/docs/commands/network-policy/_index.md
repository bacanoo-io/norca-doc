---
title: "Command: network-policy"
linkTitle: "network-policy"
description: "The network-policy command is used to manage network policies and admin network policies."
---

The `network-policy` command (Norca) is used to manage
[network rules](/docs/features/network-rules): namespace `NetworkPolicy` objects
and, with `-admin`, cluster-level `AdminNetworkPolicy` objects. The rules are
enforced with nftables in the network namespace of the selected allocations
(bridge and CNI network modes).

## Usage

Usage: `norca network-policy <subcommand> [options] [args]`

Run `norca network-policy <subcommand> -h` for help on that subcommand. The
following subcommands are available:

- [`network-policy apply`][apply] - Create or update a network policy
- [`network-policy delete`][delete] - Delete a network policy
- [`network-policy list`][list] - List network policies
- [`network-policy status`][status] - Show a network policy and the allocations it selects

The policy file format is described in the
[network policy specification](/docs/other-specifications/network-policy).

[apply]: /docs/commands/network-policy/apply 'Create or update a network policy'
[delete]: /docs/commands/network-policy/delete 'Delete a network policy'
[list]: /docs/commands/network-policy/list 'List network policies'
[status]: /docs/commands/network-policy/status 'Show a network policy and the allocations it selects'
