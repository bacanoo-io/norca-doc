---
title: Install Norca
linkTitle: Install
description: Build the norca binary from source or install a release archive or the container image.
weight: 1
---

## Build from source

Norca is built from the `nomad/` directory of the [Norca repository](https://github.com/bacanoo-io/norca)
(the Go module keeps its original path, `github.com/hashicorp/nomad`). You need Go 1.27 and, on Linux, a
C compiler (cgo).

```shell
git clone https://github.com/bacanoo-io/norca
cd norca/nomad
make dev                          # writes bin/norca and copies it to $GOBIN
# or: go build -tags ui -o norca .
sudo install bin/norca /usr/local/bin/norca
norca version                     # Norca v0.1.0 (Nomad API 1.6.5 compatible)
```

The `ui` build tag embeds the web UI (its assets are committed in
`nomad/command/agent/bindata_assetfs.go`). Without `-tags ui` the binary works the same but serves no
web UI.

The [NATS bridge](/docs/features/nats-bridge) is a separate binary, `norca-natsbridge`, built from
`nomad/natsbridge`:

```shell
go -C nomad/natsbridge build -o norca-natsbridge ./cmd/norca-natsbridge
```

## Release archives and container image

Tagged releases (`v<version>`, for example `v0.1.0`) are built by the release workflow of the
repository and published as a GitHub release with:

| Artifact | Contents |
| --- | --- |
| `norca_<version>_<os>_<arch>.tar.gz` / `.zip` | `norca` and `norca-natsbridge` for linux/amd64, linux/arm64, darwin/arm64 and windows/amd64, with `LICENSE`, `NOTICE` and `THIRD_PARTY_NOTICES.md` |
| Checksums and SBOMs | SHA-256 checksums and a CycloneDX SBOM per binary |
| Container image | `ghcr.io/<owner>/norca:<version>`, with the licence files in `/usr/share/doc/norca/` and OCI labels |

Each release links the exact source tag; the code is available under the MPL 2.0.

## The `nomad` compatibility alias

A copy of the binary or a symlink named `nomad` behaves exactly like `norca`. It is not installed by
default:

```shell
sudo ln -s /usr/local/bin/norca /usr/local/bin/nomad
```

## Run the agent as a service

On Linux, run the agent with systemd. This unit is the one of the
[single-node example](/docs/getting-started/examples/02-single-node):

```ini {filename="/etc/systemd/system/norca.service"}
[Unit]
Description=Norca agent
Wants=network-online.target
After=network-online.target docker.service

[Service]
ExecStart=/usr/local/bin/norca agent -config /etc/norca.d
ExecReload=/bin/kill -HUP $MAINPID
KillMode=process
KillSignal=SIGINT
Restart=on-failure
RestartSec=2
LimitNOFILE=65536
LimitNPROC=infinity
TasksMax=infinity
OOMScoreAdjust=-1000

[Install]
WantedBy=multi-user.target
```

The agent runs as root, which the client needs for bridge networking, [network rules](/docs/features/network-rules)
(nftables) and the exec driver. Check the configuration before starting it:

```shell
norca config validate /etc/norca.d/
sudo systemctl daemon-reload && sudo systemctl enable --now norca
```

`norca config validate` checks the syntax, the known keys and the values, including those of the Norca
blocks, as the agent checks them when it starts.

On Windows, see [Windows service](/docs/getting-started/windows-service).

## Shell completion

```shell
norca -autocomplete-install
```

## Next

[Run a development agent and a first job](/docs/getting-started/first-job).
