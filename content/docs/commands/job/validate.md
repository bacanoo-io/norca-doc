---
title: "Command: job validate"
linkTitle: "job validate"
description: "The job validate command is used to check a job specification for syntax errors and validation problems."
upstream:
  path: "website/content/docs/commands/job/validate.mdx"
---

**Alias: `norca validate`**

The `job validate` command is used to check an HCL [job specification] for any
syntax errors or validation problems.

## Usage

```plaintext
norca job validate <file>
```

The `job validate` command requires a single argument, specifying the path to a
file containing an HCL [job specification]. This file will be read and the job
checked for any problems. If the supplied path is "-", the job file is read from
STDIN. Otherwise it is read from the file at the supplied path or downloaded and
read from URL specified. Norca downloads the job file using [`go-getter`] and
supports `go-getter` syntax.

On successful validation, exit code 0 will be returned, otherwise an exit code
of 1 indicates an error.

The run command will set the `vault_token` of the job based on the following
precedence, going from highest to lowest: the `-vault-token` flag, the
`$VAULT_TOKEN` environment variable and finally the value in the job file.

When ACLs are enabled, this command requires a token with the `read-job`
capability for the job's namespace.

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

## Validate Options

- `-json`: Parses the job file as JSON. If the outer object has a Job field,
  such as from "norca job inspect" or "norca run -output", the value of the
  field is used as the job.

- `-hcl1`: If set, HCL1 parser is used for parsing the job spec. Takes
  precedence over `-hcl2-strict`.

- `-hcl2-strict`: Whether an error should be produced from the HCL2 parser where
  a variable has been supplied which is not defined within the root variables.
  Defaults to true, but ignored if `-hcl1` is defined.

- `-vault-token`: Used to validate if the user submitting the job has
  permission to run the job according to its Vault policies. A Vault token must
  be supplied if the [`vault` block `allow_unauthenticated`] is disabled in
  the Norca server configuration. If the `-vault-token` flag is set, the passed
  Vault token is added to the jobspec before sending to the Norca servers. This
  allows passing the Vault token without storing it in the job file. This
  overrides the token found in the `$VAULT_TOKEN` environment variable and the
  [`vault_token`] field in the job file. This token is cleared from the job
  after validating and cannot be used within the job executing environment. Use
  the `vault` block when templating in a job with a Vault token.

- `-vault-namespace`: If set, the passed Vault namespace is stored in the job
  before sending to the Norca servers.

- `-var=<key=value>`: Variable for template, can be used multiple times.

- `-var-file=<path>`: Path to HCL2 file containing user variables.

## Examples

Validate a JSON job with invalid syntax:

```shell
$ norca job validate -json example.json
Job validation errors:
1 error occurred:
        * Missing job datacenters
```

Validate a job that has a configuration that causes warnings:

```shell
$ norca job validate example.nomad.hcl
Job Warnings:
1 warning(s):

* Group "cache" has warnings: 1 error(s) occurred:

* Update max parallel count is greater than task group count (6 > 3). A destructive change would result in the simultaneous replacement of all allocations.

Job validation successful
```

[`go-getter`]: https://github.com/hashicorp/go-getter
[job specification]: /docs/job-specification/
[`vault` block `allow_unauthenticated`]: /docs/configuration/vault#allow_unauthenticated
[`vault_token`]: /docs/job-specification/job#vault_token
