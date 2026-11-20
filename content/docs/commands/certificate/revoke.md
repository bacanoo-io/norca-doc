---
title: "Command: certificate revoke"
linkTitle: "revoke"
description: "The certificate revoke command revokes the current or an earlier certificate of a Certificate object."
weight: 3
---

The `certificate revoke` command revokes a certificate of a
[`Certificate`](/docs/features/certificates) object: the current one, or
with `-serial` an earlier one that is still valid. The built-in issuer
lists it in its revocation list; an external issuer is asked to revoke it.
A certificate the built-in issuer signed is always listed by the CA that
signed it, also when an issuer of the same name was recreated as an external
one.

- **Without `-serial` the current certificate is revoked. A new certificate
  with a new key is issued** and written to the secret.
- **With the serial number of an earlier certificate that one is revoked.**
  No new certificate is issued: the current certificate stays, and the
  secret is not touched.

**The built-in issuer revokes at once. An external issuer is asked to**,
and the command says so: it prints `Asked the issuer to revoke ...` instead
of `Revoked ...`. The certificate is revoked when the issuer has done it.

- **Until then** the status of the object shows `revoking` for the
  certificate, with the reason asked for: at the top of the status for the
  current certificate, in its entry of `earlier` for an earlier one.
- **Once it is done** the status shows `revoked` and `revokeReason` there,
  and the event `Revoked` says so.
- **A revocation the issuer fails**, or does not answer within 24 hours,
  ends with neither: `revoking` is removed, `revoked` is not set, and the
  warning event `RevocationFailed` on the object says why
  (`norca object events`). Nothing is tried again. Run the command again
  to place a new order; this works for the current certificate too.

Running the command again while the revocation is pending changes nothing
and prints the same `Asked the issuer to revoke ...` line; only
`-reason keyCompromise` changes the reason of the open order.

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

- `-serial=<serial>` - The serial number of the certificate to revoke, in
  hexadecimal, as the status of the object shows it. Upper case, colons
  between the octets, a leading `0x` and leading zeros are accepted.
  Without it the current certificate is revoked. The serial number is one
  of:

  - **the current certificate** (`serial` of the status): the command does
    what it does without `-serial`;
  - **an earlier certificate** of the object that is still valid: an entry
    of `earlier` in the
    [status](/docs/features/certificates#earlier-certificates), which
    `norca object get norca.io/Certificate <name>` shows;
  - with the built-in issuer, **a revoked certificate of the object that
    the status no longer lists** but the revocation list still does: only
    its reason can change, to `keyCompromise`.

  Anything else is refused, and nothing is revoked: a serial number that
  is not hexadecimal, and one that is not a certificate of this object,
  with the same message whether nobody has it or another object does.

Revoking a certificate that is revoked already changes nothing, with one
exception: `-reason keyCompromise` raises the reason of a certificate that
was revoked for another reason, or for none, to `keyCompromise`. The
revocation list of the built-in issuer then carries that code, with the
time of the revocation unchanged; an open revocation order of an external
issuer gets the reason. The same holds for an earlier certificate named
with `-serial`.

**Without `-serial` the command revokes the current certificate.** Once the
new certificate is issued, which the built-in issuer does right after a
revocation, running the command again without `-serial` revokes the new
certificate. The certificate revoked before is an earlier one then: its
reason is raised with its serial number,
`-serial <serial> -reason keyCompromise`.

**An earlier certificate that nobody is left to revoke is refused**: its
external issuer is gone or was recreated as a built-in one. The command
says so, and until when the certificate stays valid. The same holds for the
current certificate when the command is run again after a failed
revocation.

**A command run right after a failed revocation may be refused** with
`the last revocation order of the certificate with the serial <serial> is over, and the certificate is not revoked; ask again`:
the servers have not removed the failed order yet. Run it again.

**Revoke before deleting.** The earlier certificates are known from the
status of the object only. Once the `Certificate` object is deleted, its
certificates that are still valid can no longer be revoked. See
[Revoking](/docs/features/certificates#revoking).

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

Revoke an earlier certificate, with a serial number that the status of the
object lists in `earlier`:

```shell-session
$ norca certificate revoke -namespace team-a -serial 1d8e03b6a2c94f57e0b1c6a47f3d9e25 web-tls
Revoked the earlier certificate with the serial 1d8e03b6a2c94f57e0b1c6a47f3d9e25 of "web-tls"; the current certificate stays
```

With an external issuer the certificate is not revoked yet when the command
returns:

```shell-session
$ norca certificate revoke -namespace team-a -reason superseded web-tls
Asked the issuer to revoke the certificate with the serial 4f2a9c01d37be6a85c1f0b2e9d44a7c3 of "web-tls"; it is revoked when the issuer has done so: the status of the object says revoking until then, and revoked after; a new one is being issued

$ norca certificate revoke -namespace team-a -serial 1d8e03b6a2c94f57e0b1c6a47f3d9e25 web-tls
Asked the issuer to revoke the earlier certificate with the serial 1d8e03b6a2c94f57e0b1c6a47f3d9e25 of "web-tls"; it is revoked when the issuer has done so: the status of the object says revoking until then, and revoked after; the current certificate stays
```
