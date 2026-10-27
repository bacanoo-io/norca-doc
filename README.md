<!--
SPDX-FileCopyrightText: 2026 Norca contributors
SPDX-License-Identifier: MPL-2.0
-->

# Norca documentation

The documentation website of [Norca](https://github.com/bacanoo-io/norca), an independent, open source
workload scheduler and orchestrator built on the MPL 2.0 source code of HashiCorp Nomad v1.6.5.
Norca is not a product of HashiCorp or IBM and is not affiliated with them.

The site is built with [Hugo](https://gohugo.io) (extended edition, Apache-2.0) and the
[Hextra](https://github.com/imfing/hextra) theme (MIT), pulled in as a Hugo module.

| Tool | Version |
| --- | --- |
| Hugo extended | v0.167.0 (minimum v0.146.0, required by Hextra) |
| Hextra | v0.13.0 (`go.mod`) |
| Go (for Hugo modules) | 1.22 or newer |

## Building

```shell
hugo mod get                 # downloads the Hextra module pinned in go.mod
hugo server                  # local preview on http://localhost:1313/norca-doc/
hugo --minify                # static site in public/
python3 scripts/check-links.py public   # broken internal links and forbidden HashiCorp links
```

The `baseURL` in [`hugo.yaml`](hugo.yaml) (`https://bacanoo-io.github.io/norca-doc/`) is the address of
local builds. The [Build workflow](.github/workflows/build.yml) builds the site and checks the links on
every push and pull request, and on a push to `main` deploys it to GitHub Pages with the address of the
Pages configuration (the repository's Pages source must be set to "GitHub Actions").

## Layout

| Path | Contents |
| --- | --- |
| `content/docs/introduction/` | What Norca is, compatibility, licence and trademarks |
| `content/docs/getting-started/` | Installation, development agent, the deployment examples |
| `content/docs/features/` | One section per Norca feature: what and why, examples, configuration, diagrams |
| `content/docs/concepts/`, `job-specification/`, `configuration/`, `commands/`, `api/`, ... | Reference, adapted from the Nomad v1.6.5 documentation and extended with the Norca additions |
| `content/docs/operations/` | Backups, seal and unseal, upgrades, monitoring, the pack registry |
| `content/docs/design/` | The design documents of the Norca features (moved from the Norca repository's `docs/`) |
| `layouts/` | Small overrides of the theme (attribution footer) |

Diagrams are written in Mermaid (fenced `mermaid` code blocks), which Hextra renders in the browser.

## Licence and attribution

The documentation is licensed under the [Mozilla Public License 2.0](LICENSE). Many reference pages are
adapted from the documentation text of HashiCorp Nomad v1.6.5 (MPL 2.0, Copyright (c) HashiCorp, Inc.).
Each such page names its upstream source file in the `upstream.path` front matter key, and the site shows
the notice at the bottom of the page. See [NOTICE](NOTICE).

Only the MPL 2.0 licensed Nomad v1.6.5 text may be used. Never copy anything from Nomad v1.6.6 or later,
Consul v1.16.5 or later (BSL 1.1), or from the current HashiCorp websites, and do not use HashiCorp logos,
branding or design. Names of the compatibility surface (Nomad API, `NOMAD_*` variables, `X-Nomad-Token`,
metric names) stay as they are.

## Contributing

Every commit needs a DCO sign-off (`git commit -s`). Check the build (`hugo --minify --panicOnWarning`)
and the links (`python3 scripts/check-links.py public`) before sending a change.
