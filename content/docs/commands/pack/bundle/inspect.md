---
title: "Command: pack bundle inspect"
linkTitle: "pack bundle inspect"
description: "The pack bundle inspect command lists the packs of an offline bundle."
---

The `pack bundle inspect` command lists the packs of a bundle with their versions, digests and
signatures. A bundle whose index has a pack name or tag that breaks the
[naming rules](/docs/features/packages/supply-chain#oci-registries) is rejected.

## Usage

```plaintext
norca pack bundle inspect <bundle>
```

## Examples

```shell
norca pack bundle inspect packs.tar
```
