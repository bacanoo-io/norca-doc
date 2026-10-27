---
title: "Command: operator autopilot get-config"
linkTitle: "operator autopilot get-config"
description: "Display the current Autopilot configuration."
upstream:
  path: "website/content/docs/commands/operator/autopilot/get-config.mdx"
---

The Autopilot operator command is used to view the current Autopilot
configuration. See the [`autopilot` block](/docs/configuration/autopilot) for
more information about Autopilot.

## Usage

```plaintext
norca operator autopilot get-config [options]
```

If ACLs are enabled, this command requires a token with the `operator:read`
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

The output looks like this:

```shell
$ norca operator autopilot get-config
CleanupDeadServers = true
LastContactThreshold = 200ms
MaxTrailingLogs = 250
ServerStabilizationTime = 10s
RedundancyZoneTag = ""
DisableUpgradeMigration = false
UpgradeMigrationTag = ""
```

- `CleanupDeadServers` - Specifies automatic removal of dead
  server nodes periodically and whenever a new server is added to the cluster.

- `LastContactThreshold` - Specifies the maximum amount of
  time a server can go without contact from the leader before being considered
  unhealthy. Must be a duration value such as `10s`.

- `MaxTrailingLogs` - specifies the maximum number of log entries
  that a server can trail the leader by before being considered unhealthy.

- `ServerStabilizationTime` - Specifies the minimum amount of
  time a server must be stable in the 'healthy' state before being added to the
  cluster. Only takes effect if all servers are running Raft protocol version 3
  or higher. Must be a duration value such as `30s`.

- `RedundancyZoneTag` - Not used by Norca: redundancy zones are not available.

- `DisableUpgradeMigration` - Not supported in Norca: upgrade migrations are not
  available, so this is always `false`.

- `UpgradeVersionTag` - Not used by Norca: custom upgrade versions are not
  available.

Each `NORCA_*` environment variable above is also accepted with its Nomad
name, for example `NOMAD_ADDR` for `NORCA_ADDR`. The `NORCA_*` variable takes
precedence when both are set.
