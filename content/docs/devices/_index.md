---
title: "Device Plugins"
description: "Device Plugins are used to expose devices to tasks in Norca."
upstream:
  path: "website/content/docs/devices/index.mdx"
weight: 16
---

Device plugins are used to detect and make devices available to tasks in
Norca. Devices are physical hardware that exists on a client node such as a
GPU or an FPGA. By having extensible device plugins, Norca has the flexibility
to support a broad set of devices and allows the community to build additional
device plugins as needed.

The list of supported device plugins is provided on the left of this page.
Each device plugin documents its configuration and installation requirements,
the attributes it fingerprints, and the environment variables it exposes to
tasks.
