---
title: "Command: certificate revoke"
linkTitle: "revoke"
description: "The certificate revoke command revokes the current certificate of a Certificate object."
weight: 3
---

The `certificate revoke` command revokes the current certificate of a
[`Certificate`](/docs/features/certificates) object. The built-in issuer
lists it in its revocation list; an external issuer is asked to revoke it.
A certificate the built-in issuer signed is always listed by the CA that
signed it, also when an issuer of the same name was recreated as an external
one. **A new certificate with a new key is issued** and written to the secret.

## Usage

```plaintext
norca certificate revoke [options] <name>
```

The certificate is looked up in the namespace of the command (`-namespace`).

If ACLs are enabled, the token needs the `write` capability for objects of
the kind `norca.io/Certificate` in the namespace.

## Options

- `-reason=<reason>` - The reason of the revocation, the name of an RFC 5280
  CRLReason: `unspecified`, `keyCompromise`, `affiliationChanged`,
  `superseded` or `cessationOfOperation`. The revocation list of the
  built-in issuer carries its code, and an external issuer is given it. Any
  other reason is refused, and nothing is revoked. Without it, or with
  `unspecified`, the revocation gives no reason.

A certificate keeps the reason of its first revocation: revoking a
certificate that is revoked already changes nothing.

## Examples

```shell-session
$ norca certificate revoke -namespace team-a web-tls
Revoked the certificate with the serial 4f2a9c01d37be6a85c1f0b2e9d44a7c3 of "web-tls"; a new one is being issued
```

Revoke it because its key was exposed:

```shell-session
$ norca certificate revoke -namespace team-a -reason keyCompromise web-tls
Revoked the certificate with the serial 4f2a9c01d37be6a85c1f0b2e9d44a7c3 of "web-tls"; a new one is being issued
```
