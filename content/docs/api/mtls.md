---
title: "mTLS HTTP API"
linkTitle: "mTLS"
description: "The /v1/mtls endpoints read the native mTLS trust bundle of a region and rotate its certificate authority."
---

The `/v1/mtls` endpoints (Norca) read the trust bundle of [native mTLS](/docs/features/native-mtls) and
rotate the certificate authority of a region. Workload certificates are not issued through the HTTP API:
clients request them over RPC for the tasks they run.

## Read Trust Bundle

This endpoint returns the trust bundle of the region: the CA certificates of the region (the active one
and retired ones that still have valid certificates) and, with `federation` enabled, those of the other
regions. The certificates are public, so the endpoint requires no ACL capability. The roots of the
region come first.

| Method | Path             | Produces           |
| ------ | ---------------- | ------------------ |
| `GET`  | `/v1/mtls/roots` | `application/json` |

The table below shows this endpoint's support for
[blocking queries](/docs/api#blocking-queries) and
[required ACLs](/docs/api#acls).

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `YES`            | `none`       |

### Parameters

- `region` `(string: "")` - The region whose trust bundle is returned. Defaults to the region of the
  agent.

### Sample Request

```shell
$ curl \
    https://localhost:4646/v1/mtls/roots
```

### Sample Response

```json
{
  "TrustDomain": "global.nomad",
  "ActiveRootID": "1f3c9a52-7a0e-5d1c-b7a2-2f6d0c1e9b44",
  "Roots": [
    {
      "ID": "1f3c9a52-7a0e-5d1c-b7a2-2f6d0c1e9b44",
      "Region": "global",
      "TrustDomain": "global.nomad",
      "RootCert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n",
      "Active": true,
      "NotBefore": "2026-10-20T08:12:40Z",
      "NotAfter": "2031-10-19T08:12:40Z",
      "RotatedOutAt": "0001-01-01T00:00:00Z",
      "CreateIndex": 18,
      "ModifyIndex": 18
    }
  ]
}
```

Write the CA certificates to a file, for example to let a browser or a tool trust workload certificates:

```shell
$ norca operator api /v1/mtls/roots | jq -r '.Roots[].RootCert' > norca-mtls-ca.pem
```

## Rotate CA

This endpoint replaces the active CA of the region with a new one. The previous CA loses its key and
stays in the trust bundle until `leaf_cert_ttl` plus one hour after the rotation; clients re-issue the
certificates it signed. The leader also rotates the CA by itself after two thirds of its lifetime and
when the trust domain changes.

| Method | Path                 | Produces           |
| ------ | -------------------- | ------------------ |
| `PUT`  | `/v1/mtls/ca/rotate` | `application/json` |

`POST` is accepted as well.

| Blocking Queries | ACL Required |
| ---------------- | ------------ |
| `NO`             | `management` |

### Sample Request

```shell
$ curl \
    --request PUT \
    --header "X-Nomad-Token: <management token>" \
    https://localhost:4646/v1/mtls/ca/rotate
```

### Sample Response

```json
{
  "RootID": "8b0d6e1f-3c4a-4f5e-9a7b-0c2d1e3f4a5b"
}
```
