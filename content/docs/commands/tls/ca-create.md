---
title: "Command: tls ca create"
linkTitle: "tls ca create"
description: "This command creates a Certificate Authority that can be used to create self signed certificates to be used for Norca TLS setup."
upstream:
  path: "website/content/docs/commands/tls/ca-create.mdx"
---

Create is used to create a self signed Certificate Authority to be used for
Norca TLS setup.

## Usage

```plaintext
norca tls ca create [options]
```

## CA Create Options

- `-additional-domain=<value>`: Add additional DNS zones to the allowed list for
  the CA. The server will reject certificates for DNS names other than those
  specified in `-domain` and `-additional-domain`. Can be used multiple times.
  This option can only be used in combination with `-domain` and
  `-name-constraint`.

- `-common-name`: Common Name of CA. Defaults to "Norca Agent CA".

- `-country`: Country of the CA. Not set by default. Required when customizing
  the CA.

- `-days=<int>`: Provide number of days the CA is valid for from now on,
  defaults to 5 years (1825 days).

- `-domain=<string>`: Domain of the Norca cluster. Only used in combination with
  `-name-constraint`. Defaults to `nomad`.

- `-locality`: Locality of the CA. Not set by default.

- `-name-constraint`: Enables the DNS name restriction functionality to the CA.
  Results in the CA rejecting certificates for any other DNS zone. If enabled,
  `localhost` and the value of `-domain` will be added to the allowed DNS zones
  field. Defaults to false.

> [!WARNING]
> If `-name-constraint` is enabled and you intend to serve the Norca web UI
> over HTTPS, its DNS name must be added with `-additional-domain`. It is not
> possible to add that after the fact.

- `-organization`: Organization of the CA. Defaults to "Norca".

- `-organizational-unit`: Organizational Unit of the CA. Defaults to "Norca".

- `-postal-code`: Postal Code of the CA. Not set by default.

- `-province`: Province of the CA. Not set by default.

- `-street-address`: Street Address of the CA. Not set by default.

## Example

Create CA:

```shell
$ norca tls ca create
==> CA Certificate saved to: nomad-agent-ca.pem
==> CA Certificate key saved to: nomad-agent-ca-key.pem
```

Create a CA with a specified domain:

```shell
$ norca tls ca create -name-constraint="true" -domain="foo.com"
==> CA Certificate saved to: foo.com-agent-ca.pem
==> CA Certificate key saved to: foo.com-agent-ca-key.pem
```
