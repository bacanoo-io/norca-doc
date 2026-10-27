---
title: "Command: volume create"
linkTitle: "volume create"
description: "Create volumes with CSI plugins."
upstream:
  path: "website/content/docs/commands/volume/create.mdx"
---

The `volume create` command creates external storage volumes with Norca's
[Container Storage Interface (CSI)][csi] support. Only CSI plugins that
implement the [Controller][csi_plugins_internals] interface support this
command. The volume will also be [registered] when it is successfully created.

## Usage

```plaintext
norca volume create [options] [file]
```

The `volume create` command requires a single argument, specifying the path to
a file containing a valid [volume specification][volume_specification]. This
file will be read and the volume will be submitted to Norca for scheduling. If
the supplied path is "-", the volume file is read from STDIN. Otherwise it is
read from the file at the supplied path.

When ACLs are enabled, this command requires a token with the
`csi-write-volume` capability for the volume's namespace.

## General Options

- `-address=<addr>`: The address of the Norca server. Overrides the `NORCA_ADDR`
  environment variable if set. Defaults to `http://127.0.0.1:4646`.

- `-region=<region>`: The region of the Norca server to forward commands to.
  Overrides the `NORCA_REGION` environment variable if set. Defaults to the
  Agent's local region.

- `-namespace=<namespace>`: The target namespace for queries and actions bound
  to a namespace. Overrides the `NORCA_NAMESPACE` environment variable if set.
  If set to `'*'`, subcommands which support this functionality query all
  namespaces authorized to user. Defaults to the "default" namespace.

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

Each `NORCA_*` environment variable above is also accepted with its Nomad
name, for example `NOMAD_ADDR` for `NORCA_ADDR`. The `NORCA_*` variable takes
precedence when both are set.

## Volume Specification

<!--
Redirection rules are applied server-side, so we can't redirect these sections
that used to be located in this page since they use URL fragments. Creating
these hidden anchors will at least point users to the new page, although not to
the exact section.
-->

<span id="volume-specification-parameters" />
<span id="id" />
<span id="namespace-1" />
<span id="name" />
<span id="type" />
<span id="plugin_id" />
<span id="snapshot_id" />
<span id="clone_id" />
<span id="capacity_min" />
<span id="capacity_max" />
<span id="capability" />
<span id="access_mode" />
<span id="attachment_mode" />
<span id="mount_options" />
<span id="fs_type" />
<span id="mount_flags" />
<span id="topology_request" />
<span id="secrets" />
<span id="parameters" />
<span id="topology_request-parameters" />
<span id="segments" />
<span id="unused-fields" />

The volume specification is documented in the [Volume
Specification][volume_specification] page.

[csi]: https://github.com/container-storage-interface/spec
[csi_plugins_internals]: /docs/concepts/plugins/csi#csi-plugins
[registered]: /docs/commands/volume/register/
[volume_specification]: /docs/other-specifications/volume/
