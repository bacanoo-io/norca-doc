---
title: "Command: admission-policy"
linkTitle: "admission-policy"
description: "The admission-policy command is used to manage the CEL admission policies of a region."
---

The `admission-policy` command is used to manage
[admission policies](/docs/other-specifications/admission-policy): CEL rules that
every job submitted with `norca job run` or checked with `norca job plan` in a
matching namespace must satisfy. Policies that select the `variable` resource
also apply to Variables writes, and policies that select the `release` resource
to pack releases. See [dynamic admission control](/docs/features/admission-control).

## Usage

Usage: `norca admission-policy <subcommand> [options] [args]`

Run `norca admission-policy <subcommand> -h` for help on that subcommand. The
following subcommands are available:

- [`admission-policy apply`](/docs/commands/admission-policy/apply) - Create or update an admission policy
- [`admission-policy delete`](/docs/commands/admission-policy/delete) - Delete an admission policy
- [`admission-policy inspect`](/docs/commands/admission-policy/inspect) - Show an admission policy
- [`admission-policy list`](/docs/commands/admission-policy/list) - List admission policies
