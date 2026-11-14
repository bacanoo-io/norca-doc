---
title: "Command: operator root keyring remove"
linkTitle: "operator root keyring remove"
description: "Remove an unused encryption key"
upstream:
  path: "website/content/docs/commands/operator/root/keyring-remove.mdx"
---

The `operator root keyring remove` command removes an encryption key from the
cluster. **This operation may only be performed on keys that are not the active
key.**

> [!IMPORTANT]
> **A key that is still in use is not removed.** The command fails and says
> what the key is needed for:
>
> ```plaintext
> root key <key ID> encrypts 12 Variable(s) -
> rotate the keyring with -full first, or write or delete those Variables
>
> root key <key ID> encrypts 3 value(s) of the Consul KV of the system bus -
> rotate the keyring with -full first, or write or delete those keys
>
> root key <key ID> signed the workload identity of 2 allocation(s) that have
> not ended - their tokens would no longer be accepted; remove the key when
> they have stopped
>
> root key <key ID> encrypts the private key of 1 certificate authority(ies)
> of the native mTLS - the leader encrypts it with the active root key after
> a rotation; try again shortly
> ```
>
> **Why:** every Variable, and every value of the Consul KV kept on the
> [system bus](/docs/configuration/bus#security), is stored encrypted with
> the root key that was active when it was written, and the ID of the key is
> stored with it. Without the key it can never be decrypted again, by anyone.
> The same key signs the workload identity tokens of the tasks, which the
> servers check with it as long as the allocation lives, and encrypts the
> private key of the certificate authority of the native mTLS.
>
> **How:** before a key is removed, the leader counts in its state the
> Variables encrypted with it, the allocations it signed for that have not
> ended, and the certificate authorities whose key it encrypts. The bucket of the KV is not part of that state, so
> the leader reads the bucket and counts the values that carry the ID of the
> key. The garbage collection of old keys looks at both as well and keeps
> such a key.
>
> **What to do:**
> [`norca operator root keyring rotate -full`](/docs/commands/operator/root/keyring-rotate)
> encrypts the Variables and the values with the new key. It works in the
> background; when it has finished, the old key encrypts nothing and can be
> removed. Writing a Variable or a key again, or deleting it, has the same
> effect for that one. An allocation frees the key when it has stopped on
> the server and the client; the certificate authority moves to the active
> key by itself shortly after any rotation.
>
> The command also fails when the servers run a bus whose KV can't be read at
> the moment: the key is not removed on a guess. A region without a bus has
> the rest checked.

If ACLs are enabled, this command requires a management token.

## Usage

```plaintext
norca operator root keyring remove [options] <key ID>
```

## General Options

- `-address=<addr>`: The address of the Norca server. Overrides the `NORCA_ADDR`
  environment variable if set. Defaults to `http://127.0.0.1:4646`.

- `-region=<region>`: The region of the Norca server to forward commands to.
  Overrides the `NORCA_REGION` environment variable if set. Defaults to the
  Agent's local region.

- `-namespace=<namespace>`: The target namespace for queries and actions bound
  to a namespace. Overrides the `NORCA_NAMESPACE` environment variable if set.
  If set to `'*'`, subcommands which support this functionality query all
  namespaces authorized to user. Defaults to the "default" namespace.

- `-no-color`: Disables colored command output. Alternatively,
  `NORCA_CLI_NO_COLOR` may be set. This option takes precedence over
  `-force-color`.

- `-force-color`: Forces colored command output. This can be used in cases where
  the usual terminal detection fails. Alternatively, `NORCA_CLI_FORCE_COLOR`
  may be set. This option has no effect if `-no-color` is also used.

- `-ca-cert=<path>`: Path to a PEM encoded CA cert file to use to verify the
  Norca server SSL certificate. Overrides the `NORCA_CACERT` environment
  variable if set.

- `-ca-path=<path>`: Path to a directory of PEM encoded CA cert files to verify
  the Norca server SSL certificate. If both `-ca-cert` and `-ca-path` are
  specified, `-ca-cert` is used. Overrides the `NORCA_CAPATH` environment
  variable if set.

- `-client-cert=<path>`: Path to a PEM encoded client certificate for TLS
  authentication to the Norca server. Must also specify `-client-key`. Overrides
  the `NORCA_CLIENT_CERT` environment variable if set.

- `-client-key=<path>`: Path to an unencrypted PEM encoded private key matching
  the client certificate from `-client-cert`. Overrides the `NORCA_CLIENT_KEY`
  environment variable if set.

- `-tls-server-name=<value>`: The server name to use as the SNI host when connecting
  via TLS. Overrides the `NORCA_TLS_SERVER_NAME` environment variable if set.

- `-tls-skip-verify`: Do not verify TLS certificate. This is highly not
  recommended. Verification will also be skipped if `NORCA_SKIP_VERIFY` is set.

- `-token`: The SecretID of an ACL token to use to authenticate API requests with.
  Overrides the `NORCA_TOKEN` environment variable if set.


## Examples

```shell
$ norca operator root keyring remove 48596ce5-3ff5-8f77-2dcf-301682ada0ce
error: Unexpected response code: 500 (active root key cannot be deleted - call rotate first)

$ norca operator root keyring remove 33374156-9f81-b14c-83d4-a2f1f87dbf99
Removed encryption key 33374156-9f81-b14c-83d4-a2f1f87dbf99
```
