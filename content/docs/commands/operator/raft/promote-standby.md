---
title: "Command: operator raft promote-standby"
linkTitle: "operator raft promote-standby"
description: "Promote a standby server to a voter by hand (manual failover)."
---

Promote a [standby server](/docs/configuration/server#role) to a voter by hand:
the manual failover of Norca.

The leader checks that the server has the role `standby`, is healthy and caught
up, and that autopilot [`target_voters`](/docs/configuration/autopilot#target_voters)
is set. With `-replace` it then removes the failed voter from the Raft
configuration, and autopilot promotes the standby without waiting for the
standby cooldown or for `standby_failover_after`. Without `-replace` the
healthy voters must already be fewer than `target_voters`. The command waits up
to 30 seconds for the promotion and prints the new Raft configuration.

**Nothing is removed unless the promotion can follow.** The command refuses
when the healthy voters without the replaced one still meet `target_voters`
(take such a server out with
[`operator raft remove-peer`](/docs/commands/operator/raft/remove-peer)), and
while a server with the role `voter` waits for its vote: autopilot gives that
server its vote first.

Autopilot also promotes standbys on its own when a voter has been unhealthy for
[`standby_failover_after`](/docs/configuration/autopilot#standby_failover_after);
this command is for a failover before that time, or after a voter is known to
be lost. When the replaced server comes back, it joins as a non-voter, autopilot
gives it its vote again, and the standby steps back after the cooldown.

For the HTTP API see [Promote a Standby Server](/docs/api/operator/raft#promote-a-standby-server).

## Usage

```plaintext
norca operator raft promote-standby -id <standby> [options]
```

If ACLs are enabled, this command requires a token with the `operator:write`
capability.

## General Options

- `-address=<addr>`: The address of the Norca server. Overrides the `NORCA_ADDR`
  environment variable if set. Defaults to `http://127.0.0.1:4646`.

- `-region=<region>`: The region of the Norca server to forward commands to.
  Overrides the `NORCA_REGION` environment variable if set. Defaults to the
  Agent's local region.

- `-no-color`: Disables colored command output. Alternatively,
  `NORCA_CLI_NO_COLOR` may be set. This option takes precedence over
  `-force-color`.

- `-force-color`: Forces colored command output. This can be used in cases where
  the usual terminal detection fails. Alternatively, `NORCA_CLI_FORCE_COLOR`
  may be set. This option has no effect if `-no-color` is also used.

- `-ca-cert=<path>`: Path to a PEM encoded CA cert file to use to verify the
  Norca server SSL certificate. Overrides the `NORCA_CACERT` environment
  variable if set.

- `-ca-path=<path>`: Path to a directory of PEM encoded CA cert files to verify
  the Norca server SSL certificate. If both `-ca-cert` and `-ca-path` are
  specified, `-ca-cert` is used. Overrides the `NORCA_CAPATH` environment
  variable if set.

- `-client-cert=<path>`: Path to a PEM encoded client certificate for TLS
  authentication to the Norca server. Must also specify `-client-key`. Overrides
  the `NORCA_CLIENT_CERT` environment variable if set.

- `-client-key=<path>`: Path to an unencrypted PEM encoded private key matching
  the client certificate from `-client-cert`. Overrides the `NORCA_CLIENT_KEY`
  environment variable if set.

- `-tls-server-name=<value>`: The server name to use as the SNI host when connecting
  via TLS. Overrides the `NORCA_TLS_SERVER_NAME` environment variable if set.

- `-tls-skip-verify`: Do not verify TLS certificate. This is highly not
  recommended. Verification will also be skipped if `NORCA_SKIP_VERIFY` is set.

- `-token`: The SecretID of an ACL token to use to authenticate API requests with.
  Overrides the `NORCA_TOKEN` environment variable if set.

## Promote Standby Options

- `-id=<standby>`: The Raft ID of the standby server to promote. Required.

- `-replace=<voter>`: The Raft ID of the failed voter the standby replaces. The
  voter is removed from the Raft configuration before the promotion. It must be
  unhealthy for autopilot, unless `-force` is set. The leader is never
  replaced.

- `-force`: Replace the voter even when autopilot reports it healthy. The checks
  of the standby always apply.

## Examples

Replace the voter `nomad-2` (powered off) with the standby `nomad-4`, with the
Raft IDs from [`norca operator raft list-peers`](/docs/commands/operator/raft/list-peers):

```shell-session
$ norca operator raft promote-standby \
    -id 59a1bc0e-0a1c-7b36-3e6a-6d4b4f0e8a1d \
    -replace 1d7a2bd8-6c9e-4e5c-2b0f-3f1a0c2b9e44
Removed voter "1d7a2bd8-6c9e-4e5c-2b0f-3f1a0c2b9e44", promoted standby "59a1bc0e-0a1c-7b36-3e6a-6d4b4f0e8a1d"

Node             ID                                    Address         State     Voter  Role      RaftProtocol
nomad-1.global   0e5bd5a4-8d4a-2f1c-9a63-1f0c6c8a2d10  10.0.0.1:4647   leader    true   voter     3
nomad-3.global   7c2f9b1e-3a5d-4e8f-b6c4-2d9a0e1f3b57  10.0.0.3:4647   follower  true   voter     3
nomad-4.global   59a1bc0e-0a1c-7b36-3e6a-6d4b4f0e8a1d  10.0.0.4:4647   follower  true   standby   3
nomad-5.global   a4d8e2f6-1b3c-4d5e-8f7a-9b0c1d2e3f40  10.0.0.5:4647   follower  false  observer  3
```
