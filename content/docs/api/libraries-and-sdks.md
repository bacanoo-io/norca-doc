---
title: "Client Libraries & SDKs"
linkTitle: "Libraries and SDKs"
description: "Client libraries for the Norca HTTP API: the Go API package of Norca and libraries written for the Nomad HTTP API."
upstream:
  path: "website/content/api-docs/libraries-and-sdks.mdx"
---

The programming libraries listed on this page can be used to consume the API
more conveniently. Norca keeps the Nomad HTTP API (Nomad API 1.6.5
compatible), so client libraries written for the Nomad API can be used with
Norca for the endpoints that Nomad v1.6.5 has. The Norca additions to the API
are available only through the Go package of Norca.

## Norca Library

- `api` - The Go client for the Norca HTTP API, in the
  [`nomad/api`](https://github.com/bacanoo-io/norca/tree/main/nomad/api) directory of the Norca repository. Its Go
  module path is `github.com/hashicorp/nomad/api`.

## Third-Party Libraries for the Nomad API

These libraries are not maintained by the Norca project.

- [`python-nomad`](https://github.com/jrxfive/python-nomad) - Python client
  for the Nomad HTTP API.

- [`nomad-java-sdk`](https://github.com/hashicorp/nomad-java-sdk) - Java
  client for the Nomad HTTP API.

- [`nomad-scala-sdk`](https://github.com/hashicorp/nomad-scala-sdk) - Scala
  client for the Nomad HTTP API.

- [`nomad-ruby`](https://github.com/hashicorp/nomad-ruby) - Ruby client
  for the Nomad HTTP API.

- [`nomad-client`](https://github.com/barakb/nomad-client) - A non-blocking Kotlin client for the Nomad HTTP API.

- [`hostel`](https://github.com/LKNSI/hostel) - Client for the Nomad HTTP API for NodeJS. Includes property checking, and an Object-based API.

_Want to see your library here? Open a pull request in the [documentation repository](https://github.com/bacanoo-io/norca-doc)._
