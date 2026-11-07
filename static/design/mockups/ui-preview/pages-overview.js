/* Overview pages: dashboard, region map, activity. */
(function () {
  'use strict';
  const U = window.UI;
  const { D, esc, enc, link, card, chip, kv, spark, last, meter, pct, mb, mhz, when, icon, itemsList, table, params } = U;

  const POOLS = D.nodePools.map((p) => p.name);
  const DCS = D.datacenters.map((d) => d.name);
  const NODES_BY_CELL = new Map();
  D.nodes.forEach((n) => {
    const k = n.dc + '/' + n.pool;
    if (!NODES_BY_CELL.has(k)) NODES_BY_CELL.set(k, []);
    NODES_BY_CELL.get(k).push(n);
  });
  const cellNodes = (dc, pool) => NODES_BY_CELL.get(dc + '/' + pool) || [];
  const cellGroup = (dc, pool) => D.nodeGroups.find((g) => g.spec.datacenter === dc && g.spec.pool === pool);
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  // ------------------------------------------------------------ node states
  // [id, label, svg class, colour, interesting (drawn one by one at scale)]
  const STATES = [
    ['ready', 'ready', 'st-ok', 'var(--ok-dot)', false],
    ['outdated', 'outdated', 'st-outdated', 'var(--warn-dot)', false],
    ['ineligible', 'ineligible', 'st-neutral', 'var(--neutral-dot)', false],
    ['initializing', 'initializing', 'st-init', 'var(--info-dot)', true],
    ['draining', 'draining', 'st-info', 'var(--info-dot)', true],
    ['replacing', 'being replaced', 'st-purple', 'var(--purple)', true],
    ['joining', 'joining (no node yet)', 'st-join', 'var(--info-dot)', true],
    ['foreign', 'unverified', 'st-foreign', 'var(--danger-dot)', true],
    ['down', 'down', 'st-down', 'var(--danger-dot)', true],
  ];
  const STATE = Object.fromEntries(STATES.map((s) => [s[0], s]));
  const STATE_CACHE = new Map();
  function nodeState(n) {
    if (STATE_CACHE.has(n.id)) return STATE_CACHE.get(n.id);
    const sc = U.scalingOf(n);
    let s = 'ready';
    if (n.status === 'down') s = 'down';
    else if (n.status === 'initializing') s = 'initializing';
    else if (n.drain) s = 'draining';
    else if (sc && sc.rep) s = 'replacing';
    else if (sc && sc.stray && sc.stray.kind === 'foreign') s = 'foreign';
    else if (!n.eligible) s = 'ineligible';
    else if (sc && sc.outdated) s = 'outdated';
    STATE_CACHE.set(n.id, s);
    return s;
  }
  U.nodeState = nodeState;
  const joiningOf = (dc, pool) => {
    const g = cellGroup(dc, pool);
    return g ? (g.status.nodes || []).filter((r) => r.state === 'creating').map((r) => Object.assign({ group: g.name }, r)) : [];
  };
  const countStates = (nodes, joining) => {
    const c = {};
    nodes.forEach((n) => {
      const s = nodeState(n);
      c[s] = (c[s] || 0) + 1;
    });
    if (joining && joining.length) c.joining = joining.length;
    return c;
  };

  /** Cluster-wide percent from the cells, weighted by capacity. */
  function clusterPct(metric, capKey) {
    let num = 0;
    let den = 0;
    for (const [key, m] of Object.entries(D.metrics.cells)) {
      const [dc, pool] = key.split('/');
      const cap = sum(cellNodes(dc, pool).filter((n) => n.status === 'ready').map((n) => n[capKey]));
      num += (last(m[metric]) / 100) * cap;
      den += cap;
    }
    return den ? Math.round((num / den) * 100) : 0;
  }
  function clusterSeries(metric, capKey) {
    const out = [];
    for (let i = 0; i < 48; i++) {
      let num = 0;
      let den = 0;
      for (const [key, m] of Object.entries(D.metrics.cells)) {
        const [dc, pool] = key.split('/');
        const cap = sum(cellNodes(dc, pool).map((n) => n[capKey]));
        num += (m[metric][i] / 100) * cap;
        den += cap;
      }
      out.push(den ? (num / den) * 100 : 0);
    }
    return out;
  }

  // ------------------------------------------------------------ capacity per datacenter and pool
  /** What one dc/pool cell shows, and how much pressure it is under. */
  function capInfo(dc, pool) {
    const nodes = cellNodes(dc, pool);
    const m = D.metrics.cells[dc + '/' + pool];
    if (!nodes.length || !m) return null;
    const ready = last(m.nodesReady);
    const notReady = nodes.length - ready;
    const cpuA = Math.round(last(m.cpuAlloc));
    const memA = Math.round(last(m.memAlloc));
    const blocked = last(m.blockedEvals);
    const hot = Math.max(cpuA, memA);
    const reasons = [];
    if (blocked) reasons.push(['danger', `${blocked} blocked`]);
    if (hot >= 80) reasons.push(['warn', `${hot}% ${cpuA >= memA ? 'cpu' : 'mem'}`]);
    if (notReady) reasons.push(['warn', `${notReady} not ready`]);
    const score = blocked ? 3 : hot >= 80 ? 2 : notReady ? 1 : 0;
    return { dc, pool, nodes, m, ready, notReady, cpuA, memA, blocked, hot, reasons, score, g: cellGroup(dc, pool) };
  }
  const heatClass = (metric, v) => {
    if (metric === 'notReady' || metric === 'blocked') return v ? (metric === 'blocked' || v > 1 ? 'h4' : 'h3') : 'h0';
    return v >= 90 ? 'h4' : v >= 80 ? 'h3' : v >= 60 ? 'h2' : 'h1';
  };
  const HEAT_METRICS = [['cpuA', 'CPU allocated %'], ['memA', 'Memory allocated %'], ['notReady', 'Nodes not ready'], ['blocked', 'Blocked evaluations']];

  function capacityBlock(el) {
    const st = { mode: ['heat', 'spark'].includes(params.get('cap')) ? params.get('cap') : DCS.length > 10 ? 'heat' : 'spark', showAll: false, dc: '', pool: '', metric: 'cpuA', pinned: '' };
    const rowsAll = DCS.map((dc) => {
      const cells = POOLS.map((p) => capInfo(dc, p));
      const present = cells.filter(Boolean);
      return { dc, cells, score: Math.max(0, ...present.map((x) => x.score)), reasons: present.flatMap((x) => x.reasons.map((r) => [r[0], `${x.pool}: ${r[1]}`])) };
    }).sort((a, b) => b.score - a.score || a.dc.localeCompare(b.dc));

    const sparkCell = (x) => {
      if (!x) return `<div class="cap-cell empty">no nodes</div>`;
      const m = x.m;
      return `<div class="cap-cell ${x.score >= 2 ? 'pressure' : ''}">
        <div class="row1"><span><a href="nodes.html?dc=${enc(x.dc)}&pool=${enc(x.pool)}"><b>${x.ready}</b> ready</a>${x.notReady ? ` <span class="faint">of ${x.nodes.length}</span>` : ''}</span>${x.g ? link('nodegroup', x.g.name, { icon: true }) : '<span class="faint small">no node group</span>'}</div>
        ${x.reasons.length ? `<div style="margin:3px 0 1px">${x.reasons.map(([t, r]) => (t === 'danger' ? `<a class="chip danger" href="evaluations.html?status=blocked" title="blocked_cpu_mhz ${last(m.blockedCpu)}, blocked_memory_mb ${last(m.blockedMem)}">${esc(r)}</a>` : `<span class="chip ${t}">${esc(r)}</span>`)).join(' ')}</div>` : ''}
        <div class="mini"><span>CPU</span>${spark([{ v: m.cpuAlloc, cls: 'a', area: true }, { v: m.cpuUsed, cls: 'u' }], { w: 120, h: 22, fluid: true, blocks: m.blockedCpu })}<span class="v">${x.cpuA}%</span></div>
        <div class="mini"><span>Mem</span>${spark([{ v: m.memAlloc, cls: 'a', area: true }, { v: m.memUsed, cls: 'u' }], { w: 120, h: 22, fluid: true, blocks: m.blockedMem })}<span class="v">${x.memA}%</span></div>
      </div>`;
    };
    const cellDetail = (x) => `<div class="cell-detail"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b>${link('dc', x.dc)} / ${link('pool', x.pool)}</b>${x.g ? link('nodegroup', x.g.name, { icon: true }) + ' ' + U.health(x.g.status.conditions) : ''}${x.reasons.map(([t, r]) => `<span class="chip ${t}">${esc(r)}</span>`).join(' ')}</div>
      <div class="grid g2" style="margin-top:8px"><div><div class="small muted">CPU allocated vs used · now ${x.cpuA}%</div>${spark([{ v: x.m.cpuAlloc, cls: 'a', area: true }, { v: x.m.cpuUsed, cls: 'u' }], { w: 300, h: 34, fluid: true, blocks: x.m.blockedCpu })}</div>
      <div><div class="small muted">Memory allocated vs used · now ${x.memA}%</div>${spark([{ v: x.m.memAlloc, cls: 'a', area: true }, { v: x.m.memUsed, cls: 'u' }], { w: 300, h: 34, fluid: true, blocks: x.m.blockedMem })}</div></div>
      <div class="note" style="margin-top:6px">${x.ready} of ${x.nodes.length} nodes ready · <a href="nodes.html?dc=${enc(x.dc)}&pool=${enc(x.pool)}">clients</a> · <a href="region-map.html?dc=${enc(x.dc)}&pool=${enc(x.pool)}">on the region map</a></div></div>`;

    const render = () => {
      const pools = POOLS.filter((p) => !st.pool || p === st.pool);
      const filtered = rowsAll.filter((r) => !st.dc || r.dc === st.dc);
      const showAll = st.showAll || st.dc;
      const visible = filtered.filter((r) => showAll || r.score > 0);
      const hidden = filtered.length - visible.length;
      const tools = `<div class="filters" style="border-radius:0">
        <span class="seg">${[['spark', 'Sparklines'], ['heat', 'Heat table']].map(([m, l]) => `<button class="btn sm ${st.mode === m ? 'on' : ''}" data-mode="${m}">${l}</button>`).join('')}</span>
        <label class="f">Datacenter <select data-f="dc"><option value="">All (${DCS.length})</option>${DCS.map((d) => `<option ${st.dc === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        <label class="f">Pool <select data-f="pool"><option value="">All</option>${POOLS.map((p) => `<option ${st.pool === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
        ${st.mode === 'heat' ? `<label class="f">Colour by <select data-f="metric">${HEAT_METRICS.map(([k, l]) => `<option value="${k}" ${st.metric === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
        <span class="count">${visible.length} of ${filtered.length} datacenters · under pressure first</span>
      </div>`;
      let body = '';
      if (st.mode === 'spark') {
        body = `<div class="cap-grid2" style="grid-template-columns:150px repeat(${pools.length}, minmax(150px, 1fr))"><div class="ch"></div>${pools.map((p) => `<div class="ch">${link('pool', p)}</div>`).join('')}
          ${visible.map((r) => `<div class="rh">${link('dc', r.dc)}<span class="note">${r.score ? r.reasons.slice(0, 2).map(([t, x]) => `<span style="color:var(--${t})">${esc(x)}</span>`).join('<br>') : 'healthy'}</span></div>${pools.map((p) => sparkCell(r.cells[POOLS.indexOf(p)])).join('')}`).join('')}</div>`;
      } else {
        body = `<div class="table-wrap"><table class="t heat"><thead><tr><th>Datacenter</th>${pools.map((p) => `<th>${esc(p)}</th>`).join('')}<th>Why it is listed here</th></tr></thead><tbody>${visible
          .map(
            (r) => `<tr><td>${link('dc', r.dc)}</td>${pools
              .map((p) => {
                const x = r.cells[POOLS.indexOf(p)];
                if (!x) return '<td><span class="faint">—</span></td>';
                const v = x[st.metric];
                return `<td><button class="heat-cell ${heatClass(st.metric, v)} ${st.pinned === x.dc + '/' + x.pool ? 'pinned' : ''}" data-cell="${esc(x.dc + '/' + x.pool)}" aria-label="${esc(x.dc + ' ' + x.pool)}">${v}${st.metric.endsWith('A') ? '<small>%</small>' : ''}</button></td>`;
              })
              .join('')}<td class="small">${r.reasons.map(([t, x]) => `<span style="color:var(--${t})">${esc(x)}</span>`).join(' · ') || '<span class="faint">healthy</span>'}</td></tr>`
          )
          .join('')}</tbody></table></div>
          <div class="legend" style="padding:6px 16px">${st.metric.endsWith('A') ? '<span><i class="h1"></i>&lt; 60%</span><span><i class="h2"></i>60–80%</span><span><i class="h3"></i>80–90%</span><span><i class="h4"></i>≥ 90%</span>' : '<span><i class="h0"></i>0</span><span><i class="h3"></i>1</span><span><i class="h4"></i>more</span>'}<span>Hover a cell for its sparklines; click to pin it below.</span></div>
          ${st.pinned ? (() => { const [d, p] = st.pinned.split('/'); const x = capInfo(d, p); return x ? cellDetail(x) : ''; })() : ''}`;
      }
      el.innerHTML = tools + body + (hidden ? `<div class="show-all"><button class="btn sm" data-showall="1">Show all: ${hidden} healthy datacenter${hidden === 1 ? '' : 's'} hidden</button></div>` : st.showAll ? `<div class="show-all"><button class="btn sm" data-showall="0">Hide the healthy datacenters</button></div>` : '');
    };
    el.addEventListener('change', (e) => {
      const f = e.target.dataset.f;
      if (f) {
        st[f] = e.target.value;
        render();
      }
    });
    el.addEventListener('click', (e) => {
      const m = e.target.closest('[data-mode]');
      if (m) {
        st.mode = m.dataset.mode;
        render();
      }
      const s = e.target.closest('[data-showall]');
      if (s) {
        st.showAll = s.dataset.showall === '1';
        render();
      }
      const h = e.target.closest('[data-cell]');
      if (h) {
        st.pinned = st.pinned === h.dataset.cell ? '' : h.dataset.cell;
        render();
      }
    });
    // Hover popover of the heat table: the sparklines live in the cell detail.
    const pop = document.createElement('div');
    pop.className = 'popover hidden';
    document.body.appendChild(pop);
    el.addEventListener('mouseover', (e) => {
      const h = e.target.closest('[data-cell]');
      if (!h) return;
      const [d, p] = h.dataset.cell.split('/');
      const x = capInfo(d, p);
      pop.innerHTML = `<b>${esc(d)} / ${esc(p)}</b> <span class="faint">${x.ready}/${x.nodes.length} ready</span>
        <div class="mini2">CPU ${x.cpuA}% ${spark([{ v: x.m.cpuAlloc, cls: 'a', area: true }, { v: x.m.cpuUsed, cls: 'u' }], { w: 160, h: 24, blocks: x.m.blockedCpu })}</div>
        <div class="mini2">Mem ${x.memA}% ${spark([{ v: x.m.memAlloc, cls: 'a', area: true }, { v: x.m.memUsed, cls: 'u' }], { w: 160, h: 24, blocks: x.m.blockedMem })}</div>
        ${x.reasons.map(([t, r]) => `<span class="chip ${t}">${esc(r)}</span>`).join(' ')}`;
      const r = h.getBoundingClientRect();
      pop.style.left = Math.min(window.innerWidth - 250, r.right + 8) + 'px';
      pop.style.top = Math.max(8, r.top - 10) + 'px';
      pop.classList.remove('hidden');
    });
    el.addEventListener('mouseout', (e) => {
      if (e.target.closest('[data-cell]')) pop.classList.add('hidden');
    });
    render();
  }

  // ------------------------------------------------------------ dashboard
  window.PAGES.dashboard = function () {
    const ready = D.nodes.filter((n) => n.status === 'ready').length;
    const leader = D.servers.find((s) => s.leader);
    const allocCounts = {};
    D.allocations.forEach((a) => (allocCounts[a.status] = (allocCounts[a.status] || 0) + 1));
    const failedLost = (allocCounts.failed || 0) + (allocCounts.lost || 0);
    const blockedEvals = D.evaluations.filter((e) => e.status === 'blocked');
    const runningDeps = D.deployments.filter((d) => d.status === 'running');
    const nodesReadySeries = Array.from({ length: 48 }, (_, i) => sum(Object.values(D.metrics.cells).map((m) => m.nodesReady[i])));
    const blockedEvalSeries = Array.from({ length: 48 }, (_, i) => sum(Object.values(D.metrics.cells).map((m) => m.blockedEvals[i])));
    const blockedCpu = sum(Object.values(D.metrics.cells).map((m) => last(m.blockedCpu)));
    const blockedMem = sum(Object.values(D.metrics.cells).map((m) => last(m.blockedMem)));

    const c = U.shell({
      nav: 'dashboard',
      title: 'Dashboard',
      pretitle: 'Overview',
      crumbs: [['Dashboard', '']],
      sub: `Region <b>eu</b> · ${D.datacenters.length} datacenters · ${D.nodes.length} clients · ${D.servers.length} servers · data at ${esc(U.fmt(D.now))}`,
      actions: `${U.rangeSelect('24h')}<a class="btn" href="region-map.html">${icon('map')}Region map</a>`,
    });

    const allocBar = (() => {
      const order = [['running', 'var(--ok-dot)'], ['pending', 'var(--info-dot)'], ['complete', 'var(--neutral-dot)'], ['failed', 'var(--danger-dot)'], ['lost', 'var(--warn-dot)']];
      const total = D.allocations.length;
      return `<div class="stackbar" style="width:180px">${order.map(([s, col]) => (allocCounts[s] ? `<span style="width:${(allocCounts[s] / total) * 100}%;background:${col}" title="${s}: ${allocCounts[s]}"></span>` : '')).join('')}</div>
        <div class="legend" style="margin-top:4px">${order.filter(([s]) => allocCounts[s]).map(([s, col]) => `<a href="allocations.html?status=${s}"><i style="background:${col}"></i>${s} ${allocCounts[s]}</a>`).join('')}</div>`;
    })();

    // Federation strip (kept from the current dashboard).
    const fed = card(
      '',
      `<div class="kpi-line" style="align-items:center">
        <div><span>Region</span><b><a href="servers.html">eu</a></b></div>
        <div><span>Leader</span><b>${link('server', leader.name)}</b></div>
        <div><span>Servers alive</span><b>${D.servers.filter((s) => s.status === 'alive').length} / ${D.servers.length}</b></div>
        <div><span>Clients ready</span><b><a href="nodes.html?status=ready">${ready}</a> / <a href="nodes.html">${D.nodes.length}</a></b></div>
        <div><span>Secret store</span><b>${chip('ok', D.region.seal, 'ok')}</b></div>
        <div><span>Last backup</span><b class="small" style="font-size:14px">${when(D.backups.last.time)}</b></div>
        <div><span>Allocations</span>${allocBar}</div>
      </div>`
    );

    const stat = (href, label, value, foot, sp, ic) =>
      `<a class="card stat" href="${href}"><div class="label">${icon(ic)}${label}</div><div class="value">${value}</div>${sp || ''}<div class="foot">${foot}</div></a>`;
    const tiles = `<div class="grid g6">
      ${stat('nodes.html', 'Clients ready', `${ready}<small> / ${D.nodes.length}</small>`, 'norca.cluster.nodes_ready, all pools', spark([{ v: nodesReadySeries, cls: 'a', area: true }], { w: 150, h: 26, max: D.nodes.length + 10, fluid: true }), 'cpu')}
      ${stat('datacenters.html', 'CPU allocated', `${clusterPct('cpuAlloc', 'cpu')}<small>%</small>`, `used ${clusterPct('cpuUsed', 'cpu')}% · cluster.cpu_*`, spark([{ v: clusterSeries('cpuAlloc', 'cpu'), cls: 'a', area: true }, { v: clusterSeries('cpuUsed', 'cpu'), cls: 'u' }], { w: 150, h: 26, fluid: true }), 'gauge')}
      ${stat('datacenters.html', 'Memory allocated', `${clusterPct('memAlloc', 'mem')}<small>%</small>`, `used ${clusterPct('memUsed', 'mem')}% · cluster.memory_*`, spark([{ v: clusterSeries('memAlloc', 'mem'), cls: 'a', area: true }, { v: clusterSeries('memUsed', 'mem'), cls: 'u' }], { w: 150, h: 26, fluid: true }), 'gauge')}
      ${stat('evaluations.html?status=blocked', 'Blocked demand', `${blockedEvals.length}<small> eval${blockedEvals.length === 1 ? '' : 's'}</small>`, `${mhz(blockedCpu)} · ${mb(blockedMem)} waiting`, spark([{ v: blockedEvalSeries, cls: 'bl' }], { w: 150, h: 26, max: 4, fluid: true, blocks: blockedEvalSeries }), 'evals')}
      ${stat('allocations.html?status=failed', 'Failed or lost allocations', `${failedLost}`, `${allocCounts.failed || 0} failed · ${allocCounts.lost || 0} lost`, '', 'allocs')}
      ${stat('deployments.html?status=running', 'Deployments in progress', `${runningDeps.length}`, runningDeps.map((d) => esc(U.depTitle(d))).join(', ') || 'none', '', 'deploy')}
    </div>`;

    const capCard = `<section class="card"><div class="card-h">${icon('gauge')}<h3>Capacity per datacenter and node pool</h3><span class="hint">allocated vs used, 24 h</span><div class="tools"><span class="legend"><span><i style="background:var(--c-alloc)"></i>allocated</span><span><i style="background:var(--c-used)"></i>used</span><span><i style="background:var(--c-blocked);opacity:.4"></i>blocked demand</span></span></div></div>
      <div id="cap"></div>
      <div class="card-f">Rows are datacenters, columns pools; the cells under pressure (blocked demand, 80% allocated or more, nodes not ready) come first and the healthy datacenters fold away. From the metrics store, family 3: norca.cluster.{cpu,memory}_{allocated,used}, nodes_ready, blocked_* by dc and pool. Down, draining and ineligible counts per cell need family 6 ${U.planned(6)}.</div></section>`;

    const ap = D.metrics.autopilot;
    const st = D.metrics.store;
    const maxLag = Math.max(...D.servers.map((s) => s.raft.commitIndex - s.raft.appliedIndex));
    const cp = card(
      'Control plane',
      `${kv([
        ['Autopilot', chip('', 'healthy', 'ok') + ` <span class="faint small">${D.servers.filter((s) => s.healthy).length} of ${D.servers.length} servers</span>`],
        ['Failure tolerance', `<b>${D.servers.length >= 5 ? 2 : 1}</b> servers ${spark([{ v: ap.failureTolerance.map(() => (D.servers.length >= 5 ? 2 : 1)), cls: 'a' }], { w: 90, h: 16, max: 3 })}`],
        ['Leader', `${link('server', leader.name)} <span class="faint">term ${leader.raft.term}</span>`],
        ['Raft', `commit index <span class="mono">${leader.raft.commitIndex}</span>${maxLag ? ` · max lag ${chip('', maxLag + ' entries', maxLag > 20 ? 'warn' : 'neutral')}` : ''}`],
        ['Scheduler', `broker 3 ready · 0 unacked · plan queue 0 <span class="faint small">(live, /v1/metrics)</span> ${U.planned(5)}`],
        ['Metrics store', `${st.series} series · retention ${st.retention} · ${D.metrics.servers.some((x) => x.retention !== st.retention) ? chip('', 'retention differs', 'warn') : ''}`],
      ])}
      <table class="t compact" style="margin-top:10px"><thead><tr><th>Server</th><th>Health</th><th>Last contact</th><th>Lag</th></tr></thead>${D.servers
        .map((s) => `<tr><td>${link('server', s.name)}${s.leader ? ' <span class="chip info nodot">leader</span>' : ''}</td><td>${chip('', s.healthy ? 'healthy' : 'unhealthy', s.healthy ? 'ok' : 'danger')}</td><td class="small ${s.lastContactMs > 100 ? 'warn-t' : ''}">${s.leader ? '—' : s.lastContactMs + ' ms'}</td><td class="mono small">${s.raft.commitIndex - s.raft.appliedIndex}</td></tr>`)
        .join('')}</table>`,
      { icon: 'server', hint: 'autopilot health, Raft', foot: '<a href="servers.html">Regions and servers</a> · <a href="metrics.html">Metrics store</a>' }
    );

    const ops = U.operations();
    const warns = U.warnings();
    const opsCard = card('Operations in progress', itemsList(ops, { empty: 'Nothing in progress' }), { icon: 'activity', flush: true, hint: ops.length + ' running', foot: 'Deployments, node drains, node scaling (replacements, joins, scale-ups), release upgrades, restores awaiting approval.' });
    const warnCard = card('Warnings', itemsList(warns, { empty: 'No warnings' }), { icon: 'alert', flush: true, hint: `${warns.filter((w) => w.tone === 'danger').length} failing · ${warns.filter((w) => w.tone === 'warn').length} warnings`, foot: 'Conditions are coloured by meaning: RollBlocked, ForeignNode… True is a warning; Provisioned, Ready, Available False is a failure.' });

    const quotas = D.quotas
      .map((q) => ({ q, m: pct(q.used.mem, q.limits.mem), c: pct(q.used.cpu, q.limits.cpu) }))
      .sort((a, b) => Math.max(b.m, b.c) - Math.max(a.m, a.c));
    const quotaCard = card(
      'Quota pressure',
      table(
        [
          { h: 'Quota', f: (r) => link('quota', r.q.name) + `<div class="note">${r.q.namespaces.map((n) => link('ns', n)).join(', ')}</div>` },
          { h: 'CPU', f: (r) => `${meter(r.q.used.cpu, r.q.limits.cpu)}<span class="small muted">${r.c}%</span>` },
          { h: 'Memory', f: (r) => `${meter(r.q.used.mem, r.q.limits.mem)}<span class="small muted">${r.m}%</span>` },
          { h: '7 days', f: (r) => spark([{ v: D.metrics.quotas[r.q.name].mem, cls: 'a', area: true }], { w: 110, h: 22 }) },
        ],
        quotas,
        { cls: 'compact' }
      ),
      { icon: 'gauge', flush: true, hint: 'norca.quota.* (family 4)' }
    );

    const evs = D.events.slice().reverse().slice(0, 8);
    const eventsCard = card(
      'Latest events',
      `<ul class="items">${evs.map((e) => `<li><span class="dot ${e.level === 'danger' ? 'danger' : e.level === 'warn' ? 'warn' : e.level === 'ok' ? 'ok' : 'info'}"></span><div class="what"><div>${U.eventLine(e)}</div><div class="t2"><span class="tag">${esc(e.topic)}</span> <span class="mono small">${esc(e.type)}</span></div></div><span class="when">${when(e.time)}</span></li>`).join('')}</ul>`,
      { icon: 'activity', flush: true, tools: '<a href="activity.html">All activity →</a>' }
    );

    c.innerHTML = `<div class="stack">
      ${fed}
      ${tiles}
      <div class="with-rail">${capCard}${cp}</div>
      <div class="grid g2">${opsCard}${warnCard}</div>
      <div class="grid g2">${quotaCard}${eventsCard}</div>
    </div>`;
    capacityBlock(document.getElementById('cap'));
  };

  // ------------------------------------------------------------ region map
  /** Pan and zoom by the viewBox: wheel, drag, and the + / − / fit buttons. */
  function panZoom(svg, fit) {
    let vb = fit.slice();
    let drag = null;
    let moved = false;
    const apply = () => svg.setAttribute('viewBox', vb.map((v) => v.toFixed(1)).join(' '));
    const zoom = (f, cx, cy) => {
      const w = Math.min(fit[2] * 2, Math.max(fit[2] / 8, vb[2] * f));
      const h = (w / vb[2]) * vb[3];
      cx = cx == null ? vb[0] + vb[2] / 2 : cx;
      cy = cy == null ? vb[1] + vb[3] / 2 : cy;
      vb = [cx - ((cx - vb[0]) * w) / vb[2], cy - ((cy - vb[1]) * h) / vb[3], w, h];
      apply();
    };
    const toSvg = (e) => {
      const r = svg.getBoundingClientRect();
      return [vb[0] + ((e.clientX - r.left) / r.width) * vb[2], vb[1] + ((e.clientY - r.top) / r.height) * vb[3]];
    };
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [x, y] = toSvg(e);
      zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, x, y);
    }, { passive: false });
    svg.addEventListener('mousedown', (e) => {
      drag = { x: e.clientX, y: e.clientY, vb: vb.slice() };
      moved = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      const r = svg.getBoundingClientRect();
      const dx = ((e.clientX - drag.x) / r.width) * vb[2];
      const dy = ((e.clientY - drag.y) / r.height) * vb[3];
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) moved = true;
      if (moved) {
        vb = [drag.vb[0] - dx, drag.vb[1] - dy, vb[2], vb[3]];
        apply();
      }
    });
    window.addEventListener('mouseup', () => (drag = null));
    // A drag must not follow the link it started on.
    svg.addEventListener('click', (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    }, true);
    apply();
    return {
      zoomIn: () => zoom(1 / 1.3),
      zoomOut: () => zoom(1.3),
      reset: () => {
        vb = fit.slice();
        apply();
      },
      focus: (x, y, w) => {
        const h = (w / fit[2]) * fit[3];
        vb = [x - w / 2, y - h / 2, w, h];
        apply();
      },
    };
  }

  window.PAGES.regionmap = function () {
    const st = {
      dc: params.get('dc') || '',
      pool: params.get('pool') || '',
      node: params.get('node') || '',
      view: params.get('view') === 'list' ? 'list' : 'map',
      states: new Set(STATES.map((s) => s[0])),
    };
    if (st.node && U.IX.node.get(st.node)) {
      const n = U.IX.node.get(st.node);
      st.dc = n.dc;
      st.pool = n.pool;
    }
    const c = U.shell({
      nav: 'regionmap',
      title: 'Region map',
      pretitle: 'Overview',
      crumbs: [['Region map', '']],
      sub: 'Levels of detail: the region shows datacenters with aggregates only; click a datacenter for its pools, a pool for its nodes. Large pools draw a state mosaic and only the nodes that need attention one by one.',
    });
    const allCounts = countStates(D.nodes, D.nodeGroups.flatMap((g) => (g.status.nodes || []).filter((r) => r.state === 'creating')));
    c.innerHTML = `<div class="stack"><div class="map-wrap">
      <section class="card">
        <div class="card-h">${icon('map')}<h3 id="map-crumbs"></h3>
          <div class="tools">
            <span class="map-search">${icon('search')}<input id="map-find" list="map-nodes" placeholder="Find a node (name or ID)" aria-label="Find a node"></span>
            <datalist id="map-nodes">${D.nodes.map((n) => `<option value="${esc(n.name)}">`).join('')}</datalist>
            <span class="seg"><button class="btn sm" data-view="map">Map</button><button class="btn sm" data-view="list">List</button></span>
            <span class="seg" id="zoom-btns"><button class="btn sm" data-zoom="in" title="Zoom in">+</button><button class="btn sm" data-zoom="out" title="Zoom out">−</button><button class="btn sm" data-zoom="fit" title="Fit">fit</button></span>
          </div></div>
        <div class="map-filters">${STATES.map(([id, label, , col]) => `<label class="toggle"><input type="checkbox" data-state="${id}" checked><i style="background:${col}"></i>${esc(label)} <span class="faint">${allCounts[id] || 0}</span></label>`).join('')}</div>
        <div class="map-canvas" id="map"></div>
        <div id="map-list" class="hidden"></div>
        <div class="card-f">Aggregates at the region and datacenter levels (ready nodes, allocated CPU and memory, blocked demand) come from the cluster gauges, family 3. Counts of down, draining and ineligible nodes per datacenter need family 6 ${U.planned(6)}; until then they come from the node stub list. The nodes of a datacenter or pool are drawn from the node list, which the page loads only when you drill down. Wheel to zoom, drag to pan.</div>
      </section>
      <section class="card side-panel" id="side"></section>
    </div>
    <div class="grid g2">${card('Operations in progress', itemsList(U.operations()), { icon: 'activity', flush: true })}${card('Warnings', itemsList(U.warnings()), { icon: 'alert', flush: true })}</div></div>`;

    const mapEl = document.getElementById('map');
    const listEl = document.getElementById('map-list');
    const side = document.getElementById('side');
    let pz = null;
    const sync = () => {
      try {
        const p = new URLSearchParams();
        if (st.dc) p.set('dc', st.dc);
        if (st.pool) p.set('pool', st.pool);
        if (st.node) p.set('node', st.node);
        if (st.view === 'list') p.set('view', 'list');
        history.replaceState(null, '', p.toString() ? '?' + p.toString() : location.pathname);
      } catch (e) {
        /* file:// may refuse */
      }
    };
    const shown = (s) => st.states.has(s);
    const heatCol = (v) => (v >= 90 ? 'var(--danger-dot)' : v >= 80 ? 'var(--warn-dot)' : v >= 60 ? '#c9b23a' : 'var(--ok-dot)');
    const opsOfDc = (dc) => {
      const nodes = D.nodes.filter((n) => n.dc === dc);
      const deps = new Set(D.allocations.filter((a) => a.deployment && (U.IX.node.get(a.node) || {}).dc === dc && (U.IX.deployment.get(a.deployment) || {}).status === 'running').map((a) => a.deployment));
      return {
        drains: nodes.filter((n) => n.drain).length,
        replacing: nodes.filter((n) => nodeState(n) === 'replacing').length,
        joining: D.nodeGroups.filter((g) => g.spec.datacenter === dc).reduce((s, g) => s + (g.status.nodes || []).filter((r) => r.state === 'creating').length, 0),
        deployments: deps.size,
        blocked: POOLS.reduce((s, p) => s + ((D.metrics.cells[dc + '/' + p] && last(D.metrics.cells[dc + '/' + p].blockedEvals)) || 0), 0),
      };
    };
    const opsText = (o) =>
      [o.blocked && `${o.blocked} blocked`, o.drains && `${o.drains} draining`, o.replacing && `${o.replacing} replacing`, o.joining && `${o.joining} joining`, o.deployments && `${o.deployments} deployment${o.deployments > 1 ? 's' : ''}`].filter(Boolean).join(' · ') || 'nothing in progress';
    const stateBar = (counts, x, y, w, h) => {
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      let cx = x;
      return STATES.map(([id, label, , col]) => {
        const v = counts[id] || 0;
        if (!v) return '';
        const ww = (v / total) * w;
        const r = `<rect x="${cx}" y="${y}" width="${Math.max(ww, 2)}" height="${h}" fill="${col}" opacity="${shown(id) ? 1 : 0.15}"><title>${v} ${label}</title></rect>`;
        cx += ww;
        return r;
      }).join('');
    };
    const crumbs = () => {
      const parts = [`<a href="#" data-go="region">Region eu</a>`];
      if (st.dc) parts.push(`<a href="#" data-go="dc">${esc(st.dc)}</a>`);
      if (st.pool) parts.push(`<span>${esc(st.pool)}</span>`);
      document.getElementById('map-crumbs').innerHTML = parts.join(' <span class="faint">›</span> ');
    };

    // --- region level: datacenter boxes with aggregates, wrapping in rows
    function regionSvg() {
      const W = 1200;
      const cols = 4;
      const gap = 16;
      const bw = (W - gap * (cols + 1)) / cols;
      const bh = 214;
      const top = 70;
      const leader = D.servers.find((s) => s.leader);
      let s = `<g data-act="servers" style="cursor:pointer"><circle class="region-c" cx="40" cy="34" r="24"/><text x="40" y="39" text-anchor="middle" font-size="15" font-weight="700">eu</text>
        <text x="76" y="28" font-size="14" font-weight="600">★ ${esc(leader.name)} <tspan class="faint-t" font-weight="400">leader in ${esc(leader.dc)}</tspan></text>
        <text x="76" y="46" font-size="12" class="muted-t">${D.servers.length} servers · ${D.servers.filter((x) => x.healthy).length} healthy · failure tolerance ${D.servers.length >= 5 ? 2 : 1} · click for details</text></g>`;
      s += `<text x="${W - 16}" y="30" text-anchor="end" font-size="12" class="muted-t">${D.datacenters.length} datacenters · ${D.nodes.length} clients</text>`;
      DCS.forEach((dc, i) => {
        const x0 = gap + (i % cols) * (bw + gap);
        const y0 = top + Math.floor(i / cols) * (bh + gap);
        const nodes = D.nodes.filter((n) => n.dc === dc);
        const joining = POOLS.flatMap((p) => joiningOf(dc, p));
        const counts = countStates(nodes, joining);
        const matching = nodes.filter((n) => shown(nodeState(n))).length + (shown('joining') ? joining.length : 0);
        const allOn = st.states.size === STATES.length;
        const srv = D.servers.filter((x) => x.dc === dc);
        const o = opsOfDc(dc);
        const hasHl = st.node && nodes.some((n) => n.id === st.node);
        const notReady = STATES.filter(([id]) => id !== 'ready' && counts[id]).map(([id, l]) => `${counts[id]} ${l}`);
        s += `<g data-dc="${esc(dc)}" class="dc-g ${!allOn && !matching ? 'dim' : ''}" style="cursor:pointer"><title>${esc(dc)}: open its pools</title>
          <rect class="dc-box ${hasHl ? 'hl-box' : ''}" x="${x0}" y="${y0}" width="${bw}" height="${bh}" rx="10"/>
          <text x="${x0 + 14}" y="${y0 + 24}" font-size="15" font-weight="700">${esc(dc)}</text>
          <text x="${x0 + bw - 14}" y="${y0 + 24}" text-anchor="end" font-size="11" class="muted-t">${srv.map((x) => (x.leader ? '★ ' : '') + x.name).join(', ')}</text>
          <text x="${x0 + 14}" y="${y0 + 42}" font-size="11.5" class="muted-t">${nodes.length} nodes · ${nodes.filter((n) => n.status === 'ready').length} ready${!allOn ? ` · ${matching} match the filter` : ''}</text>
          ${stateBar(counts, x0 + 14, y0 + 52, bw - 28, 10)}
          <text x="${x0 + 14}" y="${y0 + 78}" font-size="10.5" fill="${counts.down ? 'var(--danger)' : 'var(--muted)'}">${esc(notReady.slice(0, 3).join(' · ') || 'all ready')}</text>`;
        POOLS.forEach((p, k) => {
          const x = capInfo(dc, p);
          const y = y0 + 92 + k * 28;
          s += `<text x="${x0 + 14}" y="${y + 13}" font-size="12">${esc(p)}</text>`;
          if (!x) {
            s += `<text x="${x0 + 90}" y="${y + 13}" font-size="11" class="faint-t">no nodes</text>`;
            return;
          }
          s += `<text x="${x0 + 90}" y="${y + 13}" font-size="11" class="muted-t">${x.nodes.length}</text>
            <rect class="heat" x="${x0 + 124}" y="${y}" width="54" height="18" rx="4" fill="${heatCol(x.cpuA)}" opacity=".85"/><text x="${x0 + 151}" y="${y + 13}" text-anchor="middle" font-size="11" fill="#fff" font-weight="600">cpu ${x.cpuA}</text>
            <rect class="heat" x="${x0 + 182}" y="${y}" width="58" height="18" rx="4" fill="${heatCol(x.memA)}" opacity=".85"/><text x="${x0 + 211}" y="${y + 13}" text-anchor="middle" font-size="11" fill="#fff" font-weight="600">mem ${x.memA}</text>
            ${x.blocked ? `<g class="ov-blocked"><circle class="blocked-mark" cx="${x0 + bw - 22}" cy="${y + 9}" r="8"/><text x="${x0 + bw - 22}" y="${y + 13}" text-anchor="middle" class="op-badge" font-size="11">!</text><title>${x.blocked} blocked evaluation</title></g>` : ''}`;
        });
        s += `<text x="${x0 + 14}" y="${y0 + bh - 14}" font-size="11" fill="${o.blocked ? 'var(--danger)' : o.drains || o.replacing || o.joining || o.deployments ? 'var(--info)' : 'var(--faint)'}">${esc(opsText(o))}</text></g>`;
      });
      const H = top + Math.ceil(DCS.length / cols) * (bh + gap) + 4;
      return [s, [0, 0, W, H]];
    }

    // --- datacenter level: its pools with a state mosaic each
    function dcSvg(dc) {
      const W = 1200;
      const gap = 16;
      const cols = POOLS.length;
      const bw = (W - gap * (cols + 1)) / cols;
      const sq = 14;
      const sg = 3;
      const per = Math.floor((bw - 24) / (sq + sg));
      let s = '';
      let H = 0;
      const srv = D.servers.filter((x) => x.dc === dc);
      s += `<text x="16" y="26" font-size="16" font-weight="700">${esc(dc)}</text><text x="16" y="44" font-size="12" class="muted-t">${esc((U.IX.dc.get(dc) || {}).location || '')} · servers: ${srv.length ? srv.map((x) => (x.leader ? '★ ' : '') + x.name).join(', ') : 'none'} · ${esc(opsText(opsOfDc(dc)))}</text>`;
      POOLS.forEach((p, k) => {
        const x0 = gap + k * (bw + gap);
        const y0 = 60;
        const nodes = cellNodes(dc, p).slice().sort((a, b) => a.name.localeCompare(b.name));
        const joining = joiningOf(dc, p);
        const x = capInfo(dc, p);
        const n = nodes.length + joining.length;
        const rows = Math.max(1, Math.ceil(n / per));
        const bh = 96 + rows * (sq + sg) + 24;
        H = Math.max(H, y0 + bh + 10);
        const counts = countStates(nodes, joining);
        s += `<g data-pool="${esc(p)}" style="cursor:pointer"><title>${esc(p)} in ${esc(dc)}: open its nodes</title>
          <rect class="pool-box" x="${x0}" y="${y0}" width="${bw}" height="${bh}" rx="8"/>
          <text x="${x0 + 12}" y="${y0 + 22}" font-size="14" font-weight="600">${esc(p)}</text>
          <text x="${x0 + 12}" y="${y0 + 39}" font-size="11" class="muted-t">${x ? `${x.ready} of ${nodes.length} ready · cpu ${x.cpuA}% · mem ${x.memA}%` : 'no nodes'}</text>
          <text x="${x0 + 12}" y="${y0 + 55}" font-size="11" class="muted-t">${x && x.g ? 'node group ' + esc(x.g.name) : 'run by hand'}${x && x.blocked ? ' · ' : ''}${x && x.blocked ? `<tspan fill="var(--danger)">${x.blocked} blocked eval</tspan>` : ''}</text>
          ${stateBar(counts, x0 + 12, y0 + 64, bw - 24, 8)}</g>`;
        let i = 0;
        const place = () => {
          const cx = x0 + 12 + (i % per) * (sq + sg);
          const cy = y0 + 84 + Math.floor(i / per) * (sq + sg);
          i++;
          return [cx, cy];
        };
        nodes.forEach((nd) => {
          const [cx, cy] = place();
          const stt = nodeState(nd);
          s += `<a href="node.html?id=${enc(nd.id)}" class="${shown(stt) ? '' : 'dim'}"><title>${esc(nd.name)} · ${esc(STATE[stt][1])}</title><rect class="sq ${STATE[stt][2]} ${nd.id === st.node ? 'hl' : ''}" x="${cx}" y="${cy}" width="${sq}" height="${sq}" rx="2"/></a>`;
        });
        joining.forEach((r) => {
          const [cx, cy] = place();
          s += `<a href="node-group.html?id=${enc(r.group)}" class="${shown('joining') ? '' : 'dim'}"><title>instance ${esc(r.instance)} joining</title><rect class="sq st-join" x="${cx}" y="${cy}" width="${sq}" height="${sq}" rx="2"/></a>`;
        });
        s += `<text x="${x0 + 12}" y="${y0 + bh - 9}" font-size="11" fill="var(--primary)" data-pool="${esc(p)}" style="cursor:pointer">open ${esc(p)} →</text>`;
      });
      return [s, [0, 0, W, Math.max(H, 220)]];
    }

    // --- pool level: every node when the pool is small; at scale the nodes that need attention plus a mosaic
    function nodeTile(nd, x, y, w, h) {
      const stt = nodeState(nd);
      const sc = U.scalingOf(nd);
      const allocs = U.allocsOfNode(nd.id);
      const runningDeps = new Set(D.deployments.filter((d) => d.status === 'running').map((d) => d.id));
      const badge = { down: ['DOWN', 'danger'], draining: ['DRAIN', 'info'], replacing: ['SURGE', 'purple'], foreign: ['FOREIGN', 'danger'], outdated: ['OUTDATED', 'warn'], initializing: ['INIT', 'info'] }[stt];
      const allocClass = (a) => ({ running: 'st-ok', pending: 'st-info', complete: 'st-neutral', failed: 'st-down', lost: 'st-down' })[a.status] || 'st-neutral';
      if (stt === 'replacing' && sc && sc.rep && sc.rep.phase === 'draining') badge[0] = 'DRAIN';
      return `<a href="node.html?id=${enc(nd.id)}" class="${shown(stt) ? '' : 'dim'}"><title>${esc(nd.name)} · ${esc(STATE[stt][1])} · ${allocs.length} allocations</title>
        <rect class="node-r ${nd.id === st.node ? 'hl' : ''}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>
        <rect class="${STATE[stt][2]}" x="${x}" y="${y}" width="4" height="${h}" rx="2"/>
        <text x="${x + 10}" y="${y + 16}" font-size="11" font-weight="600">${esc(nd.name.replace(/^eu-dc\d-/, ''))}</text>
        <text x="${x + 10}" y="${y + 29}" font-size="9.5" class="faint-t">${esc(nd.class)} · ${esc(STATE[stt][1])}</text>
        <g class="ov-allocs">${allocs.slice(0, 9).map((a, j) => `<circle class="${allocClass(a)}" cx="${x + 12 + j * 9}" cy="${y + 46}" r="3.5"/>${a.deployment && runningDeps.has(a.deployment) ? `<circle cx="${x + 12 + j * 9}" cy="${y + 46}" r="6" fill="none" stroke="var(--info-dot)" stroke-width="1.5"/>` : ''}`).join('')}</g>
        ${badge ? `<rect class="op-bg-${badge[1]}" x="${x + w - 52}" y="${y - 7}" width="50" height="13" rx="6.5"/><text class="op-badge" x="${x + w - 27}" y="${y + 3}" text-anchor="middle">${badge[0]}</text>` : ''}</a>`;
    }
    function joinTile(r, x, y, w, h) {
      return `<a href="node-group.html?id=${enc(r.group)}" class="${shown('joining') ? '' : 'dim'}"><title>Instance ${esc(r.instance)} of ${esc(r.group)} is joining (request #${r.request})</title>
        <rect class="joining" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>
        <text x="${x + 8}" y="${y + 18}" font-size="10" class="muted-t">${esc(r.instance)}</text>
        <text x="${x + 8}" y="${y + 34}" font-size="10" fill="var(--info)">joining ${esc(U.ago(r.created).replace(' ago', ''))}</text>
        <rect class="op-bg-info" x="${x + w - 44}" y="${y - 7}" width="42" height="13" rx="6.5"/><text class="op-badge" x="${x + w - 23}" y="${y + 3}" text-anchor="middle">NEW</text></a>`;
    }
    function poolSvg(dc, pool) {
      const W = 1200;
      const nodes = cellNodes(dc, pool).slice().sort((a, b) => a.name.localeCompare(b.name));
      const joining = joiningOf(dc, pool);
      const x = capInfo(dc, pool);
      const tw = 108;
      const th = 62;
      const tg = 10;
      const per = Math.floor((W - 32 + tg) / (tw + tg));
      let s = `<text x="16" y="26" font-size="16" font-weight="700">${esc(pool)} in ${esc(dc)}</text>
        <text x="16" y="44" font-size="12" class="muted-t">${nodes.length} nodes${x ? ` · ${x.ready} ready · cpu ${x.cpuA}% · mem ${x.memA}%` : ''}${x && x.g ? ' · node group ' + esc(x.g.name) : ''}</text>`;
      let y = 64;
      const tiles = (list, drawJoin) => {
        let k = 0;
        list.forEach((nd) => {
          s += nodeTile(nd, 16 + (k % per) * (tw + tg), y + Math.floor(k / per) * (th + tg + 4), tw, th);
          k++;
        });
        drawJoin.forEach((r) => {
          s += joinTile(r, 16 + (k % per) * (tw + tg), y + Math.floor(k / per) * (th + tg + 4), tw, th);
          k++;
        });
        y += Math.max(1, Math.ceil(k / per)) * (th + tg + 4) + 8;
      };
      if (nodes.length <= 40) {
        tiles(nodes, joining);
      } else {
        const hot = nodes.filter((n) => STATE[nodeState(n)][4]);
        s += `<text x="16" y="${y}" font-size="12.5" font-weight="600">Need attention: ${hot.length + joining.length}</text>`;
        y += 14;
        tiles(hot, joining);
        s += `<text x="16" y="${y + 6}" font-size="12.5" font-weight="600">All ${nodes.length} nodes</text>`;
        y += 18;
        const sq = 18;
        const sg = 4;
        const per2 = Math.floor((W - 32 + sg) / (sq + sg));
        nodes.forEach((nd, i) => {
          const stt = nodeState(nd);
          s += `<a href="node.html?id=${enc(nd.id)}" class="${shown(stt) ? '' : 'dim'}"><title>${esc(nd.name)} · ${esc(STATE[stt][1])}</title><rect class="sq ${STATE[stt][2]} ${nd.id === st.node ? 'hl' : ''}" x="${16 + (i % per2) * (sq + sg)}" y="${y + Math.floor(i / per2) * (sq + sg)}" width="${sq}" height="${sq}" rx="3"/></a>`;
        });
        y += Math.ceil(nodes.length / per2) * (sq + sg) + 10;
      }
      return [s, [0, 0, W, Math.max(y + 8, 200)]];
    }

    // --- list fallback
    function listHtml() {
      if (!st.dc) {
        return table(
          [
            { h: 'Datacenter', f: (dc) => `<a href="#" data-dc-go="${esc(dc)}">${esc(dc)}</a> ${link('dc', dc, { label: '(page)' })}` },
            { h: 'Nodes', f: (dc) => D.nodes.filter((n) => n.dc === dc).length, cls: 'right' },
            { h: 'States', f: (dc) => { const cnt = countStates(D.nodes.filter((n) => n.dc === dc), []); return STATES.filter(([id]) => cnt[id]).map(([id, l]) => `${cnt[id]} ${l}`).join(' · '); } },
            ...POOLS.map((p) => ({ h: p + ' cpu/mem', f: (dc) => { const x = capInfo(dc, p); return x ? `${x.cpuA}% / ${x.memA}%${x.blocked ? ' ' + chip('', 'blocked', 'danger') : ''}` : '—'; } })),
            { h: 'In progress', f: (dc) => esc(opsText(opsOfDc(dc))) },
          ],
          DCS,
          { cls: 'compact' }
        );
      }
      if (!st.pool) {
        return table(
          [
            { h: 'Pool', f: (p) => `<a href="#" data-pool-go="${esc(p)}">${esc(p)}</a>` },
            { h: 'Nodes', f: (p) => cellNodes(st.dc, p).length, cls: 'right' },
            { h: 'Ready', f: (p) => { const x = capInfo(st.dc, p); return x ? x.ready : 0; }, cls: 'right' },
            { h: 'CPU / memory allocated', f: (p) => { const x = capInfo(st.dc, p); return x ? `${x.cpuA}% / ${x.memA}%` : '—'; } },
            { h: 'Node group', f: (p) => { const g = cellGroup(st.dc, p); return g ? link('nodegroup', g.name) + ' ' + U.health(g.status.conditions) : '—'; } },
          ],
          POOLS,
          { cls: 'compact' }
        );
      }
      const nodes = cellNodes(st.dc, st.pool).filter((n) => shown(nodeState(n)));
      return table(
        [
          { h: 'Node', f: (n) => link('node', n.id) },
          { h: 'State', f: (n) => `<span class="chip nodot" style="background:${STATE[nodeState(n)][3]};color:#fff">${esc(STATE[nodeState(n)][1])}</span>` },
          { h: 'Class', f: (n) => esc(n.class) },
          { h: 'Allocations', f: (n) => U.allocsOfNode(n.id).length, cls: 'right' },
        ],
        nodes,
        { cls: 'compact', empty: 'No node matches the state filter' }
      );
    }

    // --- side panel
    function sideRegion() {
      const leader = D.servers.find((s) => s.leader);
      side.innerHTML = `<div class="card-h">${icon('server')}<h3>Region eu</h3></div><div class="card-b">${kv([
        ['Leader', `${link('server', leader.name)} in ${link('dc', leader.dc)}`],
        ['Servers', `${D.servers.length} · ${D.servers.filter((s) => s.healthy).length} healthy · failure tolerance ${D.servers.length >= 5 ? 2 : 1}`],
        ['Clients', `${D.nodes.length} in ${DCS.length} datacenters`],
      ])}</div><div class="card-b flush">${table(
        [
          { h: 'Server', f: (s) => link('server', s.name) + (s.leader ? ' ★' : '') },
          { h: 'DC', f: (s) => link('dc', s.dc) },
          { h: 'Last contact', f: (s) => (s.leader ? '—' : `<span class="${s.lastContactMs > 100 ? 'warn-t' : ''}">${s.lastContactMs} ms</span>`) },
          { h: 'Health', f: (s) => chip('', s.healthy ? 'healthy' : 'unhealthy', s.healthy ? 'ok' : 'danger') },
        ],
        D.servers,
        { cls: 'compact' }
      )}</div><div class="card-f"><a href="servers.html">Regions and servers →</a></div>`;
    }
    function sideDc(dc) {
      const nodes = D.nodes.filter((n) => n.dc === dc);
      const cnt = countStates(nodes, POOLS.flatMap((p) => joiningOf(dc, p)));
      const hot = nodes.filter((n) => STATE[nodeState(n)][4]);
      side.innerHTML = `<div class="card-h">${icon('building')}<h3>${esc(dc)}</h3></div><div class="card-b">${kv([
        ['Datacenter', link('dc', dc, { label: dc + ' (page)' })],
        ['Servers', D.servers.filter((s) => s.dc === dc).map((s) => link('server', s.name) + (s.leader ? ' ★' : '')).join(', ') || 'none'],
        ['Nodes', `${nodes.length}: ${STATES.filter(([id]) => cnt[id]).map(([id, l]) => `${cnt[id]} ${l}`).join(', ')}`],
        ['Node groups', D.nodeGroups.filter((g) => g.spec.datacenter === dc).map((g) => link('nodegroup', g.name) + ' ' + U.health(g.status.conditions)).join('<br>') || 'none'],
        ['In progress', esc(opsText(opsOfDc(dc)))],
      ])}</div>${hot.length ? `<div class="card-b flush">${table([{ h: 'Needs attention', f: (n) => link('node', n.id) }, { h: 'State', f: (n) => esc(STATE[nodeState(n)][1]) }, { h: 'Pool', f: (n) => esc(n.pool) }], hot, { cls: 'compact' })}</div>` : ''}<div class="card-f"><a href="nodes.html?dc=${enc(dc)}">Clients in ${esc(dc)} →</a></div>`;
    }
    function sidePool(dc, pool) {
      const g = cellGroup(dc, pool);
      const m = D.metrics.cells[dc + '/' + pool];
      const nodes = cellNodes(dc, pool);
      const hot = nodes.filter((n) => STATE[nodeState(n)][4]);
      const sel = st.node ? U.IX.node.get(st.node) : null;
      side.innerHTML = `${sel ? `<div class="card-h">${icon('cpu')}<h3>${link('node', sel.id)}</h3></div><div class="card-b">${kv([['State', esc(STATE[nodeState(sel)][1])], ['Address', `<span class="mono">${esc(sel.address)}</span>`], ['Allocations', `<a href="allocations.html?node=${enc(sel.name)}">${U.allocsOfNode(sel.id).length}</a>`]])}</div>` : ''}
        <div class="card-h">${icon('layers')}<h3>${esc(pool)} in ${esc(dc)}</h3></div>
        <div class="card-b">
          ${kv([
            ['Node group', g ? `${link('nodegroup', g.name)} ${U.health(g.status.conditions)}` : '<span class="faint">none: nodes run by hand</span>'],
            ['Provider', g ? link('provider', g.spec.provider) + ' <span class="faint">/ ' + esc(g.spec.group) + '</span>' : ''],
            ['Nodes', `${nodes.length}, ${hot.length} need attention`],
          ])}
          ${m ? `<div style="margin-top:12px" class="small muted">CPU allocated vs used, 24 h</div>${spark([{ v: m.cpuAlloc, cls: 'a', area: true }, { v: m.cpuUsed, cls: 'u' }], { w: 280, h: 40, fluid: true, blocks: m.blockedCpu })}
          <div class="small muted" style="margin-top:6px">Memory allocated vs used</div>${spark([{ v: m.memAlloc, cls: 'a', area: true }, { v: m.memUsed, cls: 'u' }], { w: 280, h: 40, fluid: true, blocks: m.blockedMem })}` : ''}
        </div>
        ${hot.length ? `<div class="card-b flush">${table([{ h: 'Needs attention', f: (n) => link('node', n.id) }, { h: 'State', f: (n) => esc(STATE[nodeState(n)][1]) }], hot, { cls: 'compact' })}</div>` : ''}
        <div class="card-f"><a href="nodes.html?dc=${enc(dc)}&pool=${enc(pool)}">Open these clients as a list →</a></div>`;
    }

    function render() {
      crumbs();
      c.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === st.view));
      document.getElementById('zoom-btns').classList.toggle('hidden', st.view === 'list');
      mapEl.classList.toggle('hidden', st.view === 'list');
      listEl.classList.toggle('hidden', st.view !== 'list');
      if (st.view === 'list') listEl.innerHTML = listHtml();
      const [inner, fit] = !st.dc ? regionSvg() : !st.pool ? dcSvg(st.dc) : poolSvg(st.dc, st.pool);
      mapEl.innerHTML = `<svg viewBox="${fit.join(' ')}" role="img" aria-label="Region map">${inner}</svg>`;
      pz = panZoom(mapEl.querySelector('svg'), fit);
      if (!st.dc) sideRegion();
      else if (!st.pool) sideDc(st.dc);
      else sidePool(st.dc, st.pool);
      sync();
    }

    mapEl.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (e.target.closest('[data-act="servers"]')) {
        sideRegion();
        return;
      }
      const d = e.target.closest('[data-dc]');
      if (d) {
        st.dc = d.dataset.dc;
        st.pool = '';
        render();
        return;
      }
      const p = e.target.closest('[data-pool]');
      if (p) {
        st.pool = p.dataset.pool;
        render();
      }
    });
    c.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]');
      if (go) {
        e.preventDefault();
        if (go.dataset.go === 'region') st.dc = '';
        st.pool = '';
        st.node = '';
        render();
      }
      const dg = e.target.closest('[data-dc-go]');
      if (dg) {
        e.preventDefault();
        st.dc = dg.dataset.dcGo;
        st.pool = '';
        render();
      }
      const pg = e.target.closest('[data-pool-go]');
      if (pg) {
        e.preventDefault();
        st.pool = pg.dataset.poolGo;
        render();
      }
      const v = e.target.closest('[data-view]');
      if (v) {
        st.view = v.dataset.view;
        render();
      }
      const z = e.target.closest('[data-zoom]');
      if (z && pz) ({ in: pz.zoomIn, out: pz.zoomOut, fit: pz.reset })[z.dataset.zoom]();
    });
    c.querySelectorAll('[data-state]').forEach((cb) =>
      cb.addEventListener('change', () => {
        if (cb.checked) st.states.add(cb.dataset.state);
        else st.states.delete(cb.dataset.state);
        render();
      })
    );
    const find = document.getElementById('map-find');
    const doFind = () => {
      const q = find.value.trim().toLowerCase();
      if (!q) return;
      const n = D.nodes.find((x) => x.name.toLowerCase() === q) || D.nodes.find((x) => x.name.toLowerCase().includes(q) || x.id.startsWith(q));
      if (!n) {
        U.toast('No node matches “' + find.value + '”');
        return;
      }
      st.dc = n.dc;
      st.pool = n.pool;
      st.node = n.id;
      st.states.add(nodeState(n));
      render();
      const el = mapEl.querySelector('.hl');
      if (el && pz) {
        const b = el.getBBox();
        pz.focus(b.x + b.width / 2, b.y + b.height / 2, 700);
      }
    };
    find.addEventListener('change', doFind);
    find.addEventListener('keydown', (e) => e.key === 'Enter' && doFind());
    render();
  };

  // ------------------------------------------------------------ activity
  window.PAGES.activity = function () {
    const c = U.shell({
      nav: 'activity',
      title: 'Activity',
      pretitle: 'Overview',
      crumbs: [['Activity', '']],
      sub: 'The event stream of the region as a table: every event links its object by name. Filters are kept in the address, so a filtered view can be shared.',
      actions: `<button class="btn" id="live-btn">${icon('pause')}Pause</button>`,
    });
    const levelTone = { danger: 'danger', warn: 'warn', ok: 'ok', info: 'info' };
    let rows = D.events.slice().reverse().map((e, i) => Object.assign({ index: 482113 - i * 7 }, e));
    const cols = [
      { h: 'Time', f: (e) => `<span class="mono small">${esc(U.hm(e.time))}</span> <span class="faint small">${esc(U.ago(e.time))}</span>`, sort: (e) => -Date.parse(e.time) },
      { h: '', f: (e) => `<span class="dot ${levelTone[e.level] || ''}"></span>`, sort: false },
      { h: 'Topic', f: (e) => `<span class="tag">${esc(e.topic)}</span>` },
      { h: 'Type', f: (e) => `<span class="mono small">${esc(e.type)}</span>` },
      { h: 'Object', f: (e) => (e.ref ? link(e.ref[0], e.ref[1]) : esc(e.key)) },
      { h: 'What happened', f: (e) => esc(e.text) },
      { h: 'Namespace', f: (e) => (e.ns ? link('ns', e.ns) : '<span class="faint">—</span>') },
      { h: 'Index', f: (e) => `<span class="mono small faint">${e.index}</span>`, sort: (e) => e.index },
    ];
    const el = document.createElement('div');
    c.appendChild(el);
    const lv = U.listView(el, {
      rows,
      cols,
      search: (e) => [e.text, e.key, e.topic, e.type, e.ref ? e.ref[1] : ''].join(' ') + ' ' + (e.ref && e.ref[0] === 'node' ? (U.IX.node.get(e.ref[1]) || {}).name : ''),
      searchPlaceholder: 'Filter by object, key or text',
      filters: [
        { key: 'topic', label: 'Topic', options: U.uniq(D.events.map((e) => e.topic)), match: (e, v) => e.topic === v },
        { key: 'type', label: 'Type', options: U.uniq(D.events.map((e) => e.type)), match: (e, v) => e.type === v },
        { key: 'ns', label: 'Namespace', options: U.uniq(D.events.map((e) => e.ns)), match: (e, v) => e.ns === v },
        { key: 'level', label: 'Severity', options: [['danger', 'failures'], ['warn', 'warnings'], ['info', 'changes'], ['ok', 'success']], match: (e, v) => e.level === v },
      ],
      rowClass: (e) => (e.level === 'danger' ? 'row-danger' : e.level === 'warn' ? 'row-warn' : ''),
      foot: 'Live: the mockup adds a made-up event every few seconds while not paused (the real page would use the multiplexed event stream with gapless resume).',
    });

    // Simulated live events.
    const pool = [
      { topic: 'Allocation', type: 'AllocationUpdated', ns: 'default', ref: ['alloc', D.allocations[0].id], level: 'ok', text: 'health check passing' },
      { topic: 'Node', type: 'NodeEvent', ns: '', ref: ['node', D.nodes[8].id], level: 'info', text: 'Drain: 1 allocation left' },
      { topic: 'CustomObject', type: 'ObjectUpdated', ns: '', ref: ['nodegroup', 'workers-dc2'], level: 'info', text: 'status.nodes: hz-fsn1-7716 still creating' },
      { topic: 'Deployment', type: 'DeploymentStatusUpdate', ns: 'default', ref: ['deployment', D.deployments[0].id], level: 'info', text: 'web v7: 2 of 3 healthy' },
      { topic: 'Evaluation', type: 'EvaluationUpdated', ns: 'default', ref: ['eval', D.evaluations.find((e) => e.status === 'blocked').id], level: 'warn', text: 'still blocked' },
    ];
    let live = true;
    let n = 0;
    const t0 = Date.parse(D.now);
    const tick = () => {
      if (!live) return;
      const tmpl = pool[n++ % pool.length];
      rows = [Object.assign({ index: 482120 + n * 3, time: new Date(t0).toISOString(), key: tmpl.ref[1] }, tmpl)].concat(rows);
      lv.setRows(rows);
    };
    const timer = setInterval(tick, 5000);
    const btn = document.getElementById('live-btn');
    btn.addEventListener('click', () => {
      live = !live;
      btn.innerHTML = live ? icon('pause') + 'Pause' : icon('play') + 'Resume';
    });
    window.addEventListener('beforeunload', () => clearInterval(timer));
  };
})();
