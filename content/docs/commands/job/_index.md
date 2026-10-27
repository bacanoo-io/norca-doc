---
title: "Command: job"
linkTitle: "job"
description: "The job command is used to interact with jobs."
upstream:
  path: "website/content/docs/commands/job/index.mdx"
---

The `job` command is used to interact with jobs.

## Usage

Usage: `norca job <subcommand> [options]`

Run `norca job <subcommand> -h` for help on that subcommand. The following
subcommands are available:

- [`job deployments`][deployments] - List deployments for a job
- [`job dispatch`][dispatch] - Dispatch an instance of a parameterized job
- [`job eval`][eval] - Force an evaluation for a job
- [`job history`][history] - Display all tracked versions of a job
- [`job promote`][promote] - Promote a job's canaries
- [`job revert`][revert] - Revert to a prior version of the job
- [`job status`][status] - Display status information about a job

[deployments]: /docs/commands/job/deployments/ 'List deployments for a job'
[dispatch]: /docs/commands/job/dispatch/ 'Dispatch an instance of a parameterized job'
[eval]: /docs/commands/job/eval/ 'Force an evaluation for a job'
[history]: /docs/commands/job/history/ 'Display all tracked versions of a job'
[promote]: /docs/commands/job/promote/ "Promote a job's canaries"
[revert]: /docs/commands/job/revert/ 'Revert to a prior version of the job'
[status]: /docs/commands/job/status/ 'Display status information about a job'
