/* Cluster pages: servers, datacenters, node pools, clients, node groups, node providers. */
(function () {
  'use strict';
  const U = window.UI;
  const { D, IX, esc, enc, link, links, card, chip, kv, spark, last, meter, pct, mb, mhz, when, icon, table, related, params } = U;

  // ------------------------------------------------------------ shared helpers
  function nodeAlloc(n) {
    let cpu = 0;
    let mem = 0;
    for (const a of U.allocsOfNode(n.id)) {
      if (!['running', 'pending'].includes(a.status)) continue;
      const j = IX.job.get(a.job);
      const g = j.groups.find((x) => x.name === a.group);
      cpu += g.cpu;
      mem += g.mem;
    }
    return { cpu, mem };
  }
  U.nodeAlloc = nodeAlloc;

  function nodeChips(n, opt) {
    let h = U.chip(n.status);
    if (!n.eligible) h += ' ' + chip('', 'ineligible', 'neutral');
    if (n.drain) h += ' ' + chip('draining');
    const sc = U.scalingOf(n);
    if (sc) h += sc.badges.filter((b) => !(opt && opt.noAuto && b[0] === 'Autoscaled')).map((b) => ` <span class="chip ${b[1]}" title="${esc(b[2])}">${esc(b[0])}</span>`).join('');
    return h;
  }
  U.nodeChips = nodeChips;

  const dcMatch = (globs, dc) => (globs || []).some((g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$').test(dc));
  U.dcMatch = dcMatch;

  /** The columns of a node table (clients list, datacenter, pool pages). */
  function nodeCols(opt) {
    opt = opt || {};
    const cols = [
      { h: 'Name', f: (n) => link('node', n.id) + ` <span class="idtag">${U.short(n.id)}</span>`, sort: (n) => n.name },
      { h: 'State', f: (n) => nodeChips(n, { noAuto: true }), sort: (n) => n.status + (n.eligible ? '' : 'z') },
    ];
    if (!opt.noDc) cols.push({ h: 'Datacenter', f: (n) => link('dc', n.dc), sort: (n) => n.dc });
    if (!opt.noPool) cols.push({ h: 'Pool', f: (n) => link('pool', n.pool), sort: (n) => n.pool });
    cols.push(
      { h: 'Class', f: (n) => `<span class="mono small">${esc(n.class)}</span>`, sort: (n) => n.class },
      { h: 'Node group', f: (n) => { const s = U.scalingOf(n); return s ? link('nodegroup', s.group.name) : '<span class="faint">—</span>'; }, sort: (n) => (U.scalingOf(n) || { group: { name: '' } }).group.name },
      { h: 'Address', f: (n) => `<span class="mono small">${esc(n.address)}</span>`, sort: (n) => n.address },
      { h: 'Allocs', f: (n) => `<a href="allocations.html?node=${enc(n.name)}">${U.allocsOfNode(n.id).filter((a) => ['running', 'pending'].includes(a.status)).length}</a>`, sort: (n) => U.allocsOfNode(n.id).length, cls: 'right' },
      { h: 'CPU', f: (n) => { const r = nodeAlloc(n); return `<div style="min-width:90px">${meter(r.cpu, n.cpu - n.reserved.cpu)}<span class="note">${pct(r.cpu, n.cpu - n.reserved.cpu)}% of ${mhz(n.cpu - n.reserved.cpu)}</span></div>`; }, sort: (n) => pct(nodeAlloc(n).cpu, n.cpu) },
      { h: 'Memory', f: (n) => { const r = nodeAlloc(n); return `<div style="min-width:90px">${meter(r.mem, n.mem - n.reserved.mem)}<span class="note">${pct(r.mem, n.mem - n.reserved.mem)}% of ${mb(n.mem - n.reserved.mem)}</span></div>`; }, sort: (n) => pct(nodeAlloc(n).mem, n.mem) },
      { h: 'Version', f: (n) => `<span class="small">${esc(n.version)}</span>`, sort: (n) => n.version }
    );
    return cols;
  }
  const nodeRowClass = (n) => (n.status === 'down' ? 'row-danger' : n.drain ? 'row-info' : (U.scalingOf(n) || {}).stray ? 'row-warn' : '');

  function cellSpark(dc, pool, kind, w) {
    const m = D.metrics.cells[dc + '/' + pool];
    if (!m) return '<span class="faint small">no data</span>';
    return kind === 'cpu'
      ? spark([{ v: m.cpuAlloc, cls: 'a', area: true }, { v: m.cpuUsed, cls: 'u' }], { w: w || 140, h: 26, blocks: m.blockedCpu })
      : spark([{ v: m.memAlloc, cls: 'a', area: true }, { v: m.memUsed, cls: 'u' }], { w: w || 140, h: 26, blocks: m.blockedMem });
  }

  U.nodeCols = (opt) => nodeCols(opt);
  U.cellSpark = (dc, pool, kind, w) => cellSpark(dc, pool, kind, w);

  /**
   * Live disk of a node as /v1/client/stats reports it: DiskStats per mount
   * (device, mountpoint, size, used, available, used %, inodes used %) and
   * AllocDirStats, the file system of the allocation directory that the
   * scheduling numbers are about. Deterministic per node for the mockup.
   */
  function diskStats(n) {
    const h = parseInt(n.id.slice(0, 8), 16);
    const f = (k) => ((h >>> k) % 997) / 997;
    const hot = f(11) > 0.96 || n.name === 'eu-dc5-workers-07';
    const root = { device: '/dev/sda1', mountpoint: '/', size: 40960, usedPct: 0.22 + 0.3 * f(0), inodes: 6 + 18 * f(3) };
    const data = { device: '/dev/sdb1', mountpoint: '/var/lib/norca', size: n.disk, usedPct: hot ? 0.93 : 0.18 + 0.45 * f(5), inodes: hot ? 71 : 3 + 14 * f(7) };
    const mounts = n.pool === 'edge' ? [Object.assign(root, { size: n.disk })] : [root, data, { device: 'tmpfs', mountpoint: '/run', size: 1638, usedPct: 0.02, inodes: 1 }];
    mounts.forEach((m) => {
      m.used = Math.round(m.size * m.usedPct);
      m.available = m.size - m.used;
      m.inodes = Math.round(m.inodes);
    });
    const allocMount = n.pool === 'edge' ? mounts[0] : mounts[1];
    return { mounts, allocDir: { path: allocMount.mountpoint + '/alloc', size: allocMount.size, used: allocMount.used, available: allocMount.available, usedPct: allocMount.usedPct } };
  }

  // Servers and their Raft state are in pages-ops.js.

  // ------------------------------------------------------------ datacenters and pools
  window.PAGES.datacenters = function () {
    const c = U.shell({ nav: 'datacenters', title: 'Datacenters and node pools', pretitle: 'Cluster', crumbs: [['Cluster', ''], ['Datacenters and pools', '']], sub: 'Where work runs: region → datacenter → node pool → node. Datacenters have no API object; this page groups nodes, servers and the cluster gauges by their dc label.' });
    const dcCards = D.datacenters
      .map((dc) => {
        const nodes = D.nodes.filter((n) => n.dc === dc.name);
        const srv = D.servers.filter((s) => s.dc === dc.name);
        const groups = D.nodeGroups.filter((g) => g.spec.datacenter === dc.name);
        return card(
          link('dc', dc.name),
          `<div class="muted small" style="margin-bottom:8px">${esc(dc.location)} · ${esc(dc.description)}</div>
          ${kv([
            ['Servers', srv.map((s) => link('server', s.name)).join(', ')],
            ['Clients', `<a href="nodes.html?dc=${enc(dc.name)}">${nodes.filter((n) => n.status === 'ready').length} ready</a> of ${nodes.length}${nodes.some((n) => n.status === 'down') ? ' ' + chip('down', nodes.filter((n) => n.status === 'down').length + ' down') : ''}`],
            ['Pools', D.nodePools.map((p) => { const k = nodes.filter((n) => n.pool === p.name).length; return k ? `<a href="nodes.html?dc=${enc(dc.name)}&pool=${enc(p.name)}">${esc(p.name)} ${k}</a>` : ''; }).filter(Boolean).join(' · ')],
            ['Node groups', groups.length ? groups.map((g) => link('nodegroup', g.name) + ' ' + U.health(g.status.conditions)).join('<br>') : '<span class="faint">none</span>'],
          ])}
          <table class="t compact" style="margin-top:10px"><tr><th>Pool</th><th>CPU 24 h</th><th>Memory 24 h</th></tr>${D.nodePools
            .filter((p) => nodes.some((n) => n.pool === p.name))
            .map((p) => `<tr><td>${link('pool', p.name)}</td><td>${cellSpark(dc.name, p.name, 'cpu', 100)}</td><td>${cellSpark(dc.name, p.name, 'mem', 100)}</td></tr>`)
            .join('')}</table>`,
          { icon: 'building' }
        );
      })
      .join('');
    const poolRows = D.nodePools.map((p) => p);
    c.innerHTML = `<div class="stack"><div class="grid g3">${dcCards}</div>
      ${card('Node pools', table([
        { h: 'Pool', f: (p) => link('pool', p.name) },
        { h: 'Description', f: (p) => `<span class="muted">${esc(p.description)}</span>` },
        { h: 'Scheduler', f: (p) => esc(p.scheduler) + (p.memoryOversubscription ? ' · mem oversubscription' : '') },
        ...D.datacenters.map((dc) => ({ h: esc(dc.name), f: (p) => { const k = D.nodes.filter((n) => n.dc === dc.name && n.pool === p.name).length; return k ? `<a href="nodes.html?dc=${enc(dc.name)}&pool=${enc(p.name)}">${k}</a>` : '<span class="faint">0</span>'; }, cls: 'right' })),
        { h: 'Node groups', f: (p) => links('nodegroup', D.nodeGroups.filter((g) => g.spec.pool === p.name).map((g) => g.name)) },
        { h: 'Jobs', f: (p) => `<a href="jobs.html?pool=${enc(p.name)}">${D.jobs.filter((j) => j.pool === p.name && !j.parent).length}</a>`, cls: 'right' },
        { h: 'Namespaces allowed', f: (p) => links('ns', D.namespaces.filter((n) => n.pools.allowed.includes(p.name)).map((n) => n.name)) },
      ], poolRows), { flush: true, icon: 'layers', hint: 'new page: node pools have no page today' })}
    </div>`;
  };

  window.PAGES.datacenter = function () {
    const dc = IX.dc.get(params.get('id'));
    if (!dc) return U.notFound('datacenters', 'Datacenter', params.get('id'), 'datacenters.html');
    const nodes = D.nodes.filter((n) => n.dc === dc.name);
    const jobs = D.jobs.filter((j) => !j.parent && dcMatch(j.datacenters, dc.name));
    const c = U.shell({ nav: 'datacenters', title: dc.name, pretitle: 'Datacenter', crumbs: [['Cluster', ''], ['Datacenters and pools', 'datacenters.html'], [dc.name, '']], sub: `${esc(dc.location)} · ${esc(dc.description)}` });
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${card('Capacity by pool', table([
        { h: 'Pool', f: (p) => link('pool', p.name) },
        { h: 'Ready', f: (p) => { const m = D.metrics.cells[dc.name + '/' + p.name]; return m ? last(m.nodesReady) : '0'; } },
        { h: 'CPU allocated vs used', f: (p) => cellSpark(dc.name, p.name, 'cpu', 160) },
        { h: 'Memory allocated vs used', f: (p) => cellSpark(dc.name, p.name, 'mem', 160) },
        { h: 'Blocked', f: (p) => { const m = D.metrics.cells[dc.name + '/' + p.name]; return m && last(m.blockedEvals) ? chip('', last(m.blockedEvals) + ' eval', 'danger') : '<span class="faint">0</span>'; } },
      ], D.nodePools), { flush: true, icon: 'gauge', hint: 'norca.cluster.* {dc="' + esc(dc.name) + '"}' })}
      ${card('Clients', table(nodeCols({ noDc: true }), nodes, { rowClass: nodeRowClass }), { flush: true, icon: 'cpu', tools: `<a href="nodes.html?dc=${enc(dc.name)}">Open in Clients →</a>` })}
      ${card('Jobs that may run here', table([
        { h: 'Job', f: (j) => link('job', j.id) }, { h: 'Namespace', f: (j) => link('ns', j.ns) }, { h: 'Type', f: (j) => esc(j.type) }, { h: 'Datacenters', f: (j) => `<span class="mono small">${esc(j.datacenters.join(', '))}</span>` },
        { h: 'Allocations here', f: (j) => U.allocsOfJob(j.id).filter((a) => (IX.node.get(a.node) || {}).dc === dc.name && a.status === 'running').length, cls: 'right' },
      ], jobs, { cls: 'compact' }), { flush: true, icon: 'briefcase' })}
    </div>
    ${related([
      ['Region', '<a href="servers.html">eu</a>'],
      ['Servers', D.servers.filter((s) => s.dc === dc.name).map((s) => link('server', s.name)).join(', ')],
      ['Node pools', D.nodePools.filter((p) => nodes.some((n) => n.pool === p.name)).map((p) => link('pool', p.name)).join(', ')],
      ['Node groups', links('nodegroup', D.nodeGroups.filter((g) => g.spec.datacenter === dc.name).map((g) => g.name))],
      ['Load balancers', links('lb', D.loadBalancers.filter((l) => l.spec.datacenters.includes(dc.name)).map((l) => l.ns + '/' + l.name))],
      ['Clients', `<a href="nodes.html?dc=${enc(dc.name)}">${nodes.length} clients</a>`],
      ['Allocations', `<a href="allocations.html?dc=${enc(dc.name)}">${D.allocations.filter((a) => (IX.node.get(a.node) || {}).dc === dc.name).length} allocations</a>`],
      ['Region map', `<a href="region-map.html?dc=${enc(dc.name)}">its pools on the map</a>`, true],
    ])}</div>`;
  };

  window.PAGES.nodepool = function () {
    const p = IX.pool.get(params.get('id'));
    if (!p) return U.notFound('datacenters', 'Node pool', params.get('id'), 'datacenters.html');
    const nodes = D.nodes.filter((n) => n.pool === p.name);
    const jobs = D.jobs.filter((j) => j.pool === p.name && !j.parent);
    const c = U.shell({ nav: 'datacenters', title: p.name, pretitle: 'Node pool', crumbs: [['Cluster', ''], ['Datacenters and pools', 'datacenters.html'], [p.name, '']], sub: `${esc(p.description)} · scheduler ${esc(p.scheduler)}`, actions: `<button class="btn" data-mock="the pool editor would open (scheduler configuration, meta)">${icon('edit')}Edit</button>` });
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${card('Capacity by datacenter', table([
        { h: 'Datacenter', f: (d) => link('dc', d.name) },
        { h: 'Clients', f: (d) => `<a href="nodes.html?dc=${enc(d.name)}&pool=${enc(p.name)}">${nodes.filter((n) => n.dc === d.name).length}</a>` },
        { h: 'Node group', f: (d) => { const g = D.nodeGroups.find((x) => x.spec.pool === p.name && x.spec.datacenter === d.name); return g ? link('nodegroup', g.name) + ` <span class="faint small">${g.status.replicas}/${g.spec.replicas} (max ${g.spec.max})</span>` : '<span class="faint">—</span>'; } },
        { h: 'CPU', f: (d) => cellSpark(d.name, p.name, 'cpu') },
        { h: 'Memory', f: (d) => cellSpark(d.name, p.name, 'mem') },
      ], D.datacenters), { flush: true, icon: 'gauge' })}
      ${card('Clients', table(nodeCols({ noPool: true }), nodes, { rowClass: nodeRowClass }), { flush: true, icon: 'cpu', tools: `<a href="nodes.html?pool=${enc(p.name)}">Open in Clients →</a>` })}
      ${card('Jobs in this pool', table([{ h: 'Job', f: (j) => link('job', j.id) }, { h: 'Namespace', f: (j) => link('ns', j.ns) }, { h: 'Type', f: (j) => esc(j.type) }, { h: 'Status', f: (j) => chip(j.status) }], jobs, { cls: 'compact' }), { flush: true, icon: 'briefcase', hint: '/v1/node/pool/:name/jobs' })}
      ${card('Configuration', kv([['Scheduler algorithm', esc(p.scheduler)], ['Memory oversubscription', p.memoryOversubscription ? 'enabled' : 'disabled'], ...Object.entries(p.meta).map(([k, v]) => ['meta.' + k, esc(v)])]))}
    </div>
    ${related([
      ['Datacenters', D.datacenters.filter((d) => nodes.some((n) => n.dc === d.name)).map((d) => link('dc', d.name)).join(', ')],
      ['Node groups', links('nodegroup', D.nodeGroups.filter((g) => g.spec.pool === p.name).map((g) => g.name)), true],
      ['Namespaces', D.namespaces.map((n) => (n.pools.allowed.includes(p.name) ? link('ns', n.name) + (n.pools.default === p.name ? ' <span class="faint small">(default)</span>' : '') : '')).filter(Boolean).join(', ')],
      ['Jobs', `<a href="jobs.html?pool=${enc(p.name)}">${jobs.length} jobs</a>`],
      ['Allocations', `<a href="allocations.html?pool=${enc(p.name)}">${D.allocations.filter((a) => (IX.node.get(a.node) || {}).pool === p.name).length} allocations</a>`],
    ])}</div>`;
  };

  // ------------------------------------------------------------ clients
  window.PAGES.nodes = function () {
    const c = U.shell({ nav: 'nodes', title: 'Clients', pretitle: 'Cluster', crumbs: [['Cluster', ''], ['Clients', '']], sub: 'Names are the links; the short ID is muted next to them. The node group badges come from the status of the NodeGroup objects.' });
    const el = document.createElement('div');
    c.appendChild(el);
    U.listView(el, {
      rows: D.nodes,
      cols: nodeCols(),
      search: (n) => [n.name, n.id, n.address, n.class].join(' '),
      searchPlaceholder: 'Filter by name, ID or address',
      rowClass: nodeRowClass,
      sortIdx: 0,
      filters: [
        { key: 'status', label: 'State', options: [['ready', 'ready'], ['down', 'down'], ['ineligible', 'ineligible'], ['draining', 'draining']], match: (n, v) => (v === 'ineligible' ? !n.eligible : v === 'draining' ? !!n.drain : n.status === v) },
        { key: 'dc', label: 'Datacenter', options: U.uniq(D.nodes.map((n) => n.dc)), match: (n, v) => n.dc === v },
        { key: 'pool', label: 'Pool', options: U.uniq(D.nodes.map((n) => n.pool)), match: (n, v) => n.pool === v },
        { key: 'group', label: 'Node group', options: [['(none)', '(none)']].concat(D.nodeGroups.map((g) => [g.name, `${g.name} (${g.status.joining} joining)`])), match: (n, v) => { const s = U.scalingOf(n); return v === '(none)' ? !s : s && s.group.name === v; } },
        { key: 'badge', label: 'Rollout', options: [['Outdated'], ['Replacing'], ['Unverified']].map(([b]) => [b, b]), match: (n, v) => (U.scalingOf(n) || { badges: [] }).badges.some((b) => b[0].startsWith(v)) },
        { key: 'class', label: 'Class', options: U.uniq(D.nodes.map((n) => n.class)), match: (n, v) => n.class === v },
      ],
      foot: 'Filters: state, datacenter, pool, node group, rollout state, class, plus free text on name, ID and address. Every datacenter or pool value on other pages links here with the filter set.',
    });
  };

  /** Soft and hard replacement limits, as the operator computes them (utils/node-scaling.js). */
  function fnv32a(s) {
    let h = 0x811c9dc5;
    for (const b of new TextEncoder().encode(s)) {
      h ^= b;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  function parseDur(s) {
    const units = { s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7 };
    let t = 0;
    String(s || '').replace(/(\d+)([smhd])/g, (_, n, u) => (t += Number(n) * units[u]));
    return t;
  }
  function replacementTimes(meta, spec, name) {
    const created = Date.parse(meta['norca.created_at'] || '');
    const expires = Date.parse(meta['norca.cert_expires'] || '');
    const out = {};
    if (created && expires) out.hard = new Date(expires - (expires - created) / 12).toISOString();
    let maxAge = parseDur(spec && spec.rolling && spec.rolling.max_node_age);
    if (!maxAge && created && expires) maxAge = ((expires - created) * 3) / 4;
    if (maxAge && created) {
      const j = Number(((spec.rolling.jitter || '15%').match(/\d+/) || [15])[0]) / 100;
      out.soft = new Date(created + maxAge * (1 - j * ((fnv32a(name || '') % 10000) / 10000))).toISOString();
    }
    return out;
  }

  const STEPS_SURGE = ['surging', 'emptying', 'deleted'];
  const STEPS_FIRST = ['leaving', 'draining', 'deleted'];
  function stepper(rep) {
    const steps = rep.surge ? STEPS_SURGE : STEPS_FIRST;
    const cur = rep.phase === 'draining' && rep.surge ? 1 : steps.indexOf(rep.phase);
    return `<span class="stepper">${steps.map((s, i) => `<span class="${i < cur ? 'done' : i === cur ? 'cur' : ''}" title="${esc(U.phaseLabel(s))}">${esc(s)}</span>`).join('')}<span class="${''}">replaced</span></span>`;
  }
  U.stepper = stepper;

  window.PAGES.node = function () {
    const n = IX.node.get(params.get('id'));
    if (!n) return U.notFound('nodes', 'Client', params.get('id'), 'nodes.html');
    const sc = U.scalingOf(n);
    const allocs = U.allocsOfNode(n.id);
    const r = nodeAlloc(n);
    const svcs = U.servicesOfNode(n.id);
    const lbs = U.lbsOfNode(n);
    const evals = D.evaluations.filter((e) => e.node === n.id);
    const events = D.events.filter((e) => e.ref && e.ref[0] === 'node' && e.ref[1] === n.id);
    const c = U.shell({
      nav: 'nodes', title: n.name, id: n.id, pretitle: 'Client node',
      crumbs: [['Cluster', ''], ['Clients', 'nodes.html'], [n.name, '']],
      chips: ' ' + nodeChips(n),
      sub: `${link('dc', n.dc)} / ${link('pool', n.pool)} · class <span class="mono">${esc(n.class)}</span> · <span class="mono">${esc(n.address)}</span> · heartbeat ${when(n.lastHeartbeat)}`,
      actions: `<button class="btn" data-mock="drain dialog (deadline, ignore system jobs)">${icon('drain')}Drain</button><button class="btn" data-mock="toggle eligibility">${n.eligible ? 'Make ineligible' : 'Make eligible'}</button><button class="btn" data-mock="meta editor (norca.scale.protect, norca.scale.replace)">${icon('edit')}Meta</button>`,
    });

    let alerts = '';
    if (n.status === 'down') alerts += U.alert('danger', `<b>Down</b> since ${when(n.lastHeartbeat)}: missed heartbeats. Its allocations were marked lost and placed again: ${allocs.filter((a) => a.status === 'lost').map((a) => link('alloc', a.id) + (a.next ? ' → ' + link('alloc', a.next) : '')).join(', ') || 'none'}.`);
    if (n.drain) alerts += U.alert('info', `<b>Draining</b> since ${when(n.drain.started)}, deadline ${when(n.drain.deadline)}: ${esc(n.drain.reason)}. ${U.plural(n.drain.remaining, 'allocation')} left: ${allocs.filter((a) => a.status === 'running' && a.desired === 'stop').map((a) => link('alloc', a.id) + ' → ' + link('alloc', a.next)).join(', ')}.`);
    if (sc && sc.stray && sc.stray.kind === 'foreign') alerts += U.alert('warn', `<b>Unverified node.</b> It carries the marks of node group ${link('nodegroup', sc.group.name)} (instance <span class="mono">${esc(sc.stray.instance)}</span>) but the provider has no such machine; the operator made it ineligible (<span class="mono">ForeignNode</span>). Check how it was started, then remove it or let it be.`);

    let ngCard = '';
    if (sc && sc.group) {
      const g = sc.group;
      const meta = n.meta;
      const t = replacementTimes(meta, g.spec, meta['norca.instance']);
      const currentRev = g.status.join.revision;
      ngCard = card(
        'Node group',
        `<div class="kv-cols">${kv([
          ['Group', link('nodegroup', g.name) + ' ' + U.health(g.status.conditions)],
          ['Provider', link('provider', g.spec.provider) + ' <span class="faint">/ ' + esc(g.spec.group) + '</span>'],
          ['Instance', `<span class="mono">${esc(meta['norca.instance'] || (sc.stray || {}).instance || '')}</span>`],
          ['Template revision', meta['norca.node_group_revision'] ? `<span class="mono">${esc(meta['norca.node_group_revision'])}</span> ${meta['norca.node_group_revision'] === currentRev ? chip('', 'current', 'ok') : chip('', 'outdated (current ' + currentRev + ')', 'warn')}` : ''],
          ['Rolling generation', meta['norca.node_group_generation'] ? `${esc(meta['norca.node_group_generation'])} <span class="faint">of ${g.spec.rolling.generation}</span>` : ''],
        ])}${kv([
          ['Created', meta['norca.created_at'] ? when(meta['norca.created_at']) : ''],
          ['Certificate expires', meta['norca.cert_expires'] ? `${esc(U.fmt(meta['norca.cert_expires']))} <span class="faint">(${esc(U.ago(meta['norca.cert_expires']))})</span>` : ''],
          ['Replaced by age', t.soft ? `soft limit ${esc(U.fmt(t.soft))} <span class="faint">(${esc(U.ago(t.soft))})</span>` : ''],
          ['Hard limit', t.hard ? `${esc(U.fmt(t.hard))} <span class="faint">(${esc(U.ago(t.hard))})</span>` + (sc.warned ? ' ' + chip('', 'warned', 'warn') : '') : ''],
          ['Rollout', sc.rep ? `${stepper(sc.rep)}<div class="note">${esc(sc.rep.reason)} · since ${esc(U.ago(sc.rep.since))}</div>` : sc.outdated ? chip('', 'outdated, waiting', 'warn') : chip('', 'up to date', 'ok')],
        ])}</div>`,
        { icon: 'group', hint: 'from the NodeGroup status and the norca.* meta of the node' }
      );
    }

    const used = { cpu: Math.round(r.cpu * 0.62 + 150), mem: Math.round(r.mem * 0.71 + 600) };
    const live = n.status !== 'down';
    const dk = diskStats(n);
    const diskAlloc = allocs.filter((a) => ['running', 'pending'].includes(a.status)).length * 300; // ephemeral_disk, 300 MB each
    const row = (label, schedUsed, schedMax, fmtFn, liveUsed, liveMax, src) => `<tr><td><b>${label}</b></td>
      <td style="min-width:150px">${meter(schedUsed, schedMax)}<span class="note">${fmtFn(schedUsed)} of ${fmtFn(schedMax)} allocated (${pct(schedUsed, schedMax)}%)</span></td>
      <td style="min-width:150px">${live ? `${meter(liveUsed, liveMax, liveUsed / liveMax >= 0.9 ? 'danger' : liveUsed / liveMax >= 0.8 ? 'warn' : 'ok')}<span class="note">${fmtFn(liveUsed)} of ${fmtFn(liveMax)} used (${pct(liveUsed, liveMax)}%)</span>` : '<span class="faint">no live stats: the node is down</span>'}</td>
      <td class="note">${src}</td></tr>`;
    const res = card(
      'Resources',
      `<div class="table-wrap"><table class="t compact"><thead><tr><th></th><th>Scheduling (what the node offers)</th><th>Live use</th><th>Source</th></tr></thead><tbody>
        ${row('CPU', r.cpu, n.cpu - n.reserved.cpu, mhz, used.cpu, n.cpu, 'HostStats.CPU')}
        ${row('Memory', r.mem, n.mem - n.reserved.mem, mb, used.mem, n.mem, 'HostStats.Memory')}
        ${row('Disk', diskAlloc, n.disk, mb, dk.allocDir.used, dk.allocDir.size, `AllocDirStats of <span class="mono">${esc(dk.allocDir.path)}</span>: what scheduling uses (ephemeral_disk)`)}
      </tbody></table></div>
      <div class="note" style="margin-top:8px">Live values from /v1/client/stats, polled every 2 s while the page is open. Reserved by the agent: ${mhz(n.reserved.cpu)}, ${mb(n.reserved.mem)}.</div>`,
      { icon: 'gauge', hint: 'allocated vs live' }
    );
    const disks = card(
      'Disks',
      live
        ? table(
            [
              { h: 'Device', f: (m) => `<span class="mono small">${esc(m.device)}</span>` },
              { h: 'Mount point', f: (m) => `<span class="mono small">${esc(m.mountpoint)}</span>` + (m === dk.mounts[n.pool === 'edge' ? 0 : 1] ? ' <span class="tag" title="the allocation directory lives here">alloc dir</span>' : '') },
              { h: 'Size', f: (m) => mb(m.size), cls: 'right' },
              { h: 'Used', f: (m) => mb(m.used), cls: 'right' },
              { h: 'Available', f: (m) => mb(m.available), cls: 'right' },
              { h: 'Used %', f: (m) => `<div style="min-width:110px">${meter(m.used, m.size, m.usedPct >= 0.9 ? 'danger' : m.usedPct >= 0.8 ? 'warn' : 'ok')}<span class="note">${Math.round(m.usedPct * 100)}%</span></div>` },
              { h: 'Inodes used', f: (m) => `<span class="${m.inodes >= 70 ? 'warn-t' : ''}">${m.inodes}%</span>` },
            ],
            dk.mounts,
            { cls: 'compact', rowClass: (m) => (m.usedPct >= 0.9 ? 'row-danger' : '') }
          )
        : '<div class="muted" style="padding:16px">No live disk statistics: the node is down.</div>',
      { flush: true, icon: 'database', hint: 'live, DiskStats of /v1/client/stats' }
    );
    const hostHistory = card(
      'Host history',
      `<div class="grid g3">${U.plannedChart('CPU used %', 7, { seed: 1, note: 'norca.node.cpu_used' })}${U.plannedChart('Memory used', 7, { seed: 2, note: 'norca.node.memory_{used,total}_mb' })}${U.plannedChart('Alloc dir disk used', 7, { seed: 3, note: 'norca.node.disk_{used,total}_mb, inodes_used_percent' })}</div>
       <div class="note" style="margin-top:8px">Today the node has no stored history: the client measures these values but does not report them to the servers. With metric family 7 the report gets a node part and these charts fill from the store.</div>`,
      { icon: 'chart', hint: U.rangeSelect('24h') }
    );

    const allocTable = card(
      'Allocations',
      table(
        [
          { h: 'Allocation', f: (a) => link('alloc', a.id) },
          { h: 'Job', f: (a) => link('job', a.job) },
          { h: 'Status', f: (a) => chip(a.status) + (a.desired === 'stop' && a.status === 'running' ? ' ' + chip('', 'stopping', 'neutral') : '') },
          { h: 'Version', f: (a) => 'v' + a.version },
          { h: 'Deployment', f: (a) => (a.deployment ? link('deployment', a.deployment) : '<span class="faint">—</span>') },
          { h: 'Created', f: (a) => when(a.createdAt) },
        ],
        allocs,
        { cls: 'compact', rowClass: (a) => (['failed', 'lost'].includes(a.status) ? 'row-danger' : '') }
      ),
      { flush: true, icon: 'allocs', tools: `<a href="allocations.html?node=${enc(n.name)}">All, with filters →</a>` }
    );

    const svcCard = card(
      'Services on this node',
      table(
        [
          { h: 'Service', f: ([s]) => link('service', s.ns + '/' + s.name) },
          { h: 'Instance', f: ([, i]) => link('alloc', i[0]) },
          { h: 'Address', f: ([, i]) => `<span class="mono small">${esc(i[1])}</span>` },
          { h: 'Check', f: ([, i]) => chip(i[2]) },
        ],
        svcs.flatMap((s) => s.instances.filter(([aid]) => (IX.alloc.get(aid) || {}).node === n.id).map((i) => [s, i])),
        { cls: 'compact', empty: 'No service registered from this node' }
      ),
      { flush: true, icon: 'service', hint: 'new' }
    );

    c.innerHTML = `<div class="stack">${alerts}<div class="with-rail"><div class="stack">
      ${ngCard}
      ${res}
      ${disks}
      ${hostHistory}
      ${card('Details', kv([['Drivers', n.drivers.map((d) => `<span class="tag">${esc(d)}</span>`).join(' ')], ['Version', esc(n.version)], ['Registered', when(n.createdAt)], ['Host volumes', n.hostVolumes.length ? n.hostVolumes.map((v) => `<span class="tag">${esc(v)}</span>`).join(' ') : ''], ['Eligibility', n.eligible ? 'eligible' : 'ineligible']]), { icon: 'info' })}
      ${allocTable}
      ${svcCard}
      ${lbs.length ? card('Load balancers', table([{ h: 'LoadBalancer', f: (l) => link('lb', l.ns + '/' + l.name) }, { h: 'Service', f: (l) => link('service', l.ns + '/' + l.spec.service) }, { h: 'Target', f: (l) => `<span class="mono small">${esc(l.status.targets.find((t) => t.startsWith(n.address + ':')))}</span>` }, { h: 'Leaving', f: (l) => ((l.status.leavingNodes || []).includes(n.id) ? chip('', 'leaving', 'warn') : '<span class="faint">no</span>') }], lbs, { cls: 'compact' }), { flush: true, icon: 'lb', hint: 'this node is a target' }) : ''}
      ${card('Events', events.length ? `<ul class="items">${events.reverse().map((e) => `<li><span class="dot ${e.level}"></span><div class="what">${esc(e.text)} <span class="mono small faint">${esc(e.type)}</span></div><span class="when">${when(e.time)}</span></li>`).join('')}</ul>` : '<div class="muted" style="padding:16px">No events in the window</div>', { flush: true, icon: 'activity', tools: '<a href="activity.html?topic=Node">Activity →</a>' })}
    </div>
    <div class="stack">
    ${related([
      ['Datacenter', link('dc', n.dc), true],
      ['Node pool', link('pool', n.pool), true],
      ['Node group', sc ? link('nodegroup', sc.group.name) : ''],
      ['Provider', sc ? link('provider', sc.group.spec.provider) : '', true],
      ['Servers in DC', D.servers.filter((s) => s.dc === n.dc).map((s) => link('server', s.name)).join(', ')],
      ['Allocations', `<a href="allocations.html?node=${enc(n.name)}">${U.plural(allocs.length, 'allocation')}</a>`],
      ['Jobs', links('job', Array.from(new Set(allocs.map((a) => a.job))))],
      ['Evaluations', evals.length ? evals.map((e) => link('eval', e.id)).join('<br>') : '', true],
      ['Services', links('service', svcs.map((s) => s.ns + '/' + s.name)), true],
      ['Load balancers', links('lb', lbs.map((l) => l.ns + '/' + l.name)), true],
    ])}
    ${card('Meta', Object.keys(n.meta).length ? kv(Object.entries(n.meta).map(([k, v]) => [k, `<span class="mono small">${esc(v)}</span>`])) : '<span class="muted">No meta</span>', { icon: 'braces' })}
    </div></div></div>`;
  };

  // ------------------------------------------------------------ node groups
  function scaleBar(g) {
    const s = g.spec;
    const st = g.status;
    const max = s.max + (s.rolling.max_surge || 0);
    const rep = (st.rollout.replacing || []).length;
    const seg = (n, col, t) => (n ? `<span style="width:${(n / max) * 100}%;background:${col}" title="${t}: ${n}"></span>` : '');
    return `<div class="stackbar" style="width:150px">${seg(st.replicas, 'var(--ok-dot)', 'ready')}${seg(rep, 'var(--purple)', 'being replaced')}${seg(st.joining, 'var(--info-dot)', 'joining')}${seg(st.failed, 'var(--danger-dot)', 'failed')}</div>
      <div class="note">${st.replicas} ready of ${s.replicas} · min ${s.min} · max ${s.max}</div>`;
  }
  function rolloutText(g) {
    const r = g.status.rollout;
    if ((r.replacing || []).length) return chip('', `${r.replacing.length} replacing`, 'info') + ` <span class="small muted">${(r.outdated || []).length} outdated waiting</span>`;
    if (r.backoff) return chip('', 'backed off', 'warn') + ` <span class="small muted">${(r.outdated || []).length} outdated · retry ${esc(U.ago(r.backoff.retryAfter))}</span>`;
    if ((r.outdated || []).length) return chip('', (r.outdated || []).length + ' outdated', 'warn');
    return chip('', 'up to date', 'ok');
  }

  window.PAGES.nodegroups = function () {
    const c = U.shell({
      nav: 'nodegroups', title: 'Node groups', pretitle: 'Cluster · norca.io/NodeGroup', crumbs: [['Cluster', ''], ['Node groups', '']],
      sub: 'Capacity groups of a pool in a datacenter: the autoscaler sets the scale, the node scaling operator creates, replaces and removes the machines through a NodeProvider.',
      actions: `<a class="btn primary" href="node-group-edit.html?new=1">${icon('plus')}New node group</a><a class="btn" href="node-providers.html">${icon('cloud')}Providers</a>`,
    });
    const el = document.createElement('div');
    c.appendChild(el);
    U.listView(el, {
      rows: D.nodeGroups,
      cols: [
        { h: 'Name', f: (g) => link('nodegroup', g.name) + '<div>' + U.health(g.status.conditions) + '</div>', sort: (g) => g.name },
        { h: 'Datacenter / pool', f: (g) => `${link('dc', g.spec.datacenter)} / ${link('pool', g.spec.pool)}<div class="note">class ${esc(g.spec.node_class || 'any')}</div>`, sort: (g) => g.spec.datacenter },
        { h: 'Provider', f: (g) => link('provider', g.spec.provider) + `<div class="note">group ${esc(g.spec.group)}</div>`, sort: (g) => g.spec.provider },
        { h: 'Scale', f: scaleBar, sort: (g) => g.status.replicas },
        { h: 'Rollout', f: rolloutText, sort: (g) => (g.status.rollout.replacing || []).length },
        { h: 'Conditions', f: (g) => U.notableConds(g.status.conditions).map(U.condChip).join(' ') || chip('', 'all good', 'ok') },
        { h: 'Last scale', f: (g) => (g.status.decision ? `${when(g.status.decision.time)}<div class="note">${g.status.decision.previous} → ${g.status.decision.replicas}, ${esc(g.status.decision.check)}</div>` : '—'), sort: (g) => (g.status.decision || {}).time || '' },
        { h: 'Enforce', f: (g) => (g.spec.enforce ? chip('', 'on', 'ok') : chip('', 'dry run', 'neutral')) },
      ],
      search: (g) => g.name + ' ' + g.spec.pool + ' ' + g.spec.datacenter,
      rowClass: (g) => ({ danger: 'row-danger', warn: 'row-warn' })[U.worstTone(g.status.conditions)] || '',
      filters: [
        { key: 'dc', label: 'Datacenter', options: U.uniq(D.nodeGroups.map((g) => g.spec.datacenter)), match: (g, v) => g.spec.datacenter === v },
        { key: 'pool', label: 'Pool', options: U.uniq(D.nodeGroups.map((g) => g.spec.pool)), match: (g, v) => g.spec.pool === v },
        { key: 'provider', label: 'Provider', options: U.uniq(D.nodeGroups.map((g) => g.spec.provider)), match: (g, v) => g.spec.provider === v },
        { key: 'health', label: 'Health', options: [['problems', 'warnings or failing'], ['rolling', 'rolling']], match: (g, v) => (v === 'problems' ? ['warn', 'danger'].includes(U.worstTone(g.status.conditions)) : (g.status.rollout.replacing || []).length > 0) },
      ],
      foot: 'The current UI shows node groups only on the generic object page (Objects → kind dropdown) and its object list reads them as “unknown”, since it knows only Ready/Degraded.',
    });
  };

  function gantt(g) {
    const toMin = (s) => (s === 'now' ? 10 * 60 + 42 : Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)));
    // The window starts half an hour before the first mark, on a quarter hour.
    const marks = g.marks && g.marks.length ? g.marks : [['09:30']];
    const first = Math.min.apply(null, marks.map(([t]) => toMin(t)));
    const start = Math.floor((first - 30) / 15) * 15;
    const end = 10 * 60 + 50;
    const W = 860;
    const L = 170;
    const laneH = 30;
    const top = 30;
    const x = (m) => L + ((m - start) / (end - start)) * (W - L - 10);
    const H = top + g.lifecycle.length * laneH + 22;
    let s = '';
    for (let m = start; m <= end; m += 15) s += `<line class="grid-l" x1="${x(m)}" y1="${top - 6}" x2="${x(m)}" y2="${H - 18}"/>${m < toMin('now') - 8 ? `<text x="${x(m)}" y="${H - 4}" text-anchor="middle">${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}</text>` : ''}`;
    (g.marks || []).forEach(([t], i) => {
      const mx = x(toMin(t));
      s += `<line class="mark-l" x1="${mx}" y1="${top - 6}" x2="${mx}" y2="${H - 18}"/><circle cx="${mx}" cy="${top - 14}" r="8" fill="var(--purple)"/><text x="${mx}" y="${top - 10}" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">${i + 1}</text>`;
    });
    g.lifecycle.forEach((lane, i) => {
      const y = top + i * laneH;
      const nm = lane.node ? (IX.node.get(lane.node) || {}).name : '';
      s += `<text class="lane-l" x="4" y="${y + 11}">${esc(lane.label)}</text>${nm ? `<a href="node.html?id=${enc(lane.node)}"><text class="lane-n" x="4" y="${y + 25}">${esc(nm)}</text></a>` : ''}`;
      lane.segs.forEach(([kind, a, b, note]) => {
        const x1 = x(Math.max(start, toMin(a)));
        const x2 = x(toMin(b));
        s += `<rect class="seg-${kind}" x="${x1}" y="${y + 3}" width="${Math.max(3, x2 - x1)}" height="18" rx="3"><title>${esc(kind)} ${esc(a)}–${esc(b)}${note ? ' · ' + esc(note) : ''}</title></rect>`;
        if (x2 - x1 > 60) s += `<text class="seg-t" x="${x1 + 6}" y="${y + 16}">${esc(kind)}${note ? ' · ' + esc(note) : ''}</text>`;
      });
    });
    s += `<line class="now-l" x1="${x(toMin('now'))}" y1="${top - 6}" x2="${x(toMin('now'))}" y2="${H - 18}"/><text x="${x(toMin('now')) + 2}" y="${H - 4}" fill="var(--danger)">now</text>`;
    return `<div class="table-wrap"><svg class="gantt" viewBox="0 0 ${W} ${H}" width="100%" style="min-width:640px" role="img" aria-label="Node lifecycle timeline">${s}</svg></div>
      <div class="legend" style="margin:6px 0 4px">${(g.marks || []).map(([t, label], i) => `<span><b style="color:var(--purple)">${i + 1}</b> ${esc(t)} ${esc(label)}</span>`).join('')}</div>
      <div class="legend" style="margin-top:6px"><span><i class="seg-requested" style="background:var(--neutral-dot)"></i>requested</span><span><i style="background:var(--info-dot)"></i>joining</span><span><i style="background:var(--ok-dot)"></i>running</span><span><i style="background:var(--purple)"></i>surging (waits for its replacement)</span><span><i style="background:var(--warn-dot)"></i>draining</span><span><i style="background:var(--danger-dot)"></i>failed / foreign</span></div>`;
  }

  function toHCL(obj, indent) {
    indent = indent || '';
    let out = '';
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) out += `${indent}${k} {\n${toHCL(v, indent + '  ')}${indent}}\n`;
      else if (Array.isArray(v)) out += `${indent}${k} = [${v.map((x) => (typeof x === 'object' ? '{ ' + Object.entries(x).map(([a, b]) => `${a} = ${JSON.stringify(b)}`).join(', ') + ' }' : JSON.stringify(x))).join(', ')}]\n`;
      else out += `${indent}${k} = ${JSON.stringify(v)}\n`;
    }
    return out;
  }
  U.toHCL = toHCL;

  window.PAGES.nodegroup = function () {
    const g = IX.nodegroup.get(params.get('id'));
    if (!g) return U.notFound('nodegroups', 'Node group', params.get('id'), 'node-groups.html');
    const s = g.spec;
    const st = g.status;
    const ro = st.rollout;
    const nodeOf = (id) => IX.node.get(id);
    const nodeIds = (st.nodes || []).filter((x) => x.node).map((x) => x.node).concat((st.strayNodes || []).map((x) => x.node));
    const c = U.shell({
      nav: 'nodegroups', title: g.name, id: g.id, pretitle: 'NodeGroup · norca.io',
      crumbs: [['Cluster', ''], ['Node groups', 'node-groups.html'], [g.name, '']],
      chips: ' ' + U.health(st.conditions) + (s.enforce ? '' : ' ' + chip('', 'dry run', 'neutral')),
      sub: `${link('dc', s.datacenter)} / ${link('pool', s.pool)} · class <span class="mono">${esc(s.node_class)}</span> · provider ${link('provider', s.provider)} <span class="faint">/ ${esc(s.group)}</span> · engine ${esc(s.engine)} · generation ${g.generation}`,
      conds: U.notableConds(st.conditions).map(U.condChip).join(''),
      actions: `<a class="btn primary" href="node-group-edit.html?id=${enc(g.name)}">${icon('edit')}Edit spec</a><button class="btn" data-mock="scale dialog (norca object scale)">${icon('scale')}Scale</button><button class="btn" data-mock="sets rolling.mode = paused">${icon('pause')}Pause rollout</button>`,
    });

    // Overview: scale numbers.
    const nums = [
      ['Ready', st.replicas, 'nodes that stay (status.replicas)'],
      ['Desired', s.replicas, `spec.replicas · min ${s.min} · max ${s.max}`],
      ['Joining', st.joining, 'asked for, not joined'],
      ['Being replaced', (ro.replacing || []).length, 'rollout.replacing'],
      ['Outdated', (ro.outdated || []).length, 'waiting for a replacement'],
      ['Failed', st.failed, 'instances'],
    ];
    const scaleCard = card('Scale', `<div class="grid g6">${nums.map(([l, v, h]) => `<div><div class="small muted">${l}</div><div style="font-size:22px;font-weight:650">${v}</div><div class="note">${h}</div></div>`).join('')}</div><div style="margin-top:10px">${scaleBar(g)}</div>
      <div class="grid g3" style="margin-top:12px">${U.plannedChart('Replicas, ready, joining over time', 9, { seed: 4, note: 'norca.nodegroup.{replicas,ready,joining,failed}' })}${U.plannedChart('Replacing and outdated', 9, { seed: 5, note: 'norca.nodegroup.rollout_{replacing,outdated}' })}${U.plannedChart('Time in trouble per condition', 9, { seed: 6, note: 'norca.nodegroup.condition (0/1) by type' })}</div>
      <div class="note" style="margin-top:6px">Today only the capacity of the pool has a history (family 3, on the Scaling tab); the scale and the conditions of the group are a snapshot of its status.</div>`, { icon: 'scale' });

    const repTable = table(
      [
        { h: 'Node', f: (r) => link('node', r.node, { label: r.nodeName }) + `<div class="note mono">${esc(r.instance)}</div>` },
        { h: 'Reason', f: (r) => `<span class="tag">${esc(r.reason)}</span>` },
        { h: 'Mode', f: (r) => (r.surge ? chip('', 'surge: new node first', 'purple') : chip('', 'remove first', 'warn')) },
        { h: 'Phase', f: (r) => U.stepper(r) + `<div class="note">${esc(U.phaseLabel(r.phase))}</div>` },
        { h: 'Since', f: (r) => when(r.since) },
        { h: 'Hard limit', f: (r) => `<span class="small">${esc(U.fmt(r.expires))}</span>` },
      ],
      ro.replacing || [],
      { empty: 'No node is being replaced', cls: 'compact' }
    );
    const rolloutCard = card(
      'Rolling replacement',
      `${ro.backoff ? U.alert('warn', `<b>Backed off</b> after ${ro.backoff.vetoes} vetoes (${esc(ro.backoff.reason)}): ${esc(ro.backoff.message)}. Retry ${when(ro.backoff.retryAfter)} (${esc(U.hm(ro.backoff.retryAfter))}).`) + '<div style="height:10px"></div>' : ''}
      ${repTable}
      <div class="kv-cols" style="margin-top:12px">${kv([
        ['Outdated, waiting', (ro.outdated || []).map((nm) => { const nn = U.nodeByName.get(nm); return nn ? link('node', nn.id) : esc(nm); }).join(', ')],
        ['Hard limit warned', (ro.warned || []).map((nm) => { const nn = U.nodeByName.get(nm); return (nn ? link('node', nn.id) : esc(nm)) + ' ' + chip('', 'warned', 'warn'); }).join(', '), ''],
        ['Last replacement took', esc(ro.took || '')],
      ])}${kv([
        ['Mode', esc(s.rolling.mode) + (s.rolling.mode === 'paused' ? ' ' + chip('', 'paused', 'warn') : '')],
        ['max_unavailable / max_surge', `${s.rolling.max_unavailable} / ${s.rolling.max_surge}`],
        ['max_node_age, jitter', `${esc(s.rolling.max_node_age || 'from certificate')} · ${esc(s.rolling.jitter || '15%')}`],
        ['Generation', s.rolling.generation],
      ])}</div>`,
      { icon: 'replace', hint: 'status.rollout', id: 'rollout' }
    );

    const d = st.decision;
    const decisionCard = card(
      'Why it scaled',
      d
        ? `${kv([
            ['Decision', `<b>${d.previous} → ${d.replicas}</b> ${when(d.time)} by ${U.opLink('autoscaler')}`],
            ['Check', `<span class="tag">${esc(d.check)}</span>`],
            ['Reason', esc(d.reason)],
            ['Kept until', `${s.replicas} ready nodes (now ${st.replicas})`],
            ['Blocked evaluations', d.evaluations.map((e) => link('eval', e)).join('<br>')],
          ])}
          <div style="margin-top:10px">${table([{ h: 'Work it was made for', f: (w) => link('group', w.job + '|' + w.group) + ` <span class="faint small">${link('ns', w.namespace)}</span>` }, { h: 'Count', f: (w) => w.count, cls: 'right' }], d.work, { cls: 'compact' })}</div>`
        : '<span class="muted">No decision kept</span>',
      { icon: 'evals', hint: 'status.decision', id: 'decision' }
    );

    const instances = card(
      'Instances of the provider',
      table(
        [
          { h: 'Instance', f: (r) => `<span class="mono">${esc(r.instance)}</span>` },
          { h: 'State', f: (r) => chip(r.state) + (r.slow ? ' ' + chip('', 'slow join', 'warn') : '') },
          { h: 'Node', f: (r) => (r.node ? link('node', r.node) : `<span class="faint">${r.state === 'creating' ? 'not joined yet' : '—'}</span>`) },
          { h: 'Badges', f: (r) => (r.node ? (U.scalingOf(nodeOf(r.node)) || { badges: [] }).badges.filter((b) => b[0] !== 'Autoscaled').map((b) => `<span class="chip ${b[1]}" title="${esc(b[2])}">${esc(b[0])}</span>`).join(' ') : '') },
          { h: 'Request', f: (r) => `<span class="mono small" title="request ID">eu/${esc(g.name)}/${r.request}</span>` },
          { h: 'Created', f: (r) => when(r.created) },
          { h: 'Reason', f: (r) => esc(r.reason || '') },
        ],
        st.nodes || [],
        { cls: 'compact', rowClass: (r) => (r.state === 'failed' ? 'row-danger' : r.state === 'creating' ? 'row-info' : '') }
      ) +
        ((st.strayNodes || []).length
          ? `<div class="card-h" style="border-top:1px solid var(--border)"><h3>Nodes without an instance</h3><span class="hint">status.strayNodes</span></div>` +
            table([{ h: 'Node', f: (x) => link('node', x.node) }, { h: 'Instance', f: (x) => `<span class="mono">${esc(x.instance)}</span>` }, { h: 'Kind', f: (x) => (x.kind === 'foreign' ? chip('', 'foreign: ready, made ineligible', 'danger') : chip('', 'gone', 'neutral')) }], st.strayNodes, { cls: 'compact' })
          : ''),
      { flush: true, icon: 'cpu', hint: 'status.nodes', foot: `Last request #${st.lastRequest} · ${st.removal ? 'scale down in progress' : 'no scale down in progress (status.removal empty)'} · deletion policy ${esc(s.deletion.policy)}` }
    );

    const m = D.metrics.cells[s.datacenter + '/' + s.pool];
    const scalingCard = card(
      'Scaling inputs',
      `<div class="kv-cols">${kv([
        ['Size of a node', `${mhz(st.capacity.cpu)}, ${mb(st.capacity.memory)} <span class="faint">(allocatable ${mhz(st.allocatable.cpu)}, ${mb(st.allocatable.memory)})</span>`],
        ['Headroom', `${s.headroom_nodes} nodes${s.headroom_percent ? ', ' + s.headroom_percent + '%' : ''}`],
        ['Spill', s.spill ? 'yes' : 'no'],
        ['Policy', `every ${esc(s.policy.evaluation_interval)}, cooldown ${esc(s.policy.cooldown)}`],
        ['Scale down', `after ${esc(s.policy.scale_down.unneeded_for)} below ${s.policy.scale_down.utilization_below}%, selector ${esc(s.policy.scale_down.selector)}`],
      ])}${kv([
        ['Scale-down vetoes', st.scaleDown ? `${st.scaleDown.vetoes} (${esc(st.scaleDown.reason)})` : '<span class="muted">none in a row</span>'],
        ['Join failures', `${st.join.failures} in a row <span class="faint">(max ${s.join.max_failures})</span>`],
        ['Join template', `<span class="mono">${esc(st.join.revision)}</span>`],
        ['Blocked demand here', m ? `${last(m.blockedEvals)} evals · ${mhz(last(m.blockedCpu))} · ${mb(last(m.blockedMem))}` : ''],
      ])}</div>
      <div class="grid g2" style="margin-top:10px"><div><div class="small muted">CPU allocated vs used in ${esc(s.datacenter)}/${esc(s.pool)}, 24 h</div>${cellSpark(s.datacenter, s.pool, 'cpu', 360)}</div><div><div class="small muted">Memory allocated vs used</div>${cellSpark(s.datacenter, s.pool, 'mem', 360)}</div></div>`,
      { icon: 'gauge', hint: 'cluster gauges of the dc/pool, status.join, status.scaleDown' }
    );

    const overview = `<div class="with-rail"><div class="stack">
        ${scaleCard}
        ${card('Node lifecycle', gantt(g), { icon: 'clock', hint: 'per instance: requested → joining → running → replacement' })}
        ${rolloutCard}
        ${decisionCard}
      </div><div class="stack">
        ${related([
          ['Node pool', link('pool', s.pool)],
          ['Datacenter', link('dc', s.datacenter)],
          ['Provider', link('provider', s.provider) + ` <span class="faint small">group ${esc(s.group)}</span>`, true],
          ['Nodes', nodeIds.map((id) => link('node', id)).join('<br>') + `<div><a href="nodes.html?group=${enc(g.name)}">as a list →</a></div>`],
          ['Blocked evals', d ? d.evaluations.map((e) => link('eval', e)).join('<br>') : '', true],
          ['Work', d ? d.work.map((w) => link('group', w.job + '|' + w.group)).join(', ') : '', true],
          ['Operator', link('job', 'nodescaler-operator') + ' <span class="faint small">managedBy</span>'],
          ['Kind', link('kind', 'norca.io/NodeGroup', { full: true })],
          ['Load balancers', links('lb', D.loadBalancers.filter((l) => nodeIds.some((id) => U.lbsOfNode(nodeOf(id)).includes(l))).map((l) => l.ns + '/' + l.name))],
        ])}
        ${card('Labels and finalizers', kv([['Labels', Object.entries(g.labels).map(([k, v]) => `<span class="tag">${esc(k)}=${esc(v)}</span>`).join(' ')], ['Finalizers', g.finalizers.map((f) => `<span class="tag">${esc(f)}</span>`).join(' ')], ['Created', when(g.createdAt)], ['Observed generation', st.observedGeneration]]))}
      </div></div>`;

    c.innerHTML = `${U.tabs([['overview', 'Overview'], ['instances', 'Instances', (st.nodes || []).length], ['scaling', 'Scaling'], ['conditions', 'Conditions', st.conditions.length], ['events', 'Events', g.events.length], ['spec', 'Spec']], 'overview')}
      <div data-pane="overview">${overview}</div>
      <div data-pane="instances"><div class="stack">${instances}</div></div>
      <div data-pane="scaling"><div class="stack">${decisionCard}${scalingCard}</div></div>
      <div data-pane="conditions">${card('Conditions', U.condTable(st.conditions), { flush: true, hint: 'coloured by meaning: True is not always good', foot: 'Polarity: Degraded and JoinFailing True are failures; RollBlocked, RollBehind, ForeignNode, ScaleDownBlocked, DeletionBlocked, Drifted True are warnings; Rolling and Progressing True mean in progress; Unknown is neutral; all others True is good.' })}</div>
      <div data-pane="events">${card('Events', U.eventsTimeline(g.events), { flush: true, hint: 'norca object events norca.io/NodeGroup ' + esc(g.name), tools: `<a href="activity.html?topic=CustomObject">Activity →</a>` })}</div>
      <div data-pane="spec"><div class="grid g2">${card('Spec (HCL)', `<pre class="code">${U.hcl('kind = "norca.io/NodeGroup"\nname = "' + g.name + '"\n\nspec {\n' + toHCL(s, '  ') + '}')}</pre>`, { tools: `<a class="btn sm" href="node-group-edit.html?id=${enc(g.name)}">${icon('edit')}Edit</a>` })}${card('Status (JSON)', `<pre class="code">${U.json(Object.assign({}, st, { conditions: undefined }))}</pre>`)}</div></div>`;
    U.wireTabs(c, 'overview');
  };

  // ------------------------------------------------------------ node group editor
  window.PAGES.nodegroupedit = function () {
    const isNew = params.get('new') === '1';
    const g = isNew ? null : IX.nodegroup.get(params.get('id') || 'workers-dc2');
    const base = g
      ? JSON.parse(JSON.stringify(g.spec))
      : { enabled: true, enforce: false, engine: 'builtin', pool: 'workers', datacenter: 'eu-dc3', node_class: 'cx32', replicas: 0, min: 0, max: 3, provider: 'hetzner-eu', group: 'fsn1', node: { parameters: { server_type: 'cx32', image: 'norca-node-2026-11' } }, rolling: { mode: 'auto', generation: 1, max_node_age: '45d', max_unavailable: 1, max_surge: 1, jitter: '15%' }, policy: { scale_down: { unneeded_for: '10m', utilization_below: 40, selector: 'least_busy', drain_deadline: '15m' } } };
    const name = g ? g.name : 'workers-dc3';
    const c = U.shell({
      nav: 'nodegroups', title: isNew ? 'New node group' : 'Edit ' + name, pretitle: 'NodeGroup · norca.io',
      crumbs: [['Cluster', ''], ['Node groups', 'node-groups.html']].concat(g ? [[g.name, 'node-group.html?id=' + enc(g.name)], ['Edit', '']] : [['New', '']]),
      sub: 'A form over the spec with the HCL beside it, validated against the rules of the kind as you type. Related data on the right shows what the change would touch.',
    });
    const prov = (n) => IX.provider.get(n);
    const field = (label, inner, help, key) => `<div class="form-row"><label>${label}</label><div>${inner}${help ? `<div class="help">${help}</div>` : ''}${key ? `<div class="err hidden" data-err="${key}"></div>` : ''}</div></div>`;
    const inp = (k, v, opt) => `<input class="in ${opt && opt.short ? 'short' : ''}" data-f="${k}" value="${esc(v == null ? '' : v)}" ${opt && opt.disabled ? 'disabled title="' + esc(opt.disabled) + '"' : ''} ${opt && opt.type ? 'type="' + opt.type + '"' : ''}>`;
    const sel = (k, v, options, opt) => `<select class="in" data-f="${k}" ${opt && opt.disabled ? 'disabled' : ''}>${options.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    const groupsOf = (p) => ((prov(p) || { spec: { groups: [] } }).spec.groups || []).map((x) => x.name);

    const form = `
      <div class="fieldset-title">Placement</div>
      ${field('Datacenter', isNew ? sel('datacenter', base.datacenter, D.datacenters.map((d) => d.name)) : inp('datacenter', base.datacenter, { disabled: "pool and datacenter can't be changed: the nodes of the group would no longer belong to it" }), isNew ? '' : "Can't be changed after creation (rule of the kind).")}
      ${field('Node pool', isNew ? sel('pool', base.pool, D.nodePools.map((p) => p.name)) : inp('pool', base.pool, { disabled: "can't be changed" }), '')}
      ${field('Node class', isNew ? inp('node_class', base.node_class) : inp('node_class', base.node_class, { disabled: "node_class can't be changed" }), '')}
      <div class="fieldset-title">Scale</div>
      ${field('Replicas', inp('replicas', base.replicas, { short: true, type: 'number' }), 'Written by the autoscaler when enforce is on; set by hand to override.', 'replicas')}
      ${field('Min / max', inp('min', base.min, { short: true, type: 'number' }) + ' ' + inp('max', base.max, { short: true, type: 'number' }), '', 'minmax')}
      ${field('Enforce', `<label class="toggle"><input type="checkbox" data-f="enforce" ${base.enforce ? 'checked' : ''}> write decisions to replicas (off: dry run, events only)</label>`)}
      <div class="fieldset-title">Provider and node template</div>
      ${field('Provider', sel('provider', base.provider, D.nodeProviders.map((p) => p.name)), '', 'provider')}
      ${field('Provider group', sel('group', base.group, groupsOf(base.provider)), '', 'group')}
      ${field('Server type', inp('node.parameters.server_type', base.node.parameters.server_type))}
      ${field('Image', inp('node.parameters.image', base.node.parameters.image), 'Changing spec.node changes the template revision: every node of the group is replaced.', 'image')}
      <div class="fieldset-title">Rolling replacement</div>
      ${field('Mode', sel('rolling.mode', base.rolling.mode, ['auto', 'paused']))}
      ${field('max_unavailable / max_surge', inp('rolling.max_unavailable', base.rolling.max_unavailable, { short: true, type: 'number' }) + ' ' + inp('rolling.max_surge', base.rolling.max_surge, { short: true, type: 'number' }), 'With max_surge ≥ 1 the new node comes first.')}
      ${field('max_node_age', inp('rolling.max_node_age', base.rolling.max_node_age, { short: true }), 'Duration such as 45d or 720h.', 'age')}
      ${field('Generation', inp('rolling.generation', base.rolling.generation, { short: true, type: 'number' }), 'Raise it to replace every node with the same template.')}
      <div class="fieldset-title">Scale down</div>
      ${field('Unneeded for / below', inp('policy.scale_down.unneeded_for', base.policy.scale_down.unneeded_for, { short: true }) + ' ' + inp('policy.scale_down.utilization_below', base.policy.scale_down.utilization_below, { short: true, type: 'number' }) + ' %')}
      ${field('Selector', sel('policy.scale_down.selector', base.policy.scale_down.selector, ['least_busy', 'empty']), 'empty: only nodes without allocations; nothing is ever drained.')}`;

    c.innerHTML = `<div class="with-rail" style="grid-template-columns:minmax(0,1fr) 400px"><div class="stack">
        ${card('Spec', `${isNew ? field('Name', `<input class="in" data-f="name" value="${esc(name)}">`) : ''}${form}`, { icon: 'edit', foot: `<button class="btn primary" data-act="apply">${icon('play')}Apply</button> <button class="btn" data-act="dry">Dry run</button> <a class="btn" href="${g ? 'node-group.html?id=' + enc(g.name) : 'node-groups.html'}">Cancel</a>` })}
      </div><div class="stack">
        ${card('What this change does', '<div id="impact"></div>', { icon: 'info' })}
        ${card('HCL', '<pre class="code" id="hclprev"></pre>', { hint: 'norca object apply' })}
        ${g ? related([
          ['Now', `${g.status.replicas} ready of ${g.spec.replicas} · ${U.health(g.status.conditions)}`],
          ['Nodes', `<a href="nodes.html?group=${enc(g.name)}">${(g.status.nodes || []).filter((x) => x.node).length} nodes</a>`],
          ['Rollout', rolloutText(g)],
          ['Pool capacity', cellSpark(g.spec.datacenter, g.spec.pool, 'cpu', 200)],
        ], { hint: 'current state' }) : ''}
        ${card('Provider groups', '<div id="provgroups"></div>', { icon: 'cloud', hint: 'instances in use vs max of the provider group' })}
      </div></div>`;

    const get = () => {
      const v = JSON.parse(JSON.stringify(base));
      c.querySelectorAll('[data-f]').forEach((el) => {
        const path = el.dataset.f.split('.');
        let o = v;
        for (let i = 0; i < path.length - 1; i++) o = o[path[i]] = o[path[i]] || {};
        const k = path[path.length - 1];
        o[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
      });
      return v;
    };
    const render = () => {
      const v = get();
      const errs = {};
      if (v.min > v.max) errs.minmax = 'min must not exceed max';
      if (v.replicas > v.max || v.replicas < v.min) errs.replicas = 'replicas must be between min and max';
      if (!/^([0-9]+(s|m|h|d))+$/.test(v.rolling.max_node_age || '1d')) errs.age = 'a duration such as 45d, 720h or 1h30m';
      if (!groupsOf(v.provider).includes(v.group)) errs.group = 'the provider offers no group ' + v.group;
      const p = prov(v.provider);
      if (p && U.worstTone(p.status.conditions) === 'danger') errs.provider = 'provider ' + v.provider + ' is unavailable: ' + p.status.conditions[0].message;
      c.querySelectorAll('[data-err]').forEach((el) => {
        const e = errs[el.dataset.err];
        el.textContent = e || '';
        el.classList.toggle('hidden', !e);
      });
      const nm = (c.querySelector('[data-f="name"]') || { value: name }).value;
      document.getElementById('hclprev').innerHTML = U.hcl('kind = "norca.io/NodeGroup"\nname = "' + nm + '"\n\nspec {\n' + toHCL(v, '  ') + '}');
      // impact
      const items = [];
      if (g) {
        const nodes = (g.status.nodes || []).filter((x) => x.node).length;
        if (JSON.stringify(v.node) !== JSON.stringify(g.spec.node)) items.push(['warn', `Template changes: <b>all ${nodes} nodes</b> get a new revision and are replaced, ${v.rolling.max_unavailable} at a time${v.rolling.max_surge ? ', new node first' : ', remove first'}.`]);
        if (v.rolling.generation > g.spec.rolling.generation) items.push(['warn', `Generation ${g.spec.rolling.generation} → ${v.rolling.generation}: every node is replaced with the same template.`]);
        if (v.replicas !== g.spec.replicas) items.push(['info', `Scale ${g.spec.replicas} → ${v.replicas}: ${v.replicas > g.spec.replicas ? 'the operator asks the provider for ' + (v.replicas - g.spec.replicas) + ' instance(s)' : 'one node at a time is removed (' + v.policy.scale_down.selector + ')'}.`]);
        if (v.rolling.mode !== g.spec.rolling.mode) items.push(['info', `Rollout ${v.rolling.mode === 'paused' ? 'paused: no new replacement except at the hard limit' : 'resumed'}.`]);
        if (v.enforce !== g.spec.enforce) items.push(['info', v.enforce ? 'Decisions will be written to replicas.' : 'Decisions become dry runs (ScalingDryRun events).']);
        if (v.max !== g.spec.max || v.min !== g.spec.min) items.push(['info', `Bounds ${g.spec.min}–${g.spec.max} → ${v.min}–${v.max}.`]);
        if ((g.status.rollout.replacing || []).length && JSON.stringify(v.node) !== JSON.stringify(g.spec.node)) items.push(['warn', `A rollout is in progress (${g.status.rollout.replacing.length} replacing): the nodes it already replaced become outdated again.`]);
      } else items.push(['info', `Creates the group; the operator puts its finalizer on it and asks ${esc(v.provider)} for ${v.replicas} instance(s).`]);
      Object.values(errs).forEach((e) => items.unshift(['danger', 'Refused: ' + esc(e)]));
      document.getElementById('impact').innerHTML = items.length ? `<ul class="items" style="margin:-14px -16px">${items.map(([t, h]) => `<li><span class="dot ${t}"></span><div class="what">${h}</div></li>`).join('')}</ul>` : '<span class="muted">No change yet. Edit a field to see its effect.</span>';
      const pv = prov(v.provider);
      document.getElementById('provgroups').innerHTML = pv
        ? table([
            { h: 'Group', f: (x) => esc(x.name) + (x.name === v.group ? ' ' + chip('', 'selected', 'info') : '') },
            { h: 'In use', f: (x) => { const used = D.nodeGroups.filter((ng) => ng.spec.provider === pv.name && ng.spec.group === x.name).reduce((a, ng) => a + (ng.status.nodes || []).filter((r) => r.state !== 'failed').length, 0); return `${meter(used, x.max)}<span class="note">${used} of ${x.max}</span>`; } },
            { h: 'Node groups', f: (x) => links('nodegroup', D.nodeGroups.filter((ng) => ng.spec.provider === pv.name && ng.spec.group === x.name).map((ng) => ng.name)) },
          ], pv.spec.groups, { cls: 'compact' }) + `<div class="note" style="margin-top:6px">${link('provider', pv.name)} · heartbeat ${when(pv.status.heartbeat)}</div>`
        : '';
    };
    c.addEventListener('input', render);
    c.addEventListener('change', (e) => {
      if (e.target.dataset.f === 'provider') {
        const gs = groupsOf(e.target.value);
        c.querySelector('[data-f="group"]').innerHTML = gs.map((x) => `<option>${esc(x)}</option>`).join('');
      }
      render();
    });
    c.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const bad = c.querySelectorAll('[data-err]:not(.hidden)').length;
      U.toast(bad ? 'Refused by the rules of the kind: fix the marked fields' : a.dataset.act === 'dry' ? 'Dry run: the object is valid (mockup)' : 'Mockup: would run norca object apply');
    });
    render();
  };

  // ------------------------------------------------------------ node providers
  const hbTone = (p) => (U.NOW - Date.parse(p.status.heartbeat) < 120000 ? 'ok' : 'danger');
  window.PAGES.providers = function () {
    const c = U.shell({ nav: 'providers', title: 'Node providers', pretitle: 'Cluster · norca.io/NodeProvider', crumbs: [['Cluster', ''], ['Node groups', 'node-groups.html'], ['Node providers', '']], sub: 'Applications that create and delete the machines of a platform. They register themselves and keep a heartbeat; credentials never enter an object.' });
    c.innerHTML = card('', table([
      { h: 'Name', f: (p) => link('provider', p.name) + '<div>' + U.health(p.status.conditions) + '</div>' },
      { h: 'Endpoint', f: (p) => `<span class="mono small">${esc(p.spec.endpoint)}</span>` },
      { h: 'Heartbeat', f: (p) => chip('', U.ago(p.status.heartbeat), hbTone(p)) + '<div class="note">TTL 2m</div>' },
      { h: 'Version', f: (p) => esc(p.status.version) },
      { h: 'Groups', f: (p) => p.spec.groups.map((x) => `<span class="tag">${esc(x.name)} · max ${x.max}</span>`).join(' ') },
      { h: 'Used by', f: (p) => links('nodegroup', D.nodeGroups.filter((g) => g.spec.provider === p.name).map((g) => g.name)) },
      { h: 'Orphaned instances', f: (p) => (p.orphaned ? chip('', String(p.orphaned), 'warn') : '<span class="faint">0</span>'), cls: 'right' },
    ], D.nodeProviders, { rowClass: (p) => (hbTone(p) === 'danger' ? 'row-danger' : '') }), { flush: true });
  };

  window.PAGES.provider = function () {
    const p = IX.provider.get(params.get('id'));
    if (!p) return U.notFound('providers', 'Node provider', params.get('id'), 'node-providers.html');
    const groups = D.nodeGroups.filter((g) => g.spec.provider === p.name);
    const c = U.shell({
      nav: 'providers', title: p.name, id: p.id, pretitle: 'NodeProvider · norca.io',
      crumbs: [['Cluster', ''], ['Node groups', 'node-groups.html'], ['Node providers', 'node-providers.html'], [p.name, '']],
      chips: ' ' + U.health(p.status.conditions),
      sub: `<span class="mono">${esc(p.spec.endpoint)}</span> · version ${esc(p.status.version)} · heartbeat ${chip('', U.ago(p.status.heartbeat), hbTone(p))}`,
      conds: p.status.conditions.map(U.condChip).join(''),
    });
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${hbTone(p) === 'danger' ? U.alert('danger', `<b>No heartbeat for ${esc(U.ago(p.status.heartbeat).replace(' ago', ''))}.</b> The operator treats the provider as unavailable; node groups that use it get <span class="mono">ProviderAvailable = False</span>. ${groups.length ? '' : 'No node group uses it today.'}`) : ''}
      ${card('Groups (zones)', table([
        { h: 'Group', f: (x) => `<b>${esc(x.name)}</b>` },
        { h: 'Instances in use', f: (x) => { const used = groups.filter((g) => g.spec.group === x.name).reduce((a, g) => a + (g.status.nodes || []).filter((r) => r.state !== 'failed').length, 0); return `<div style="max-width:200px">${meter(used, x.max)}</div><span class="note">${used} of ${x.max} (this cluster)</span>`; } },
        { h: 'Node groups', f: (x) => links('nodegroup', groups.filter((g) => g.spec.group === x.name).map((g) => g.name)) },
        { h: 'Refusals', f: (x) => { const r = groups.filter((g) => g.spec.group === x.name).flatMap((g) => g.status.conditions.filter((cd) => cd.type === 'Provisioned' && cd.status === 'False')); return r.length ? r.map(U.condChip).join(' ') + `<div class="note">${esc(r[0].reason)}</div>` : '<span class="faint">none</span>'; } },
      ], p.spec.groups), { flush: true, icon: 'layers', hint: 'spec.groups' })}
      ${card('Heartbeat and version', kv([['Last heartbeat', `${esc(U.fmt(p.status.heartbeat))} ${chip('', U.ago(p.status.heartbeat), hbTone(p))}`], ['Version', esc(p.status.version)], ['Registered', when(p.createdAt)], ['Token', `${link('variable', p.spec.token_variable)} <span class="faint small">(Variable path; the token never enters the object)</span>`], ['Parameters', `<span class="mono small">${esc(JSON.stringify(p.spec.parameters))}</span>`]]), { icon: 'activity' })}
      ${card('Operator metrics for this provider', kv([['Orphaned instances', `${p.orphaned} <span class="faint">norca_nodescaler_orphaned_instances{provider="${esc(p.name)}"}</span>`], ['Orphans deleted', `0 <span class="faint">norca_nodescaler_orphans_deleted_total</span>`]]) + '<div class="note" style="margin-top:8px">Today these are only on the operator’s own /metrics port. The mockup assumes a proposal: the operator reports a small summary into the status, or the agent proxies its metrics.</div>', { icon: 'chart', hint: 'proposal' })}
      ${card('Conditions', U.condTable(p.status.conditions), { flush: true })}
      ${card('Events', U.eventsTimeline(p.events), { flush: true })}
    </div>
    ${related([
      ['Node groups', links('nodegroup', groups.map((g) => g.name)), true],
      ['Nodes', groups.length ? `<a href="nodes.html?pool=workers">${groups.reduce((a, g) => a + (g.status.nodes || []).filter((r) => r.node).length, 0)} nodes</a>` : ''],
      ['Token variable', link('variable', p.spec.token_variable)],
      ['Operator', link('job', 'nodescaler-operator')],
      ['Kind', link('kind', 'norca.io/NodeProvider', { full: true })],
    ])}</div>`;
  };
})();
