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

- [`job allocs`][allocs] - List allocations for a job
- [`job deployments`][deployments] - List deployments for a job
- [`job dispatch`][dispatch] - Dispatch an instance of a parameterized job
- [`job eval`][eval] - Force an evaluation for a job
- [`job history`][history] - Display all tracked versions of a job
- [`job init`][init] - Create an example job file
- [`job inspect`][inspect] - Inspect a submitted job
- [`job periodic force`][periodic-force] - Force the launch of a periodic job
- [`job plan`][plan] - Dry-run a job update to determine its effects
- [`job promote`][promote] - Promote a job's canaries
- [`job restart`][restart] - Restart or reschedule allocations for a job
- [`job revert`][revert] - Revert to a prior version of the job
- [`job run`][run] - Run a new job or update an existing job
- [`job scale`][scale] - Change the count of a Norca job group
- [`job scaling-events`][scaling-events] - Display the most recent scaling events for a job
- [`job status`][status] - Display status information about a job
- [`job stop`][stop] - Stop a running job
- [`job validate`][validate] - Checks if a given job specification is valid

[allocs]: /docs/commands/job/allocs/ 'List allocations for a job'
[deployments]: /docs/commands/job/deployments/ 'List deployments for a job'
[dispatch]: /docs/commands/job/dispatch/ 'Dispatch an instance of a parameterized job'
[eval]: /docs/commands/job/eval/ 'Force an evaluation for a job'
[history]: /docs/commands/job/history/ 'Display all tracked versions of a job'
[init]: /docs/commands/job/init/ 'Create an example job file'
[inspect]: /docs/commands/job/inspect/ 'Inspect a submitted job'
[periodic-force]: /docs/commands/job/periodic-force/ 'Force the launch of a periodic job'
[plan]: /docs/commands/job/plan/ 'Dry-run a job update to determine its effects'
[promote]: /docs/commands/job/promote/ "Promote a job's canaries"
[restart]: /docs/commands/job/restart/ 'Restart or reschedule allocations for a job'
[revert]: /docs/commands/job/revert/ 'Revert to a prior version of the job'
[run]: /docs/commands/job/run/ 'Run a new job or update an existing job'
[scale]: /docs/commands/job/scale/ 'Change the count of a Norca job group'
[scaling-events]: /docs/commands/job/scaling-events/ 'Display the most recent scaling events for a job'
[status]: /docs/commands/job/status/ 'Display status information about a job'
[stop]: /docs/commands/job/stop/ 'Stop a running job'
[validate]: /docs/commands/job/validate/ 'Checks if a given job specification is valid'
