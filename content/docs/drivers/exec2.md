---
title: "Exec2 Driver"
linkTitle: "Drivers: Exec2"
description: "The exec2 task driver runs processes without an image, isolated with Landlock, cgroups v2 and anonymous users."
adapted:
  name: "HashiCorp nomad-driver-exec2 v0.1.1"
  path: "README.md"
  copyright: "Copyright (c) HashiCorp, Inc."
---

Name: `exec2`

The `exec2` driver runs a command on the host without a container image, like
[`exec`](/docs/drivers/exec/) and [`raw_exec`](/docs/drivers/raw_exec/), with a
different isolation model: instead of a chroot it limits what the task may
reach on the host filesystem with the [Landlock LSM][landlock], runs the task
as an anonymous user that exists only for the task, and limits CPU, memory and
processes with cgroups v2. Tasks start fast and need no copy of the host
filesystem.

The driver is a fork of the HashiCorp `nomad-driver-exec2` plugin v0.1.1 (MPL
2.0), built into the Norca agent on Linux; it needs no plugin installation.

## Task Configuration

```hcl
task "webservice" {
  driver = "exec2"

  config {
    command = "python3"
    args    = ["-m", "http.server", "${NORCA_PORT_http}", "--directory", "${NORCA_TASK_DIR}"]
    unveil  = ["r:/etc/mime.types"]
  }
}
```

The `exec2` driver supports the following configuration in the job spec:

- `command` `(string: <required>)` - The command to run. The path of the
  command is not made reachable automatically: a binary outside the default
  paths (see [unveil](#filesystem-isolation-unveil)) must be unveiled with
  `unveil` or the plugin option `unveil_paths`. A command that cannot be found
  or run ends the task with exit code 127.

- `args` `(array<string>: [])` - Arguments of the command. References to
  environment variables and [interpolated Norca
  variables](/docs/runtime/interpolation/) are resolved before the task starts.

- `unveil` `(array<string>: [])` - More host paths the task may reach, as
  `<mode>:<path>` (see [unveil](#filesystem-isolation-unveil)). Allowed only if
  the plugin option `unveil_by_task` is `true`; otherwise the task does not
  start.

- `oom_score_adj` `(int: 0)` - The `oom_score_adj` of the task process: how
  likely the kernel picks it when the node runs out of memory (a higher value
  makes it more likely, see `proc(5)`).

- `pids_limit` `(int: 0)` - The most processes and threads the task may run
  (`pids.max`). It may only lower the plugin option `pids_limit`; a higher value
  fails the start. `0` uses the plugin option.

The task [`user`](/docs/job-specification/task#user) is optional: without it
the task runs as a [dynamic user](#dynamic-users).

## Examples

A batch job that prints its environment, as a dynamic user and with the
default paths only:

```hcl
job "env" {
  type = "batch"

  group "group" {
    task "task" {
      driver = "exec2"

      config {
        command = "env"
      }
    }
  }
}
```

A web server that serves a rendered page from its task directory. The task
needs read access to `/etc/mime.types`, which the plugin must allow with
`unveil_by_task = true`:

```hcl
job "http" {
  group "web" {
    network {
      port "http" {
        static = 8181
      }
    }

    task "python" {
      driver = "exec2"

      config {
        command = "python3"
        args    = ["-m", "http.server", "${NORCA_PORT_http}", "--directory", "${NORCA_TASK_DIR}"]
        unveil  = ["r:/etc/mime.types"]
      }

      template {
        destination = "local/index.html"
        data        = "<html><body><p>Hello</p></body></html>"
      }

      resources {
        cpu    = 200
        memory = 128
      }
    }
  }
}
```

A Java program from the allocation directory. The JVM reads its configuration
from `/etc/java-17-openjdk` on this host (the path differs between
distributions):

```hcl
job "java" {
  type = "batch"

  group "group" {
    task "main" {
      driver = "exec2"

      config {
        command = "/usr/bin/java"
        args    = ["-cp", "${NORCA_ALLOC_DIR}", "Test"]
        unveil  = ["r:/etc/java-17-openjdk"]
      }
    }
  }
}
```

## Capabilities

The `exec2` driver implements the following [capabilities](/docs/concepts/plugins/task-drivers#capabilities-capabilities-error).

| Feature              | Implementation    |
| -------------------- | ----------------- |
| `norca alloc signal` | true              |
| `norca alloc exec`   | false             |
| filesystem isolation | unveil            |
| network isolation    | none, host, group |
| volume mounting      | none              |
| dynamic users        | true              |

Because `norca alloc exec` is not supported, `script` checks cannot run in an
`exec2` task. Host volumes and CSI volumes cannot be mounted into the task; the
task can reach a host path that is unveiled for it. In `bridge` network mode the
task joins the network namespace of the allocation, so the
[network rules](/docs/features/network-rules) apply to it as to other tasks.

## Client Requirements

- Linux with cgroups v2 (the node attribute `unique.cgroup.version` is `v2`).
- The Landlock LSM enabled in the kernel (the node attribute
  `kernel.landlock` is set). The driver requires Landlock: if the kernel does
  not support it, the task fails at start.
- The `unshare` and `nsenter` commands (util-linux).
- The Norca client running as root.

Recent distributions, for example Ubuntu 22.04 and later or Fedora 36 and
later, meet these requirements. The driver checks the root user and the two
commands when it fingerprints the node; to place tasks only on nodes with
Landlock, use a constraint:

```hcl
constraint {
  attribute = "${attr.kernel.landlock}"
  operator  = "is_set"
}
```

## Plugin Options

```hcl
plugin "exec2" {
  config {
    unveil_defaults = true
    unveil_paths    = ["rx:/opt/bin", "r:/srv/certs"]
    unveil_by_task  = false
    pids_limit      = 4096
    allow_swap      = false
  }
}
```

- `unveil_defaults` `(bool: true)` - Unveil the default system paths and the
  task's own directories (see below). With `false`, a task reaches only the
  paths in `unveil_paths` and its `unveil` list.

- `unveil_paths` `(array<string>: [])` - Host paths every `exec2` task may
  reach, as `<mode>:<path>`.

- `unveil_by_task` `(bool: false)` - Whether jobs may unveil more paths with the
  task option `unveil`.

- `pids_limit` `(int: 0)` - The most processes and threads a task may run on
  this node (`pids.max`). A task may set a lower limit with its own
  `pids_limit`, not a higher one. `0` means no limit.

- `allow_swap` `(bool: false)` - Let tasks use swap. By default the driver sets
  `memory.swap.max` to `0`, as the Docker driver disables swap for its
  containers.

## Client Attributes

The `exec2` driver sets the following client attributes:

- `driver.exec2` - Set to `1` when the driver is available.
- `driver.exec2.unveil.defaults` - The value of the plugin option
  `unveil_defaults`.
- `driver.exec2.unveil.tasks` - The value of the plugin option
  `unveil_by_task`.

## Filesystem Isolation (unveil)

The task runs on the host filesystem, but Landlock limits which paths it may
reach. A path is given with the access it grants, modeled after the OpenBSD
`unveil` system call: a prefix of `r` (read), `w` (write), `x` (execute) and
`c` (create), then a colon and the path.

| Path                  | Access                                   |
| --------------------- | ---------------------------------------- |
| `r:/srv/www`          | read files under `/srv/www`              |
| `rwc:/var/cache/app`  | read, write and create under the path    |
| `rx:/opt/bin/app`     | read and execute one program             |
| `wc:/var/log/app`     | write and create files under the path    |

With `unveil_defaults = true` the task may reach:

- its task directory, the shared allocation directory, its secrets directory
  and the task's `tmp` directory (`NORCA_TASK_DIR`, `NORCA_ALLOC_DIR`,
  `NORCA_SECRETS_DIR`), with read, write, execute and create access;
- `/bin`, `/usr/bin` and `/usr/local/bin` for reading and executing;
- the groups of system paths that the [go-landlock] library defines: shared
  libraries and the dynamic linker configuration, standard I/O devices and
  `/tmp`, the DNS files (`/etc/hosts`, `/etc/resolv.conf` and others) and the
  system CA certificates. Paths that do not exist on the node are skipped.

Everything else on the host is out of reach, also for a task that runs as
root.

## Dynamic Users

A task without `user` runs as an anonymous user: the client hands out a user
ID from a range reserved for this purpose and uses it as both UID and GID. The
user is not in `/etc/passwd`; the task sees it as `USER=norca:<id>` and has no
home directory (`HOME=/nonexistent`). Two tasks never share the ID at the same
time, so a task cannot read the files of another task, and a user of the host
cannot reach the task's files.

The client keeps the ID while the task may still run, also across a restart of
the client, and frees it when the task will not run again. The files the client
writes for the task (secrets, the workload identity token, the mTLS
certificates and the task API socket) belong to this user.

The range is set in the client configuration with
[`dynamic_user_min` and `dynamic_user_max`](/docs/configuration/client/)
(default 80000 to 89999). Choose a range that no user or group of the node
uses.

A task with a `user` runs as that user, which must exist on the node, as with
the `exec` driver.

## Resource Isolation

The client creates a cgroup for every task; the driver starts the task process
directly in it and sets these limits:

| Resource      | cgroup file        | Value |
| ------------- | ------------------ | ----- |
| `cpu`         | `cpu.max`          | a hard limit: the task's MHz as a share of one core's speed, with a 100 ms period |
| `cores`       | `cpuset.cpus`      | the reserved cores (set by the client) |
| `memory`      | `memory.max`       | the memory of the task; with `memory_max`, `memory.low` (protected) |
| `memory_max`  | `memory.max`       | the upper limit, if [memory oversubscription](/docs/job-specification/resources#memory-oversubscription) is enabled |
| swap          | `memory.swap.max`  | `0` unless the plugin option `allow_swap` is `true` |
| processes     | `pids.max`         | `pids_limit` of the task or the plugin |
| out of memory | `memory.oom.group` | `1`: an out of memory kill stops the whole task |

Unlike the default of the Docker driver, the CPU limit is always hard: a task
cannot use more CPU than its `cpu` value even when the node is idle.

When the task stops, the driver sends the stop signal and, after the kill
timeout, kills every process of the task's cgroup.

[landlock]: https://docs.kernel.org/security/landlock.html
[go-landlock]: https://github.com/shoenig/go-landlock
