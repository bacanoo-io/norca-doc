---
title: "Command: certificate crl"
linkTitle: "crl"
description: "The certificate crl command prints the revocation list of the built-in certificate issuer."
weight: 2
---

The `certificate crl` command prints the revocation list of the issuing CA
of the region ([certificates](/docs/features/certificates#revoking)): a PEM
encoded list in the form of RFC 5280, signed when it is asked for and valid
for a day.

An entry carries the reason code of its revocation (RFC 5280, section
5.3.1): `keyCompromise` (1), `affiliationChanged` (3), `superseded` (4) or
`cessationOfOperation` (5), the reason a user gave to
[`norca certificate revoke`](/docs/commands/certificate/revoke) or the one
the servers give when a namespace
[loses a name](/docs/features/certificates#when-a-namespace-loses-a-name).
A revocation without a reason (`unspecified`) has no reason code.

## Usage

```plaintext
norca certificate crl [options]
```

## Options

- `-authority=<ID>` - The issuing CA whose list is printed: a retired one,
  by its ID as [`norca certificate roots -json`](/docs/commands/certificate/roots)
  shows it. The default is the active CA.

## Examples

```shell-session
$ norca certificate crl | openssl crl -noout -text
```
