---
title: "Security differences from Nomad v1.6.5"
linkTitle: "Differences from Nomad"
description: "Where Norca's access checks are stricter than those of Nomad v1.6.5: node secret IDs, snapshot save and restore, policies bound to jobs, exec into such jobs, links into the secrets directory, and the region of node requests."
weight: 1
---

Norca keeps the API and the ACL system of Nomad v1.6.5, but some of its access checks are stricter.
All but the last two matter only with ACLs enabled.

| Difference | What to do |
| --- | --- |
| [Node secret IDs are not ACL tokens](#node-secret-ids-are-not-acl-tokens) | Replace node secret IDs used as tokens by ACL tokens |
| [Snapshot save and restore stop after a denial](#snapshot-save-and-restore-stop-after-a-denial) | Use a management token |
| [Policies bound to a job match its exact ID](#policies-bound-to-a-job-match-its-exact-id) | Bind the policy to each job that needs it |
| [Changing a job with bound policies needs them](#changing-a-job-with-bound-policies-needs-them) | Give the token that changes the job the bound policies |
| [Exec into a job with bound policies needs them](#exec-into-a-job-with-bound-policies-needs-them) | Give the token that runs the exec the bound policies |
| [The file system API reads no secret through a link](#the-file-system-api-reads-no-secret-through-a-link) | Nothing, unless a tool lists the secrets directory |
| [The requests of a node stay in its region](#the-requests-of-a-node-stay-in-its-region) | Point each client at the servers of its own region |

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
`NORCA_TOKEN`) need an ACL token with a policy for what they do; tasks use their
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

## Policies bound to a job match its exact ID

In Nomad v1.6.5, the ACL policies bound to a job (`norca acl policy apply -job`, the `JobACL` of a
policy) are looked up by job ID prefix: the allocations of a job `ctr` or `c` in the namespace get
the policies bound to the job `ctrl` too.

In Norca a bound policy is granted only to the job with exactly that ID (and to the children of a
parameterized or periodic job with that ID).

**What to do:** a job that relied on getting the policies of another job through a shorter ID needs
its own binding. See [workload associated ACL policies](/docs/concepts/workload-identity#workload-associated-acl-policies).

## Changing a job with bound policies needs them

In Nomad v1.6.5, any token with `submit-job` in the namespace can register a new version of a job
with policies bound to it, and the new tasks run with those policies, so the token gets the rights of
policies it doesn't hold.

In Norca **a registration that creates or changes such a job needs a token that holds every bound
policy** (by name or through one of its roles), or a management token; otherwise it fails with `403`
and names the missing policies. This covers `norca job run`, the register API, `norca job revert`,
release install, upgrade and rollback, and a selective backup restore. Registering the job exactly
as it is needs none of the policies. See
[changing a job with associated policies](/docs/concepts/workload-identity#changing-a-job-with-associated-policies).

**What to do:** the tokens or roles of the teams and pipelines that deploy such a job must include
its bound policies, or the job is deployed with a management token.

## Exec into a job with bound policies needs them

In Nomad v1.6.5, `alloc-exec` (part of the namespace `write` policy) is enough to open a shell in an
allocation. The session sees the task's workload identity token (`NORCA_TOKEN`,
`secrets/norca_token`), so whoever may exec also gets the policies bound to the job.

In Norca **exec into an allocation of a job with bound policies needs a token that holds every bound
policy**, or a management token. The client asks a server and fails closed: when no server can be
reached, such an exec is refused. See
[exec into a job with associated policies](/docs/concepts/workload-identity#exec-into-a-job-with-associated-policies).

**What to do:** give the operators who exec into such jobs the bound policies, or use a management
token. `alloc-node-exec` into a `raw_exec` task is not isolated from the node; see the
[`raw_exec` driver](/docs/drivers/raw_exec).

## The file system API reads no secret through a link

In Nomad v1.6.5, the file system API of a client ([`norca alloc fs`](/docs/commands/alloc/fs), the
logs) refuses to read a file in the `secrets/` or `private/` directory of a task only by the path
asked for: a symbolic link elsewhere in the allocation directory that points into it is read through.
A task, or a sidecar that is compromised, can link the secrets of another task of the allocation into
the shared `alloc/` directory, and any token with `read-fs` or `read-logs` then reads them, the
workload identity token included. Listing the `secrets/` directory, and `stat` of a file in it, are
not refused at all.

In Norca **reading, listing and `stat` refuse a path that is or leads into the `secrets/` or
`private/` directory of a task**, also through links. On Linux the client checks the file it actually
opened as well, so a link the task swaps after the check leads neither into those directories nor out
of the allocation directory. This holds with or without ACLs.

**What to do:** nothing, unless a tool listed the `secrets/` directory through the API; it now gets
an error.

## The requests of a node stay in its region

In Nomad v1.6.5, the requests of a client node are forwarded to the region they name, like any other
request: a node with a certificate of one region can register itself in another region through a
server of its own, keep its status there and attract placements.

In Norca **the requests of a node** (registration, heartbeats, allocation pulls and updates, node
events, and the tokens, volume claims and certificates of its allocations) **are not forwarded to
another region**: a server refuses them when they name another region. With RPC TLS and
[`verify_server_hostname`](/docs/configuration/tls#verify_server_hostname), the connection must also
carry a client or server certificate of the server's region. This holds with or without ACLs.

**What to do:** each client's [`servers`](/docs/configuration/client#servers) must be servers of
its own [`region`](/docs/configuration#region). See [clients](/docs/concepts/architecture#clients).
