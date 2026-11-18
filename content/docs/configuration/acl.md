---
title: "acl Block"
linkTitle: "acl"
description: "The \"acl\" block configures the Norca agent to enable ACLs and tune various parameters."
upstream:
  path: "website/content/docs/configuration/acl.mdx"
---

**Placement:** `acl`

The `acl` block configures the Norca agent to enable ACLs and tunes various
ACL parameters. Learn more about Norca's ACL system on the
[ACL concepts](/docs/concepts/acl) page.

```hcl
acl {
  enabled    = true
  token_ttl  = "30s"
  policy_ttl = "60s"
  role_ttl   = "60s"
}
```

## `acl` Parameters

- `enabled` `(bool: false)` - Specifies if ACL enforcement is enabled. All other
  ACL configuration options depend on this value. **All agents should have the
  same value for this parameter.** For example the Norca command line will
  send requests for client endpoints such as `alloc exec` directly to Norca
  clients whenever they are accessible. In this scenario, the client will
  enforce ACLs, so **both servers and clients should have ACLs enabled.**

- `token_ttl` `(string: "30s")` - Specifies the maximum time-to-live (TTL) for
  cached ACL tokens. This does not affect servers, since they do not cache tokens.
  Setting this value lower reduces how stale a token can be, but increases
  the request load against servers. If a client cannot reach a server, for example
  because of an outage, the TTL will be ignored and the cached value used.

- `policy_ttl` `(string: "30s")` - Specifies the maximum time-to-live (TTL) for
  cached ACL policies. This does not affect servers, since they do not cache policies.
  Setting this value lower reduces how stale a policy can be, but increases
  the request load against servers. If a client cannot reach a server, for example
  because of an outage, the TTL will be ignored and the cached value used.

- `role_ttl` `(string: "30s")` - Specifies the maximum time-to-live (TTL) for
  cached ACL roles. This does not affect servers, since they do not cache roles.
  Setting this value lower reduces how stale a role can be, but increases the
  request load against servers. If a client cannot reach a server, for example
  because of an outage, the TTL will be ignored and the cached value used.

- `replication_token` `(string: "")` - Specifies the Secret ID of the ACL token
  to use for replicating policies and tokens. This is used by servers in non-authoritative
  region to mirror the policies and tokens into the local region from [authoritative_region][authoritative-region].
  (Norca) The servers of the authoritative region use it as well, when the cluster has
  more than one region: the leader asks the other regions for the jobs of a namespace
  with it before it deletes the namespace of a deleted
  [tenant](/docs/features/tenants#limits). Set it there to the secret of a global
  management token. Without it the leader does not ask the other regions (its own
  credentials never leave the region), and the deletion fails.

- `token_min_expiration_ttl` `(string: "1m")` - Specifies the lowest acceptable
  TTL value for an ACL token when setting expiration. This is used by the Norca
  servers to validate ACL tokens and ACL authentication methods.

- `token_max_expiration_ttl` `(string: "24h")` - Specifies the highest acceptable
  TTL value for an ACL token when setting expiration. This is used by the Norca
  servers to validate ACL tokens and ACL authentication methods.

[authoritative-region]: /docs/configuration/server#authoritative_region
