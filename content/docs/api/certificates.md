---
title: "Certificates HTTP API"
linkTitle: "Certificates"
description: "The /certificates endpoints serve the trust bundle and the revocation list of the issuing CA of the region, revoke certificates and manage the CA."
---

The `/certificates` endpoints belong to the built-in issuer of
[certificates](/docs/features/certificates): the trust bundle and the
revocation list of the issuing CA of the region, the revocation of a
certificate, and the CA itself.

**Certificates and issuers themselves are objects**: they are written and
read through the [objects API](/docs/api/objects), with the kinds
`norca.io/Certificate` and `norca.io/CertificateIssuer`.

## Read the Trust Bundle

This endpoint returns the certificates a client has to trust for the
certificates of the built-in issuer, and the issuing CAs of the region
without their keys.

| Method | Path                     | Produces           |
| ------ | ------------------------ | ------------------ |
| `GET`  | `/v1/certificates/roots` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | `none`       |

### Sample Request

```shell-session
$ curl https://localhost:4646/v1/certificates/roots
```

### Sample Response

```json
{
  "ActiveID": "7b1d9e04-52c6-4f1a-9c3e-d0a8f6b2e415",
  "Authorities": [
    {
      "ID": "7b1d9e04-52c6-4f1a-9c3e-d0a8f6b2e415",
      "Region": "global",
      "Cert": "-----BEGIN CERTIFICATE-----\n...",
      "Chain": "",
      "Active": true,
      "Imported": false,
      "NotBefore": "2026-11-15T12:00:00Z",
      "NotAfter": "2031-11-14T12:01:00Z",
      "RotatedOutAt": "0001-01-01T00:00:00Z",
      "Revoked": [],
      "CreateIndex": 41,
      "ModifyIndex": 41
    }
  ],
  "Roots": "-----BEGIN CERTIFICATE-----\n..."
}
```

- `Roots` is the PEM bundle to trust: the issuing CA, or the root above an
  imported one, and the retired ones while their certificates can be valid.
  It is empty while the region has no issuing CA.
- `Chain` holds the certificates above an imported CA that is not
  self-signed, the root last.
- `Revoked` lists the revoked certificates of a CA that have not expired:
  `Serial`, `Certificate` (`<namespace>/<name>`), `RevokedAt`, `NotAfter`,
  and `Reason`, the name of the RFC 5280 CRLReason of the revocation
  (`keyCompromise`, `affiliationChanged`, `superseded` or
  `cessationOfOperation`), empty for none (unspecified).

## Read the Revocation List

This endpoint returns the revocation list of an issuing CA of the region
(RFC 5280), signed by the server that answers and valid for a day.

| Method | Path                   | Produces           |
| ------ | ---------------------- | ------------------ |
| `GET`  | `/v1/certificates/crl` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `none`       |

### Parameters

- `authority` `(string: "")` - The ID of the issuing CA: a retired one. The
  default is the active CA.

### Sample Response

```json
{
  "CRL": "-----BEGIN X509 CRL-----\n..."
}
```

An entry of the list carries the code of the reason of its revocation; one
without a reason (unspecified) has none.

`404` when the region has no such issuing CA.

## Revoke a Certificate

This endpoint revokes a certificate of a `Certificate` object: the current
one, and a new one is issued, or with `Serial` an
[earlier one](/docs/features/certificates#earlier-certificates) that is
still valid, and nothing is issued. Revoking a certificate that is revoked
already changes nothing, except that the `Reason` `keyCompromise` raises its
reason to `keyCompromise`: in the revocation list of the built-in issuer,
where the entry keeps its `RevokedAt`, or in a revocation order an external
issuer has not finished. **Without `Serial` the current certificate is the
one revoked:** once the new certificate is issued, which the built-in issuer
does right after a revocation, another call without `Serial` revokes the new
certificate. The reason of the one revoked before is then raised by its
`Serial`. See
[Revoking an earlier certificate](/docs/features/certificates#revoking-an-earlier-certificate).

| Method | Path                           | Produces           |
| ------ | ------------------------------ | ------------------ |
| `PUT`  | `/v1/certificate/:name/revoke` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `write` on objects of the kind `norca.io/Certificate` in the namespace |

### Parameters

- `:name` `(string: <required>)` - The name of the `Certificate` object.
- `namespace` `(string: "default")` - The namespace of the object, as a
  query parameter.
- `Reason` `(string: "")` - The reason of the revocation, in an optional JSON
  body: the name of an RFC 5280 CRLReason, `unspecified`, `keyCompromise`,
  `affiliationChanged`, `superseded` or `cessationOfOperation`. The
  revocation list of the built-in issuer carries its code, and an external
  issuer is given it. Without a body, or with `""` or `unspecified`, the
  revocation gives no reason.
- `Serial` `(string: "")` - The serial number of the certificate to revoke,
  in the same JSON body: in hexadecimal, as the status of the object shows
  it; upper case, colons between the octets, a leading `0x` and leading
  zeros are accepted. Without it, or with `""`, the current certificate is
  revoked. It names one of:
  - the current certificate (`serial` of the status): the call does what it
    does without `Serial`;
  - an earlier certificate of the object that is still valid, an entry of
    `earlier` of its status: that one is revoked, the current certificate
    and the secret stay as they are, and no new certificate is issued;
  - with the built-in issuer, a revoked certificate of the object that the
    status no longer lists but a revocation list of a CA of the region
    does: only its reason can change, to `keyCompromise`.

### Sample Payload

```json
{
  "Reason": "keyCompromise"
}
```

An earlier certificate, by its serial number:

```json
{
  "Serial": "1d8e03b6a2c94f57e0b1c6a47f3d9e25",
  "Reason": "superseded"
}
```

### Sample Request

```shell-session
$ curl -X PUT -H "X-Nomad-Token: $NORCA_TOKEN" \
    "https://localhost:4646/v1/certificate/web-tls/revoke?namespace=team-a"
```

With a reason:

```shell-session
$ curl -X PUT -H "X-Nomad-Token: $NORCA_TOKEN" \
    --data @payload.json \
    "https://localhost:4646/v1/certificate/web-tls/revoke?namespace=team-a"
```

### Sample Response

```json
{
  "Serial": "4f2a9c01d37be6a85c1f0b2e9d44a7c3",
  "Earlier": false
}
```

- `Serial` is the serial number the call was about, in lower case
  hexadecimal, as the status holds it.
- `Earlier` is `true` when that is not the current certificate of the
  object but an earlier one: the current certificate stays, and no new one
  is issued.

| Code | When |
| --- | --- |
| `200` | the serial number that was revoked, also when it was revoked before |
| `400` | the body can't be decoded, `Reason` is not one of the names above, or `Serial` is not a hexadecimal serial number; nothing is revoked |
| `404` | no such `Certificate` object; or `Serial` is not a certificate of the object that can be revoked: neither its current certificate nor an earlier one that is still valid. The message is the same whether nobody has the serial number or another object does |
| `409` | without `Serial`: the certificate has not been issued yet. With the `Serial` of an earlier certificate: no issuer is left to revoke it (its external issuer is gone or was recreated as a built-in one); the message says until when it stays valid |

## Import an Issuing CA

This endpoint puts a CA of the organisation in the place of the issuing CA
of the region.

| Method | Path                         | Produces           |
| ------ | ---------------------------- | ------------------ |
| `PUT`  | `/v1/certificates/ca/import` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` |

### Parameters

- `Cert` `(string: <required>)` - The PEM encoded CA certificate, followed
  by the certificates above it if it is not self-signed, the root last.
- `Key` `(string: <required>)` - The PEM encoded private key of the CA
  (PKCS #8, PKCS #1 or SEC 1).

### Sample Response

```json
{
  "Authority": {
    "ID": "0f6e1c52-8a3b-4d0e-b7a9-2c5d41e86f37",
    "Region": "global",
    "Cert": "-----BEGIN CERTIFICATE-----\n...",
    "Chain": "-----BEGIN CERTIFICATE-----\n...",
    "Active": true,
    "Imported": true,
    "NotBefore": "2026-01-10T00:00:00Z",
    "NotAfter": "2031-01-09T00:00:00Z"
  }
}
```

`400` when the certificate is not a CA certificate that is valid now, the
key is not its key, or the chain does not lead to a self-signed root.

## Rotate the Issuing CA

This endpoint replaces the issuing CA of the region with a new one of the
leader.

| Method | Path                         | Produces           |
| ------ | ---------------------------- | ------------------ |
| `PUT`  | `/v1/certificates/ca/rotate` | `application/json` |

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` |

The response is the one of the import, with the new CA.
