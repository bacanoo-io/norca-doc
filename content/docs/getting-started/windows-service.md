---
title: "Installing Norca as a Windows service"
linkTitle: "Norca as a Windows Service"
description: "Discusses how to register and run Norca as a native Windows service."
upstream:
  path: "website/content/docs/install/windows-service.mdx"
---

Norca can be run as a native Windows service. In order to do this, you will need
to register the Norca application with the Windows Service Control Manager using
[`sc.exe`], configure Norca to log to a file, and then start the Norca service.

> [!WARNING]
> These steps should be run in a PowerShell session with Administrator
> capabilities.

## Register Norca with Windows

Download the `windows_amd64` release archive from the
[GitHub releases](https://github.com/bacanoo-io/norca/releases) of Norca (see
[installation](/docs/getting-started/install)) and extract `norca.exe`.

Use the [`sc.exe`] command to create a Service named "Norca". The binPath
argument should include the fully qualified path to the Norca executable and any
arguments to the `norca` command: agent, -config, etc.

```plaintext
sc.exe create "Norca" binPath="«full path to norca.exe» agent -config=«path to config file or directory»" start= auto
[SC] CreateService SUCCESS
```

If you receive a success message, your service is registered with the service
manager.

If you get an error, please verify the path to the binary and check the
arguments, by running the contents of `binPath` directly in a PowerShell session
and observing the results.

## Configure Norca to log to file

Because Windows services run non-interactively and Norca does not log to the
Windows Event Viewer, you will need to configure file-based logging in Norca.

To do this, set the [`log_file`][logging] argument in your Norca configuration
file or in the binPath argument of the [`sc.exe`] command used to register the
service.

## Start the Norca service

You have two ways to start the service.

- Go to the Windows Service Manager, and look for **Norca** in the service name
  column. Click the _Start_ button to start the service.

- Using the [`sc.exe`] command:

  ```plaintext
  sc.exe start "Norca"

  SERVICE_NAME: Norca
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 4  RUNNING
                                (STOPPABLE, NOT_PAUSABLE, ACCEPTS_SHUTDOWN)
        WIN32_EXIT_CODE    : 0  (0x0)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x0
        WAIT_HINT          : 0x0
        PID                : 8008
        FLAGS              :
  ```

The service automatically starts up during/after boot, so you don't need to
launch Norca from the command-line again.

[`sc.exe`]: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/sc-create
[logging]: /docs/configuration#log_file
