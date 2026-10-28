---
title: "Web UI"
weight: 60
description: "The new Norca web UI: an overview dashboard, a page for every Norca feature, live updates over the event stream, light and dark mode."
---

## What and why

The web UI of Nomad v1.6.5 is built on Ember.js 3.28, an unsupported major version, with Bulma and parts of
a vendor design system. It has no overview page (the root redirects to the jobs list), shows one region at
a time, updates through blocking queries, and its flat menu has no room for the features Norca adds.

Norca ships a new UI, served by every agent at `/ui/`. It is built on **Ember 6.12** (an LTS release) with
**[Tabler](https://tabler.io/)** (MIT) as the visual base, through Norca's own component layer, and
**Apache ECharts** for charts. The landing page is an overview **dashboard**, the menu is grouped by task,
and open views update live from the [event stream](/docs/features/event-stream). Every page meets the
WCAG 2.1 AA contrast requirements in light and in dark mode and can be operated by keyboard.

The previous UI stays available at **`/ui/legacy`** for one release.

## How it works

### Frame

- **Top bar:** the command palette (`Ctrl K`: navigation, search and actions, including switching the
  theme and opening the previous UI), the region selector with an **All regions** mode, the namespace
  selector, notifications from the event stream, the light/dark switch, and the token.
- **Left menu:** grouped, collapsible.
- **Page header:** title, the region and namespace in scope, and the page's main action.

### Pages

| Menu group | Pages |
| --- | --- |
| Overview | **Dashboard**: the federation strip (one column per region), health numbers, warnings with what to do, deployments in progress, the latest events |
| Workloads | Jobs (with allocations, deployments, versions, scaling, services, placement and events per job), Packages (pack releases, the catalog of the cluster pack registries with install and upgrade forms, the registries), Objects (custom objects of the operator framework), Deployments (including multiregion deployments) |
| Services and networking | Services (catalog with per-instance health), Intentions and rules (service intentions and network rules) |
| Capacity | Clients, Topology, Storage, Quotas, Scaling |
| Configuration | Variables, Secrets, Admission policies, Type definitions |
| Operations | Servers and regions, Evaluations, Backups |
| Access | Tokens, policies, roles |

Lists share filtering, column selection and a region column in All regions mode; objects, rules and
policies are edited in a unified HCL/JSON editor. Highlights per feature:

- **Secrets:** the secrets of a namespace with versions, metadata, the jobs that reference a path and recent
  audit records; values are read only on an explicit **Reveal** (an audited read), kept only in the page and
  dropped on Hide or navigation. The seal status of every server is shown here and in the dashboard's
  federation strip. Unsealing stays in the CLI. See [secret store](/docs/features/secrets).
- **Backups:** backup list, browsing, comparison, restore with an age identity, schedules. See
  [backup and restore](/docs/features/backup-restore).
- **Objects and type definitions:** object pages with lifecycle, webhook approval and limits. See the
  [operator framework](/docs/features/operator-framework).
- **Quotas, Admission policies, Scaling, Services, Intentions and rules:** see
  [quotas](/docs/features/quotas), [admission control](/docs/features/admission-control),
  [autoscaler](/docs/features/autoscaler), [service discovery](/docs/features/service-discovery),
  [network rules](/docs/features/network-rules).

### Live updates

The UI keeps one connection to the event stream (`/v1/event/stream`). The dashboard refreshes a region when
the stream reports a change there and falls back to polling while the stream is not connected.

### Building the UI into the binary

The UI is embedded into the `norca` binary when it is built with the `ui` Go build tag. `make` sets the tag
unless the `NOMAD_NO_UI` environment variable is set, and `make prerelease` builds both the new UI and the
previous UI before embedding them. A binary built without the tag serves no UI. At run time the UI is
controlled with the agent's [`ui`](/docs/configuration/ui) block.

## Example

```hcl {filename="norca.hcl"}
ui {
  enabled = true
}
```

Open `https://<agent address>:4646/ui/` and sign in with an ACL token. With ACLs enabled, the pages show
what the token's policies allow; see
[Configuring ACLs for the web UI](/docs/other-specifications/acl-policy#configuring-acls-for-the-web-ui).

The design mockup, with fictional data, shows the layout of the main pages:
[ui-mockup.html](/design/mockups/ui-mockup.html).

## Configuration reference

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `ui.enabled` | bool | `true` | Serve the UI. |

The other keys of the `ui` block (Consul and Vault links, a label, the content security policy) are
described in the [`ui` block reference](/docs/configuration/ui).

## CLI and API

| Command | Description |
| --- | --- |
| [`norca ui`](/docs/commands/ui) | Open the UI in a browser, optionally at a job, allocation or node |

The UI uses the public [HTTP API](/docs/api) only.

## Limits and status

- Available (UI phases 1–4): the frame, the dashboard, all pages listed above, light and dark mode, the
  previous UI at `/ui/legacy`.
- English only; there is no translation layer.
- The previous UI at `/ui/legacy` is removed in a later release.
- The Secrets page takes the last access from the `SecretAccess` event stream (there is no audit query
  endpoint), and finds the jobs that reference a path by reading the first 50 job specifications of the
  namespace.

## Design

[Web UI and Tabler migration – plan](/docs/design/ui-plan): information architecture, global frame, pages,
UX patterns, visual direction and the migration method.
