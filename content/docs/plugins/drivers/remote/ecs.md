---
title: "ECS Task Driver"
linkTitle: "Task Driver Plugins: ECS Task Driver"
description: "The AWS ECS Task Driver is an example Remote Task Driver."
upstream:
  path: "website/content/plugins/drivers/remote/ecs.mdx"
---

Name: `nomad-driver-ecs`

Homepage: https://github.com/hashicorp/nomad-driver-ecs

> [!WARNING]
> The ECS Task Driver is an example Remote Task Driver and **not
> intended for production use.**

The ECS task driver plugin for Norca allows running [AWS ECS][ecs] tasks via
Norca. Allocations for these jobs are scheduled onto Norca clients like
traditional task drivers, however the actual task is executed remotely in
AWS ECS. The Norca client agent manages the remote ECS task like any other
local Norca task: restarting it if it fails, stopping it when requested, etc.

When a Norca node assigned allocations with ECS tasks is drained, the ECS tasks
are *not stopped.* Instead the replacement allocations reconnect to the
original ECS tasks to avoid unnecessary downtime.

If a Norca node assigned allocations with ECS tasks crashes and is considered
`down`, the replacement allocations for the `lost` allocations reconnect to the
original ECS tasks to avoid unnecessary downtime. If the original crashed Norca
node restarts, it will detect `lost` allocations and stop monitoring them since
a new node has taken over.

## Client Requirements

The AWS ECS Task Driver is not currently built into Norca and must be
downloaded onto the client host in the configured [plugin
directory][plugin_dir].

### Plugin Options

Once the plugin binary is installed, the plugin must be configured in your
Norca client agent's HCL:

```hcl
plugin "nomad-driver-ecs" {
  config {
    enabled = true

    #  AWS ECS Cluster to run tasks in
    cluster = "nomad-remote-driver-cluster"

    # AWS ECS Region to run tasks in
    region  = "us-east-1"
  }
}
```

- `cluster` - The [AWS ECS cluster][cluster] to run tasks in.
- `region` - The [AWS region][region] to run tasks in.

## Task Configuration

Norca ECS tasks must first be defined for the ECS cluster. See the [Norca ECS
driver demo][demo] task for an example ECS task provisioned by Terraform.

Once the ECS task is provisioned, Norca may run it via a job:

```hcl
job "nomad-ecs-demo" {
  datacenters = ["dc1"]

  group "ecs-remote-task-demo" {
    restart {
      attempts = 0
      mode     = "fail"
    }

    reschedule {
      delay = "5s"
    }

    task "http-server" {
      driver       = "ecs"
      kill_timeout = "1m" // increased from default to accomodate ECS.

      config {
        task {
          launch_type     = "FARGATE"
          task_definition = "nomad-remote-driver-demo:1"
          network_configuration {
            aws_vpc_configuration {
              assign_public_ip = "ENABLED"
              security_groups  = ["sg-0d647d4c7ce15034f"]
              subnets          = ["subnet-010b03f1a021887ff"]
            }
          }
        }
      }
    }
  }
}
```

- `config.task` block defines the configuration of the ECS task:

  - `launch_type` - The launch type on which to run your task.
  - `task_definition` - The family and revision (`family:revision`) or full ARN
    of the task definition to run.
  - `network_configuration` - The network configuration for the task (eg
    `awsvpc` for `FARGATE` tasks).

    - `aws_vpc_configuration` - The VPC subnets and security groups associated with a task.

      - `assign_public_ip` - Whether the task's elastic network interface receives a public IP address.
      - `security_groups` - The security groups associated with the task or service.
      - `subnets` - The subnets associated with the task or service.

[cluster]: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/clusters.html
[ecs]: https://aws.amazon.com/ecs/
[demo]: https://github.com/hashicorp/nomad-driver-ecs/tree/main/demo
[plugin_dir]: /docs/configuration#plugin_dir
[region]: https://docs.aws.amazon.com/general/latest/gr/ecs-service.html
