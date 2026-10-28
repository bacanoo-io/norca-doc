---
title: "Security differences from Nomad v1.6.5"
linkTitle: "Differences from Nomad"
description: "Where Norca's access checks are stricter than those of Nomad v1.6.5: node secret IDs are not ACL tokens, and snapshot save and restore stop after a denial."
weight: 1
---

Norca keeps the API and the ACL system of Nomad v1.6.5, but two of its access checks are stricter.
Both matter only with ACLs enabled. Scripts and tools written for a Nomad v1.6.5 cluster may need a
different token when they run against Norca.

| Difference | What to do |
| --- | --- |
| [Node secret IDs are not ACL tokens](#node-secret-ids-are-not-acl-tokens) | Replace node secret IDs used as tokens by ACL tokens |
| [Snapshot save and restore stop after a denial](#snapshot-save-and-restore-stop-after-a-denial) | Use a management token |

## Node secret IDs are not ACL tokens

In Nomad v1.6.5, a request authenticated with the secret ID of a client node, rather than an ACL token
or a workload identity, passes the permission checks of most endpoints as if ACLs were disabled. It
works like a management token on Variables, jobs, nodes, the keyring and the operator endpoints, among
others, and a client node can drain any node and remove any service registration.

Norca accepts a node secret ID only on the requests clients make for their own work, and denies it
with `403 Permission denied` everywhere else, including the Norca endpoints (the secret store, the
seal, backups). A client can drain only its own node (`drain_on_shutdown`) and remove only the service
registrations of its own node. Variables are listed, read and written only with ACL tokens and
workload identities. Requests without a token are still evaluated with the anonymous policy. See
[client node identity](/docs/concepts/acl#client-node-identity).

**What to do:** scripts, tools and integrations that send a node secret ID as `X-Nomad-Token` (or
`NORCA_TOKEN`/`NOMAD_TOKEN`) need an ACL token with a policy for what they do; tasks use their
[workload identity](/docs/concepts/workload-identity). The clients' own use of their secret ID
(registration, allocation updates, service registrations, intentions, mTLS certificates, the catalog
of the built-in DNS server, drain on shutdown) works as before.

## Snapshot save and restore stop after a denial

In Nomad v1.6.5, `GET` and `PUT` on [`/v1/operator/snapshot`](/docs/api/operator/snapshot) answer
`403` when the token fails authentication, but the server goes on and streams the snapshot out or
restores it.

In Norca the request ends with the `403`, and a denied identity (such as a node secret ID) is reported
as `403` too.

**What to do:** nothing beyond the documented requirement: `norca operator snapshot save` and
`restore` need a management token.
