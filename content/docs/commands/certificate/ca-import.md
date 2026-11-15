---
title: "Command: certificate ca import"
linkTitle: "ca import"
description: "The certificate ca import command brings a CA of the organisation in the place of the issuing CA of the region."
weight: 4
---

The `certificate ca import` command puts a CA certificate and its key in the
place of the issuing CA of the region
([certificates](/docs/features/certificates#the-built-in-issuer)).

- The certificates of the built-in issuer are **issued again** with it.
- The CA it replaces **stays in the trust bundle** until the certificates it
  signed have expired.
- **The leader never rotates an imported CA**: import its successor before it
  expires.

The key is sent to the servers, which keep it encrypted with the keyring.

## Usage

```plaintext
norca certificate ca import [options]
```

If ACLs are enabled, this command requires a management token.

## Options

- `-cert=<file>` - The PEM encoded CA certificate. If it is not self-signed
  (an intermediate CA), the certificates above it follow it in the file, the
  root last.
- `-key=<file>` - The PEM encoded private key of the CA (PKCS #8, PKCS #1 or
  SEC 1).

The servers refuse a certificate that is not a CA certificate, that has
expired or is not valid yet, a key that is not the key of the certificate,
and a chain that does not lead from the CA to a self-signed root.

## Examples

```shell-session
$ cat issuing-ca.pem root-ca.pem > chain.pem
$ norca certificate ca import -cert=chain.pem -key=issuing-ca-key.pem
Imported the issuing certificate authority
ID         = 0f6e1c52-8a3b-4d0e-b7a9-2c5d41e86f37
Region     = global
Origin     = imported
Not Before = 2026-01-10T00:00:00Z
Not After  = 2031-01-09T00:00:00Z
```

With an intermediate CA, the secrets of the certificates hold the
certificate followed by the intermediate, and the trust bundle is the root.
