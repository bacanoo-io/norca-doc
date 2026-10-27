---
title: "Command: alloc exec"
linkTitle: "alloc exec"
description: "Runs a command in a container."
upstream:
  path: "website/content/docs/commands/alloc/exec.mdx"
---

**Alias: `norca exec`**

The `alloc exec` command runs a command in a running allocation.

## Usage

```plaintext
norca alloc exec [options] <allocation> <command> [<args>...]
```

The `norca alloc exec` command can be used to run commands inside a running task/allocation.

Use cases are for inspecting container state, debugging a failed application
without needing ssh access into the node that's running the allocation.

This command executes the command in the given task in the allocation. If the
allocation is only running a single task, the task name can be omitted.
Optionally, the `-job` option may be used in which case a random allocation from
the given job will be chosen.

When ACLs are enabled, this command requires a token with the `alloc-exec`,
`read-job`, and `list-jobs` capabilities for the allocation's namespace. If
the task driver does not have file system isolation (as with `raw_exec`),
this command requires the `alloc-node-exec`, `read-job`, and `list-jobs`
capabilities for the allocation's namespace.

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

## Exec Options

- `-task`: Sets the task to exec command in.

- `-job`: Use a random allocation from the specified job or job ID prefix,
  preferring a running allocation.

- `-i`: Pass stdin to the container, defaults to true. Pass `-i=false` to
  disable explicitly.

- `-t`: Allocate a pseudo-tty, defaults to true if stdin is detected to be a tty
  session. Pass `-t=false` to disable explicitly.

- `-e` <escape_char>: Sets the escape character for sessions with a pty
  (default: '~'). The escape character is only recognized at the beginning of a
  line. The escape character followed by a dot ('.') closes the connection.
  Setting the character to 'none' disables any escapes and makes the session
  fully transparent.

## Examples

To start an interactive debugging session in a particular alloc, invoke exec
command with your desired shell available inside the task:

```shell
$ norca alloc exec eb17e557 /bin/bash
root@eb17e557:/data# # now run any debugging commands inside container
root@eb17e557:/data# # ps -ef
```

To run a command and stream results without starting an interactive shell, you
can pass the command and its arguments to exec directly:

```shell
$ norca alloc exec eb17e557 cat /etc/resolv.conf
...
```

When passing command arguments to be evaluated in task, you may need to ensure
that your host shell doesn't interpolate values before invoking `exec` command.
For example, the following command would return the environment variable on
operator shell rather than task containers:

```shell
$ norca alloc exec eb17e557 echo $NOMAD_ALLOC_ID # wrong
...
```

Here, we must start a shell in task to interpolate `$NOMAD_ALLOC_ID`, and quote
command or use the [heredoc syntax][heredoc]

```shell
$ norca alloc exec eb17e557 /bin/sh -c 'echo $NOMAD_ALLOC_ID'
eb17e557-443e-4c51-c049-5bba7a9850bc

$ # by using heredoc and passing command in stdin
$ norca alloc exec eb17e557 /bin/sh <<'EOF'
> echo $NOMAD_ALLOC_ID
> EOF
eb17e557-443e-4c51-c049-5bba7a9850bc
```

This technique applies when aiming to run a shell pipeline without streaming
intermediate command output across the network:

```shell
$ norca alloc exec eb17e557 /bin/sh -c 'cat /output | sort | uniq -c | sort -rn | head -n 5'
...
```

## Using Job ID instead of Allocation ID

Setting the `-job` flag causes a random allocation of the specified job to be
selected.

```plaintext
norca alloc exec -job <job-id> <command> [<args>...]
```

Choosing a specific allocation is useful for debugging issues with a specific
instance of a service. For other operations using the `-job` flag may be more
convenient than looking up an allocation ID to use.

## Disabling remote execution

`alloc exec` is enabled by default to aid with debugging. Operators can disable
the feature by setting [`disable_remote_exec` client config
option][disable_remote_exec_flag] on all clients, or a subset of clients that
run sensitive workloads.

## Exec targeting a specific task

When trying to `alloc exec` for a job that has more than one task associated
with it, you may want to target a specific task.

```shell
# open a shell session in one of your allocation's tasks
$ norca alloc exec -i -t -task mytask a1827f93 /bin/bash
a1827f93$
```

[heredoc]: http://tldp.org/LDP/abs/html/here-docs.html
[disable_remote_exec_flag]: /docs/configuration/client#disable_remote_exec
