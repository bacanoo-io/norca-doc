---
title: "Docker driver"
linkTitle: "Docker driver"
description: "The findings of the review of the Docker driver: stop and kill, registry authentication, image references and bind mounts, with their verdicts, fixes, tests and commits."
weight: 1
---

The review covered the Docker task driver (`drivers/docker` in the norca
repository): the stop and recovery of tasks, registry authentication, image
reference counting, ports and bind mounts. It reported 12 findings. The fixes
are in commit `e70a54140` of the norca repository; the tests named below are
in `drivers/docker/whiteroom_test.go` unless another file is given. See the
[section page](/docs/white-room) for the process.

| ID | Finding | Verdict | Commit |
| --- | --- | --- | --- |
| 1.1 | A `kill_timeout` below one second becomes an immediate SIGKILL | Valid | `e70a54140` |
| 1.2 | Race after a custom kill signal: `DestroyTask` finds the container still running | Invalid | — |
| 1.3 | `RecoverTask` kills a running container when the logger cannot be restored | Won't fix (by design) | — |
| 1.4 | `DestroyTask` reports success when the container cannot be removed | Won't fix (by design) | — |
| 1.5 | Opening the log FIFO blocks without a reader | Invalid | — |
| 2.1 | `authIsEmpty` treats token-only credentials as empty | Partially valid | `e70a54140` |
| 2.2 | A credential helper without credentials aborts pulls of public images | Valid | `e70a54140` |
| 2.3 | Concurrent pulls of an image are shared between different credentials | Partially valid | `e70a54140` |
| 3.1 | A running container with the same name is adopted | Won't fix (by design) | — |
| 3.2 | The image reference leaks when a task fails to start | Valid | `e70a54140` |
| 3.3 | Every port is published on both TCP and UDP | Won't fix (by design) | — |
| 3.4 | The SELinux label makes an invalid bind (`ro:z`) | Valid | `e70a54140` |
| extra | The docker logger plugin process leaks when its launch fails | Valid (not in the report) | `e70a54140` |

## Stop and lifecycle

### 1.1 Sub-second `kill_timeout` becomes an immediate SIGKILL

**Report.** `Kill` passes `uint(killTimeout.Seconds())` to the Docker stop API.
A `kill_timeout` of `500ms` truncates to 0, and Docker treats a stop timeout of
0 as an immediate SIGKILL; `5.9s` truncates to 5.

**Verdict: valid.** The conversion truncates, and a timeout of 0 seconds makes
Docker send SIGKILL without waiting, so the task gets no time to shut down.

**Fix.** The timeout is converted by `stopTimeoutSeconds`, which rounds up
(`math.Ceil`): any positive timeout gives at least one second, `5.9s` gives 6.
File: `drivers/docker/handle.go`.

**Test.** `TestStopTimeoutSeconds`.

### 1.2 Race after a custom kill signal

**Report.** With a `kill_signal`, `Kill` sends the signal, waits for the kill
timeout and then calls `StopContainer(id, 0)` without waiting for the
container to exit, so a following `DestroyTask` could find it running and fail
with "must call StopTask ... before Destroy".

**Verdict: invalid.** The Docker stop API is synchronous: `StopContainer`
returns after the daemon has stopped the container (after the SIGKILL when the
timeout is 0). When `Kill` returns without an error, the container is no
longer running, so `DestroyTask` does not see it running. Nothing was changed.

### 1.3 `RecoverTask` stops a running container when the logger fails

**Report.** When the client restarts and neither the old docker logger can be
reattached nor a new one started, `RecoverTask` stops the container with
`StopContainer(id, 0)` and returns an error; the report calls this killing a
healthy production container.

**Verdict: won't fix (by design).** This is the recovery contract of the
client, inherited from Nomad: when `RecoverTask` fails, the task runner starts
the task again with `StartTask`, with a working logger. The allocation is not
lost. Keeping a container whose output is no longer collected, and that the
client does not track, would be worse than restarting it. Nothing was changed.

### 1.4 `DestroyTask` hides a failed container removal

**Report.** When `RemoveContainer` fails (for example "device or resource
busy"), `DestroyTask` only logs the error, returns success and forgets the
task, leaving the container and its disk space behind.

**Verdict: won't fix (by design).** This is the Nomad behaviour: the destroy
is best effort and a failed removal is logged as an error. The task runner
ignores the result of `DestroyTask` when it clears the task handle, so
returning an error would not cause another attempt; it would only keep a task
in the driver that the client has already dropped. A container left running
is removed by the dangling container reconciler (`gc.dangling_containers` in
the [plugin configuration](/docs/drivers/docker)); a stopped container that
could not be removed holds disk space until it is removed in Docker. Nothing
was changed.

### 1.5 Opening the log FIFO blocks

**Report.** `fifo.OpenWriter` opens the named pipe with `O_WRONLY` and without
`O_NONBLOCK`, which blocks until a reader opens it; if `logmon` is not running
the goroutine of `openStreams` blocks in the kernel, and `Stop` cannot end it.

**Verdict: invalid (intended behaviour).** The blocking open is deliberate,
and the code says so: it is done in a background goroutine, without holding
the logger's lock, so `Stop` is not blocked by it. The docker logger runs in
its own plugin process, which the driver kills when the task stops
(`shutdownLogger`), so a goroutine still blocked in `open` ends with the
process. Nothing was changed.

## Registry authentication

### 2.1 Token-only credentials treated as empty

**Report.** `authIsEmpty` checks only the user name, password, e-mail and
server address, so credentials made of an `IdentityToken` or `RegistryToken`
alone are considered empty and dropped, and pulls from ECR, GCP, Azure and
Docker Hub fail with 401. `authIsEmpty(nil)` also returns false.

**Verdict: partially valid.** The defect is real for credentials that carry
only a token: the Docker config backend copies the tokens into the
configuration and then drops it as empty. The impact is narrower than
claimed: the credential helper backend returns a user name and secret, which
is what the helpers of these registries provide, so they were not affected.
`authIsEmpty(nil)` returning false was wrong but harmless at the existing call
sites; it matters for the pull key of 2.3, which relies on it.

**Fix.** `authIsEmpty` returns true for nil and false when `IdentityToken` or
`RegistryToken` is set. File: `drivers/docker/utils.go`.

**Test.** `TestAuthIsEmpty`.

### 2.2 Credential helper failure aborts public pulls

**Report.** With a credential helper configured (for example
`docker.auth.helper = "ecr-login"`), pulling a public image such as
`docker.io/library/redis` runs the helper, which exits with status 1 because
it has no credentials for that registry; `firstValidAuth` returns the error
and, without `auth_soft_fail`, the pull fails.

**Verdict: valid.** The helper protocol reports a registry without credentials
with the message "credentials not found in native keychain" and exit status 1.
The driver treated it as any other helper failure. The Docker CLI treats it as
"no credentials" and pulls anonymously.

**Fix.** When the helper fails with exactly that message, the backend returns
no credentials and no error, so the pull continues anonymously, as with the
Docker CLI. Any other helper failure is still an error. File:
`drivers/docker/utils.go`.

**Test.** `TestDockerDriver_authFromHelper_NotFound` in
`drivers/docker/driver_linux_test.go`: a helper printing the message gives no
credentials and no error; a helper failing otherwise gives an error.

### 2.3 Concurrent pulls shared between different credentials

**Report.** The pull coordinator shares a pull between callers by image name
only. A caller with valid credentials waits on the pull of a caller with bad
ones and fails with it; and a caller without access gets a private image
through the pull of a caller with access.

**Verdict: partially valid.** The first case is real: one caller's missing or
wrong credentials fail another caller's pull. The second case does not grant
more than the node already does: once an image is in the local Docker image
store, any task on the node can run it without authenticating, whether it was
pulled by a shared pull or earlier by another task. A registry pull is not an
access boundary between tasks of one node. The fix removes both cases anyway,
because it follows from the first.

**Fix.** Pulls are shared under a pull key: the image name, plus a SHA-256
digest of the credentials when there are any (the credentials themselves are
not part of the key). Pull loggers and progress events use the same key. File:
`drivers/docker/coordinator.go`.

**Test.** `TestPullKey`: no credentials give the image name, different
credentials give different keys, the same credentials the same key, and the
key does not contain the password.

## Other findings

### 3.1 Adoption of a running container with the same name

**Report.** When container creation fails with "container already exists" and
the existing container is running, the driver adopts it; it could be a
leftover of another allocation, with old environment and secrets.

**Verdict: won't fix (by design).** Container names are
`<task name>-<allocation ID>` (see
[Container Name](/docs/drivers/docker#container-name)), so a container with
the same name belongs to the same task of the same allocation. The case this
handles is a create that succeeded in the daemon but whose response was lost
(for example a timeout); adopting it is the intended Nomad behaviour. A
stopped container with that name is removed and created again. Nothing was
changed.

### 3.2 Image reference leak on a failed start

**Report.** `StartTask` takes a reference on the image (`createImage`), but
returns without releasing it when building the container configuration,
starting or inspecting the container, or starting the logger fails, so the
image is never garbage collected.

**Verdict: valid.** Every error return after `createImage` left the reference
behind.

**Fix.** `StartTask` releases the image reference of the task
(`coordinator.RemoveImage`) on every return before the task is started. File:
`drivers/docker/driver.go`.

**Test.** None dedicated: the failure paths after the image is created need a
Docker daemon. The release goes through the same `RemoveImage` as
`DestroyTask`, which the coordinator tests cover.

### 3.3 TCP and UDP bindings for every port

**Report.** Every allocated port is published for both TCP and UDP, so a task
that needs only TCP fails to start when the UDP port is taken on the host.

**Verdict: won't fix (by design).** This is documented Docker driver
behaviour (see
[Networking Protocols](/docs/drivers/docker#networking-protocols)): the
scheduler allocates a port number regardless of protocol, so the port is
reserved for the task on both. Nothing was changed.

### 3.4 SELinux label after a bind mode

**Report.** The configured SELinux label is appended with a colon, so a
read-only volume becomes `/host:/container:ro:z`, which Docker rejects; the
options must be separated by a comma (`ro,z`).

**Verdict: valid.**

**Fix.** Binds are built by `bindWithLabel`, which joins the label to an
existing mode with a comma (`src:dst:ro,z`) and adds it as the mode when there
is none (`src:dst:z`). It is used for the allocation, local and secrets
directories and for the volumes of the task. File: `drivers/docker/driver.go`.

**Test.** `TestBindWithLabel`.

## Found during the checking

### Docker logger plugin leaked on a failed launch

This was not in the report. While the logger code of the findings above was
checked, `LaunchDockerLogger` was found to start the logger plugin process and return a nil client when
connecting to it (`client.Client`) or dispensing the plugin failed; callers
get only the nil client and cannot kill the process, so it was left running.

**Fix.** The launched process is killed on both error paths. File:
`drivers/docker/docklog/plugin.go`.

**Test.** None dedicated: the failure needs a plugin process that starts and
then fails the handshake.

The same commit also fixed a data race in the existing test
`TestDockerCoordinator_Cleanup_HonorsCtx` (`drivers/docker/coordinator_test.go`),
which read the mock image client while the removal goroutine wrote it; the
test now reads it under the mock's lock.
