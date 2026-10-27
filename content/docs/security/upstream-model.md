---
title: "Reporting security vulnerabilities"
linkTitle: "Reporting vulnerabilities"
description: "How to report a security vulnerability in Norca responsibly."
upstream:
  path: "website/content/security.mdx"
---

Norca runs workloads, holds secrets and controls access to clusters, so its users place a high level of
trust in it. We apply security best practices and take reports of vulnerabilities seriously, and we
appreciate every effort to disclose them responsibly.

## Reporting a vulnerability

Please **do not open a public GitHub issue** for a security vulnerability. Report it privately through
GitHub's private vulnerability reporting of the Norca repository:
[github.com/bacanoo-io/norca/security](https://github.com/bacanoo-io/norca/security) ("Report a
vulnerability").
<!-- TODO: verify: private vulnerability reporting is enabled on github.com/bacanoo-io/norca, or replace with the project's security contact -->

Please include:

- the Norca version (`norca version`) and the platform,
- the affected component (agent, CLI, HTTP API, web UI, a pack of the
  [pack registry](https://github.com/bacanoo-io/norca-registry), ...),
- the steps to reproduce, and the impact you expect.

Issues of the pack registry can be reported the same way on
[github.com/bacanoo-io/norca-registry](https://github.com/bacanoo-io/norca-registry/security).

## Scope

Norca is built on the source code of Nomad v1.6.5 and imports third-party code, for example the core of
its secret store from uBixVault. A vulnerability in such code that affects Norca is in scope; we
coordinate with the upstream project where it applies. Problems that need access the
[security model](/docs/concepts/security#threat-model) does not protect against (for example root access
to a server, or reading a server's memory) are generally out of scope.

If you are not reporting a security-sensitive vulnerability, please open an issue in the
[Norca repository](https://github.com/bacanoo-io/norca/issues).
