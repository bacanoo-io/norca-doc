---
title: "Rigger Installs HTTP API"
linkTitle: "Rigger Installs"
description: "The servers install one module with Rigger: a module of a synced registry, fetched and verified by the servers, or a local module sent as files; and they answer what an install form needs of a version."
---

The servers can **evaluate and install a module themselves** with Rigger, the package manager: a module
of a [synced registry](/docs/api/rigger-registries), or a local module sent as files. The release is
applied through the [release API](/docs/api/releases) with the caller's token, so every check of a
release write holds (ACL, admission, the release lock). The Go client is `client.Rigger()` in
`github.com/bacanoo-io/norca/norca/api`.

## Install a module

| Method | Path | Produces |
| --- | --- | --- |
| `PUT` or `POST` | `/v1/rigger/install` | `application/json` |

| Blocking Queries | ACL Required |
| --- | --- |
| `NO` | object `write` on `packs.norca.io/Release` in the namespace; for a module of a registry also object `read` on `rigger.norca.io/Registry` |

The install runs on the leader. With the query parameter `plan=true` it returns what an apply would do
and applies nothing.

| Field | Meaning |
| --- | --- |
| `Release` | The name of the release. The namespace is the namespace of the request. |
| `Registry`, `Module`, `Version` | A module of a synced registry: `<namespace>/<name>` in the global registry, `<name>` in a registry repository; `Version` is a version constraint (`~> 1.2`), the newest when empty. |
| `Files` | A local module sent as files instead (base64 in JSON): the archive that `rigger` makes of a module directory (`Module.Archive` of the Go library). No registry then. |
| `Values` | The values of the variables, as a values file (HCL). |
| `Adopt` | Take over a release another manager applied. |

**A module of a registry** is taken from the **last good sync** of the registry: the newest version
that meets the constraint and that the sync found. A newer version is not offered until the next sync,
and a registry never synced offers nothing (409). The servers fetch the version and verify it:

- **The global registry:** the tree digest its entry lists, and a signature by a key of the namespace.
  A version without them is refused.
- **A registry repository:** the commit its tag had at the sync and the tree digest. **With
  `trustedKeys` on the registry, a signature by one of them is required.** Without keys an unsigned
  version installs, and the answer warns that it is unsigned.

Its release is admitted as **rendered by the servers** (`serverRendered` in the admission input).

**A local module** installs with nothing more than a release write: the `rigger` program can apply the
same module with the same token in its standalone mode. Its release records the source `local`, and it
is admitted as a client's (not rendered by the servers).

```shell-session
$ curl -X PUT -H "X-Nomad-Token: $TOKEN" "https://localhost:4646/v1/rigger/install?plan=true" \
    -d '{"Release": "web", "Registry": "acme", "Module": "web", "Version": "~> 1.0", "Values": "count = 2\n"}'
```

```json
{
  "Action": "install",
  "Module": {"name": "web", "source": "acme/web", "version": "1.0.0", "ref": "web/v1.0.0", "digest": "sha256:..."},
  "Changes": null,
  "Revision": 0,
  "Origin": {
    "source": "acme/web", "version": "1.0.0", "repository": "https://git.example.com/acme/rigger-modules",
    "ref": "web/v1.0.0", "commit": "fedcba98...", "digest": "sha256:...",
    "warnings": ["acme/web 1.0.0 is not signed: only its commit and tree digest are checked"]
  },
  "Warnings": ["acme/web 1.0.0 is not signed: only its commit and tree digest are checked"]
}
```

`Action` is `install`, `upgrade` or `unchanged`; after an apply `Revision` is the revision of the
release.

## Read a version of a module

| Method | Path | Produces |
| --- | --- | --- |
| `GET` | `/v1/rigger/registry/:name/module?name=<module>&version=<constraint>` | `application/json` |

| Blocking Queries | ACL Required |
| --- | --- |
| `NO` | object `read` on `rigger.norca.io/Registry` |

Returns what an install form needs of the newest version that meets the constraint: `Metadata` (name,
version, description, url, license, category, keywords, requirements), `Readme`, `Variables`, `Tabs`,
`FormSchema` (the JSON Schema of the form, with the `x-ui-*` hints the web UI reads), `Versions` (all
versions of the module at the last sync, the newest first), `Meets` and `Unmet` (whether the cluster meets
the requirements of the version), `Icon` (whether it has one) and `Origin`. The version is fetched and
verified as an install verifies it.

## Read the icon of a version

| Method | Path | Produces |
| --- | --- | --- |
| `GET` | `/v1/rigger/registry/:name/icon?name=<module>&version=<constraint>` | `image/png` |

| Blocking Queries | ACL Required |
| --- | --- |
| `NO` | object `read` on `rigger.norca.io/Registry` |

The icon of the version, a PNG of 64x64 pixels; 404 when it has none.
