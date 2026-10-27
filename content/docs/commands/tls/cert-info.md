---
title: "Command: tls cert info"
linkTitle: "TLS Cert Info"
description: "This command displays relevant information that is contained within a certificate."
upstream:
  path: "website/content/docs/commands/tls/cert-info.mdx"
---

Info is used to display relevant information that is contained within a provided
certificate file.

## Usage

```plaintext
norca tls cert info <certificate file>
```

## Examples

Display default certificate info:

```shell
$ norca tls cert info global-cli-nomad.pem
Serial Number  307777061759235334129808343588809897525
Issuer CN      Nomad Agent CA 314623649437549144006237783956683542664
Common Name    CN=cli.global.nomad
Expiry Date    2023-11-14 21:40:45 +0000 UTC
DNS Names      [cli.global.nomad localhost]
IP Addresses   []
```
