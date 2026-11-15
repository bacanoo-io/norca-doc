---
title: "Command: certificate ca rotate"
linkTitle: "ca rotate"
description: "The certificate ca rotate command replaces the issuing CA of the region with a new one of the leader."
weight: 5
---

The `certificate ca rotate` command replaces the issuing CA of the region
with a new one the leader creates
([certificates](/docs/features/certificates#the-built-in-issuer)). The
leader does the same by itself at two thirds of the life of a CA it created.

- The certificates of the built-in issuer are **issued again** with the new
  CA.
- The CA it replaces **stays in the trust bundle** until the certificates it
  signed have expired.
- **Clients have to take the new trust bundle**
  ([`norca certificate roots`](/docs/commands/certificate/roots)); the item
  `ca` of the secrets holds it already.

## Usage

```plaintext
norca certificate ca rotate [options]
```

If ACLs are enabled, this command requires a management token.

## Examples

```shell-session
$ norca certificate ca rotate
Rotated the issuing certificate authority
ID         = 7b1d9e04-52c6-4f1a-9c3e-d0a8f6b2e415
Region     = global
Origin     = created by the leader
Not Before = 2026-11-15T12:00:00Z
Not After  = 2031-11-14T12:01:00Z
```
