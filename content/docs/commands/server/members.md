---
title: "Command: server members"
linkTitle: "server members"
description: "The server members command is used to display a list of the known server members and their status."
upstream:
  path: "website/content/docs/commands/server/members.mdx"
---

The `server members` command displays a list of the known servers in the cluster
and their current status. Member information is provided by the gossip protocol,
which is only run on server nodes.

## Usage

```plaintext
norca server members [options]
```

If ACLs are enabled, this option requires a token with the `node:read`
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

Each `NORCA_*` environment variable above is also accepted with its Nomad
name, for example `NOMAD_ADDR` for `NORCA_ADDR`. The `NORCA_*` variable takes
precedence when both are set.

## Server Members Options

- `-detailed` (<code>_deprecated_</code> use `-verbose` instead): Dump the
  basic member information as well as the raw set of tags for each member. This
  mode reveals additional information not displayed in the standard output
  format.

- `-verbose`: Dump the basic member information as well as the raw set of tags
  for each member. This mode reveals additional information not displayed in
  the standard output format.

- `-json`: Output the server memebers in its JSON format.

- `-t`: Format and display the server memebers using a Go template.

## Examples

Default view:

```shell
$ norca server members
Name             Address    Port  Status  Leader  Raft Version  Build  Datacenter  Region
server-1.global  10.0.0.8   4648  alive   true    3             1.3.0  dc1         global
server-2.global  10.0.0.9   4648  alive   false   3             1.3.0  dc1         global
server-3.global  10.0.0.10  4648  alive   false   3             1.3.0  dc1         global
```

Verbose view:

```shell
$ norca server members -verbose
Name             Address    Port  Status  Leader  Protocol  Raft Version  Build  Datacenter  Region  Tags
server-1.global  10.0.0.8   4648  alive   true    2         3             1.3.0  dc1         global  id=46122039-7c4d-4647-673a-81786bce2c23,rpc_addr=10.0.0.8,role=nomad,region=global,raft_vsn=3,expect=3,dc=dc1,build=1.3.0,port=4647
server-2.global  10.0.0.9   4648  alive   false   2         3             1.3.0  dc1         global  id=04594bee-fec9-4cec-f308-eebe82025ae7,dc=dc1,expect=3,rpc_addr=10.0.0.9,raft_vsn=3,port=4647,role=nomad,region=global,build=1.3.0
server-3.global  10.0.0.10  4648  alive   false   2         3             1.3.0  dc1         global  region=global,dc=dc1,rpc_addr=10.0.0.10,raft_vsn=3,build=1.3.0,expect=3,id=59542f6c-fb0e-50f1-4c9f-98bb593e9fe8,role=nomad,port=4647
```

The `-json` flag can be used to get the latest server members information in json format:

```shell
$ norca server members -json
[
    {
        "Addr": "127.0.0.1",
        "DelegateCur": 4,
        "DelegateMax": 5,
        "DelegateMin": 2,
        "Name": "bacon-mac.global",
        "Port": 4648,
        "ProtocolCur": 2,
        "ProtocolMax": 5,
        "ProtocolMin": 1,
        "Status": "alive",
        "Tags": {
            "build": "1.5.0",
            "region": "global",
            "rpc_addr": "127.0.0.1",
            "role": "nomad",
            "raft_vsn": "3",
            "bootstrap": "1",
            "expect": "1",
            "dc": "dc1",
            "port": "4647",
            "revision": "fc40c491cacec3d8ec3f2f98cd82b9068a50797c",
            "vsn": "1",
            "id": "354fd9a8-4228-ca8e-8b93-3cf002514910"
        }
    }
]
  ```

Or use the `-t` flag to format and display the server members information using a Go template:

```shell
$ norca server members -t '{{range .}}{{printf "%s: %s" .Name .Status }}{{end}}'
bacon-mac.global: alive
```
