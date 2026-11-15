---
title: "Command: certificate"
linkTitle: "certificate"
description: "The certificate command groups the tools for the built-in certificate issuer."
---

The `certificate` command groups the subcommands for the
[certificates](/docs/features/certificates) the servers keep issued: the
trust bundle and the revocation list of the issuing CA of the region, the
revocation of a certificate, and the CA itself.

Certificates and issuers themselves are objects of the kinds
`norca.io/Certificate` and `norca.io/CertificateIssuer`: they are written
with [`norca object apply`](/docs/commands/object/apply) and read with
[`norca object get`](/docs/commands/object/get).

## Usage

Usage: `norca certificate <subcommand> [options]`

| Subcommand | Description |
| --- | --- |
| [`roots`](/docs/commands/certificate/roots) | Print the trust bundle of the built-in certificate issuer |
| [`crl`](/docs/commands/certificate/crl) | Print the revocation list of the built-in certificate issuer |
| [`revoke`](/docs/commands/certificate/revoke) | Revoke the current certificate of a Certificate object |
| [`ca import`](/docs/commands/certificate/ca-import) | Bring a CA of the organisation in the place of the issuing CA |
| [`ca rotate`](/docs/commands/certificate/ca-rotate) | Replace the issuing CA with a new one of the leader |
