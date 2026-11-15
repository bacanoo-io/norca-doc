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
  `Serial`, `Certificate` (`<namespace>/<name>`), `RevokedAt`, `NotAfter`.

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

`404` when the region has no such issuing CA.

## Revoke a Certificate

This endpoint revokes the current certificate of a `Certificate` object; a
new one is issued.

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

### Sample Request

```shell-session
$ curl -X PUT -H "X-Nomad-Token: $NORCA_TOKEN" \
    "https://localhost:4646/v1/certificate/web-tls/revoke?namespace=team-a"
```

### Sample Response

```json
{
  "Serial": "4f2a9c01d37be6a85c1f0b2e9d44a7c3"
}
```

| Code | When |
| --- | --- |
| `200` | the serial number that was revoked |
| `404` | no such certificate |
| `409` | the certificate has not been issued yet |

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
