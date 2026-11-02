---
title: "Command: pack deps vendor"
linkTitle: "pack deps vendor"
description: "The pack deps vendor command vendors the dependencies of a pack and writes pack.lock."
---

The `pack deps vendor` command downloads the dependencies of a pack (the pack in the current
directory, or `--path`) into its `deps/` directory. Dependencies with an `oci://` source are downloaded
from the OCI registry and verified with the trust policy of the client configuration. Afterwards
`pack.lock` records the content digests of the pack and of every vendored dependency; `render`,
`plan`, `run` and `push` verify the pack against it.

## Usage

```plaintext
norca pack deps vendor [options]
```

## Vendoring options

- `--path=<string>` `(default: the current directory)` - Full path of the pack whose dependencies are vendored into its `deps/` subdirectory.

- `--timeout=<int>` `(default: 30)` - Timeout in seconds for downloading the dependencies.

- `--update-lock` `(default: false)` - Accept dependencies whose content differs from the digest recorded in `pack.lock` for the same source and ref.

## Examples

```shell
norca pack deps vendor --path=./web
```
