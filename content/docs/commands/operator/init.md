---
title: "Command: operator init"
linkTitle: "operator init"
description: "The operator init command scaffolds an operator project for the Norca controller SDK."
---

The `operator init` command creates the project of an operator (a controller of
custom objects) for the Norca [controller SDK](/docs/features/operator-framework/controllers).
It does not contact the servers.

## Usage

```plaintext
norca operator init [options] <group>/<Kind> [<directory>]
```

The group must be a lower case DNS name with at least one dot (such as
`db.example.com`) and the kind a CamelCase name that starts with an upper case
letter (such as `PostgresCluster`). The project is written to the directory, by
default the operator name.

The project contains:

- the object kind (`<kind>.kind.hcl`, with a JSON Schema, a CEL rule, columns, a
  schema version and limits) and a sample object in `examples/`;
- the Go module of the controller: a reconciler with a finalizer, status
  conditions and the event log, leader election and metrics;
- a validating webhook (the `webhook` subcommand of the operator binary);
- tests against the SDK's fake backend and against a dev agent (`envtest`);
- an operator pack in `pack/<name>/` that installs the kind, the ACL policy of
  the controller and the controller job as one release;
- a `README.md` with the local workflow.

## Init Options

- `-name`: Name of the operator: binary, controller, job and pack (default:
  `<kind in kebab case>-operator`, for example `postgres-cluster-operator`).

- `-module`: Go module path (default: `example.com/<name>`).

- `-cluster-scoped`: Make the kind cluster-scoped instead of namespaced.

- `-sdk`: The `nomad` directory of a Norca checkout. `go.mod` then replaces the
  SDK and API modules with its `controller` and `api` directories; without it the
  replace directives are left for you to fill in, and the command prints a
  warning.

- `-force`: Overwrite existing files.

## Examples

```shell
$ norca operator init -sdk ~/norca/nomad db.example.com/PostgresCluster
$ cd postgres-cluster-operator && go mod tidy && go test ./...
```

Then check the kind and run the controller against a dev agent as the
generated `README.md` describes, for example:

```shell
$ norca object-kind lint postgrescluster.kind.hcl examples/postgrescluster.hcl
```
