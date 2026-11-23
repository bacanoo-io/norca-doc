---
title: "rigger Block"
linkTitle: "rigger"
description: "The \"rigger\" block of the server bounds what a server writes into its Rigger cache of one fetched commit of a git repository: the size of its tree, the size of one file and the number of its files."
---

**Placement:** `server -> rigger`

The `rigger` block bounds what a server fetches for **Rigger**, the package manager. A server fetches
the git repositories that its users name: a [registry](/docs/api/rigger-registries) that is synced, and
the modules and stacks of an [install](/docs/api/rigger-install) or a
[stack](/docs/api/rigger-stacks). It writes the tree of the commit it reads into its Rigger cache
(`[data_dir]/server/rigger/cache`). A tree is small in a repository and may be large on the disk: a
file of zeros of many gigabytes packs into kilobytes, and a tree may name millions of files. The block
bounds **one fetched commit**.

```hcl
server {
  enabled = true

  rigger {
    fetch_tree_max_bytes = "1GiB"
    fetch_file_max_bytes = "128MiB"
    fetch_tree_max_files = 100000
  }
}
```

## `rigger` Parameters

- `fetch_tree_max_bytes` `(string: "1GiB")` - The most that the files of the tree of one fetched commit
  may have together.

- `fetch_file_max_bytes` `(string: "128MiB")` - The most that one file of the tree may have.

- `fetch_tree_max_files` `(int: 100000)` - The most files that the tree may have.

The two sizes are strings with a unit (`"512MiB"`, `"2GiB"`) or a plain number of bytes. A setting that
is left out or is `0` uses its default. A negative value, or a size that does not parse, is a
configuration error: the agent does not start, and `norca config validate` reports the same error.

## What happens at a limit

**A commit past a limit is not written into the cache.** The sync or the install that asked for it
fails with `the tree of the commit is past a limit of the fetcher` and the limit that was passed (for a
file, its name and size). A registry whose sync fails this way gets the phase `Error` with that message
and keeps what its last good sync found.

- **The defaults are tighter than those of the `rigger` program** (4 GiB a tree, 1 GiB a file,
  1,000,000 files). The program fetches what its own user names, into the cache of that user. A server
  fetches what other people name, into the data directory that also holds the state of the cluster,
  and runs several fetches at a time.
- **Each server has its own cache**, so set the block on every server.
- **A change needs a restart of the servers.** The servers read the block when they start; a reload
  (`SIGHUP`) does not apply it.
- **The limits are for git sources.** A layer of an OCI source has a fixed bound of 256 MiB. The mirror
  of a repository (its history) is not bounded by this block, only by the time limit of a sync.
- When several configuration files are merged, a later file sets the limits it names and keeps the
  others.
