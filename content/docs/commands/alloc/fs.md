---
title: "Command: alloc fs"
linkTitle: "alloc fs"
description: "Introspect an allocation directory on a Norca client"
upstream:
  path: "website/content/docs/commands/alloc/fs.mdx"
---

**Alias: `norca fs`**

The `alloc fs` command allows a user to navigate an [allocation working
directory] on a Norca client. The following functionalities are available -
`cat`, `tail`, `ls` and `stat`.

- `cat`: If the target path is a file, Norca will `cat` the file.

- `tail`: If the target path is a file and `-tail` flag is specified, Norca will
  `tail` the file.

- `ls`: If the target path is a directory, Norca displays the name of a file and
  directories and their associated information.

- `stat`: If the `-stat` flag is used, Norca will display information about a
  file.

## Usage

```plaintext
norca alloc fs [options] <allocation> <path>
```

This command accepts a single allocation ID (unless the `-job` flag is
specified, in which case an allocation is chosen from the given job) and a
path. The path is optional and relative to the root of the [allocation working
directory].

When ACLs are enabled, this command requires a token with the `read-fs`,
`read-job`, and `list-jobs` capabilities for the allocation's namespace.

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

Each `NORCA_*` environment variable above is also accepted with its Nomad
name, for example `NOMAD_ADDR` for `NORCA_ADDR`. The `NORCA_*` variable takes
precedence when both are set.

## Fs Options

- `-H`: Machine friendly output.

- `-verbose`: Display verbose output.

- `-job`: Use a random allocation from the specified job or job ID prefix,
  preferring a running allocation.

- `-stat`: Show stat information instead of displaying the file, or listing the
  directory.

- `-f`: Causes the output to not stop when the end of the file is reached, but
  rather to wait for additional output.

- `-tail`: Show the files contents with offsets relative to the end of the file.
  If no offset is given, -n is defaulted to 10.

- `-n`: Sets the tail location in best-efforted number of lines relative to the
  end of the file.

- `-c`: Sets the tail location in number of bytes relative to the end of the file.

## Examples

```shell
$ norca alloc fs eb17e557
Mode        Size  Modified Time        Name
drwxrwxr-x  4096  28 Jan 16 05:39 UTC  alloc/
drwxrwxr-x  4096  28 Jan 16 05:39 UTC  redis/
-rw-rw-r--  0     28 Jan 16 05:39 UTC  redis_exit_status

$ norca alloc fs eb17e557 redis/local
Mode        Size  Modified Time        Name
-rw-rw-rw-  0     28 Jan 16 05:39 UTC  redis.stderr
-rw-rw-rw-  17    28 Jan 16 05:39 UTC  redis.stdout

$ norca alloc fs -stat eb17e557 redis/local/redis.stdout
Mode        Size  Modified Time        Name
-rw-rw-rw-  17    28 Jan 16 05:39 UTC  redis.stdout

$ norca alloc fs eb17e557 redis/local/redis.stdout
foobar
baz

$ norca alloc fs -tail -f -n 3 eb17e557 redis/local/redis.stdout
foobar
baz
bam
<blocking>
```

## Using Job ID instead of Allocation ID

Setting the `-job` flag causes a random allocation of the specified job to be
selected. Norca will prefer to select a running allocation ID for the job, but
if no running allocations for the job are found, Norca will use a dead
allocation.

```plaintext
norca alloc fs -job <job-id> <path>
```

This can be useful for debugging a job that has multiple allocations, and it is
not required to observe a specific allocation.

[allocation working directory]: /docs/runtime/environment#task-directories 'Task Directories'
