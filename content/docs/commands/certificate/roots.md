---
title: "Command: certificate roots"
linkTitle: "roots"
description: "The certificate roots command prints the trust bundle of the built-in certificate issuer."
weight: 1
---

The `certificate roots` command prints the certificates a client has to
trust for the [certificates](/docs/features/certificates) of the built-in
issuer of the region: the issuing CA (or the root above an imported one)
and, until the certificates they signed have expired, the retired ones.

## Usage

```plaintext
norca certificate roots [options]
```

The bundle is public: no capability is needed beyond a request the servers
accept.

## Options

- `-json` - Output the issuing CAs of the region in JSON format, with their
  IDs, validity and revoked certificates. Keys are never part of it.

## Examples

```shell-session
$ norca certificate roots > norca-issuing-ca.pem
$ curl --cacert norca-issuing-ca.pem https://web.team-a.example.com/
```

The command fails while the region has no issuing CA: the leader creates it
with the first built-in `CertificateIssuer`.
