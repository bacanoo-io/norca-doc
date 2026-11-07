---
title: "Web UI v2 – preview"
linkTitle: "Preview"
weight: 2
description: "A clickable static mockup of the Web UI v2 plan, with example data of one region: 8 datacenters and about 350 nodes."
---

This is a clickable mockup of the [Web UI v2 plan](/docs/features/web-ui/plan): plain HTML, CSS and a
little JavaScript, with no server and no network access. It is not the Norca UI and not connected to a
cluster. All data is example data of one region with 8 datacenters, 5 servers and about 350 client nodes;
every name, ID and address is made up, and the clock is fixed, so "4m ago" means the same on every page.

**The mockup shows the direction, not the specification.** It does not show everything the API and the
metrics store offer, and some values are invented per object. Each page is reviewed in detail against
the real API when it is built.

Pages to try first:

- **Dashboard:** the capacity block (rows are the datacenters, the ones under pressure first; switch to
  the heat table), operations in progress and warnings.
- **Region map:** click a datacenter, then a pool, then a node; try the node search and the list view.
- **A detail page with its Related card:** a node group (for example `workers-dc2`, in the middle of a
  rolling replacement), a job, an allocation or a client.
- **Regions and servers** and **Metrics:** Raft per server, the store retention, and charts marked
  "planned".
- **Search:** press `/` or `Ctrl K` anywhere and type a name or a short ID.

Buttons that would change something (Drain, Scale, Apply, Stop, …) only show a note. The moon/sun button
switches between the light and the dark theme. The frame below is narrower than a browser window, so the
mockup may hide its menu behind the menu button in its top bar; open it in a full window to see the
sidebar.

{{< mockup-frame src="design/mockups/ui-preview/index.html" title="Web UI v2 preview" height="85vh" link="Open the preview in a full window" >}}
