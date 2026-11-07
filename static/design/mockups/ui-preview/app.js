/*
 * Norca UI mockup: the frame (sidebar, top bar, global search, breadcrumbs,
 * page header), shared helpers (name-first links, status and condition
 * chips, tables with filters, sparklines, related cards) and the dispatcher
 * that calls the renderer of the page (body[data-page]).
 *
 * Page renderers live in pages-*.js and register in window.PAGES.
 */
(function () {
  'use strict';

  const D = window.NORCA;
  const NOW = Date.parse(D.now);
  const params = new URLSearchParams(location.search);
  window.PAGES = window.PAGES || {};
  // ?theme=dark or ?theme=light forces a theme for this page view.
  if (['dark', 'light'].includes(params.get('theme'))) document.documentElement.dataset.theme = params.get('theme');

  // ---------------------------------------------------------------- basics
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const enc = encodeURIComponent;
  const short = (id) => String(id || '').split('-')[0].slice(0, 8);
  const pad = (n) => String(n).padStart(2, '0');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function ago(t) {
    if (!t) return '';
    const d = (NOW - Date.parse(t)) / 1000;
    const a = Math.abs(d);
    if (a < 30) return 'just now';
    let s;
    if (a < 60) s = Math.round(a) + 's';
    else if (a < 3600) s = Math.round(a / 60) + 'm';
    else if (a < 86400) {
      const h = Math.floor(a / 3600);
      const m = Math.round((a % 3600) / 60);
      s = h + 'h' + (m && h < 6 ? ' ' + m + 'm' : '');
    } else s = Math.round(a / 86400) + 'd';
    return d < 0 ? 'in ' + s : s + ' ago';
  }
  function fmt(t) {
    if (!t) return '';
    const d = new Date(t);
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' UTC';
  }
  const hm = (t) => {
    const d = new Date(t);
    return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
  };
  const when = (t) => (t ? `<span class="nowrap" title="${esc(fmt(t))}">${esc(ago(t))}</span>` : '<span class="faint">—</span>');
  const mhz = (v) => (v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + ' GHz' : v + ' MHz');
  const mb = (v) => (v >= 1024 ? (v / 1024).toFixed(v % 1024 ? 1 : 0) + ' GB' : v + ' MB');
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const plural = (n, w, p) => n + ' ' + (n === 1 ? w : p || w + 's');

  // ---------------------------------------------------------------- icons
  // Simple stroke icons drawn for this mockup (24x24 grid).
  const ICONS = {
    dashboard: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="4" rx="1"/><rect x="13" y="10" width="7" height="10" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/>',
    map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
    activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    server: '<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/><path d="M8 7h.01M8 17h.01"/>',
    building: '<path d="M4 21V6l8-3 8 3v15M3 21h18M9 21v-4h6v4M8 9h2M14 9h2M8 13h2M14 13h2"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="10" y="10" width="4" height="4"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    group: '<rect x="3" y="4" width="8" height="6" rx="1"/><rect x="13" y="4" width="8" height="6" rx="1"/><rect x="8" y="14" width="8" height="6" rx="1"/><path d="M7 10v2h10v-2M12 12v2"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z"/>',
    topology: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v5l-6 5M12 12l6 5"/>',
    database: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    deploy: '<circle cx="6" cy="18" r="2.5"/><circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 7.5v8M18 10.5c0 4-6 3.5-11 5.5"/>',
    allocs: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
    evals: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 6l1.2 1.2L7.5 5M4 12l1.2 1.2L7.5 11M4 18l1.2 1.2L7.5 17"/>',
    package: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    service: '<circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="5" r="1.8"/><circle cx="19.5" cy="5" r="1.8"/><circle cx="12" cy="20.5" r="1.8"/><path d="M5.8 6.3l4 3.6M18.2 6.3l-4 3.6M12 15v3.7"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    lb: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7.5V17M11 7.3l-5 9.9M13 7.3l5 9.9"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    shieldLock: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><rect x="9.5" y="11" width="5" height="4" rx=".5"/><path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11"/>',
    folder: '<path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
    gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>',
    scale: '<path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    variable: '<path d="M7 4C4 8 4 16 7 20M17 4c3 4 3 12 0 16M9.5 9l5 6M14.5 9l-5 6"/>',
    cert: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><circle cx="15" cy="16" r="3"/><path d="M13.5 18.5L13 22l2-1 2 1-.5-3.5M7 8h10M7 11h4"/>',
    objects: '<path d="M8 4H5a1 1 0 0 0-1 1v3M16 4h3a1 1 0 0 1 1 1v3M8 20H5a1 1 0 0 1-1-1v-3M16 20h3a1 1 0 0 0 1-1v-3"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
    braces: '<path d="M8 4c-2 0-3 1-3 3v2c0 1.5-1 3-2 3 1 0 2 1.5 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1.5 1 3 2 3-1 0-2 1.5-2 3v2c0 2-1 3-3 3"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
    chart: '<path d="M4 20V11M10 20V4M16 20v-7M21 20H3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    alert: '<path d="M12 3.5l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
    drain: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    replace: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  const icon = (name, cls) =>
    `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  // ---------------------------------------------------------------- indexes
  const by = (arr, key) => new Map(arr.map((x) => [typeof key === 'function' ? key(x) : x[key], x]));
  const IX = {
    node: by(D.nodes, 'id'),
    server: by(D.servers, 'name'),
    dc: by(D.datacenters, 'name'),
    pool: by(D.nodePools, 'name'),
    ns: by(D.namespaces, 'name'),
    job: by(D.jobs, 'id'),
    alloc: by(D.allocations, 'id'),
    eval: by(D.evaluations, 'id'),
    deployment: by(D.deployments, 'id'),
    service: by(D.services, (s) => s.ns + '/' + s.name),
    nodegroup: by(D.nodeGroups, 'name'),
    provider: by(D.nodeProviders, 'name'),
    lb: by(D.loadBalancers, (l) => l.ns + '/' + l.name),
    lbclass: by(D.lbClasses, 'name'),
    kind: by(D.kinds, (k) => k.group + '/' + k.kind),
    object: by(D.objects, (o) => o.kind + '|' + o.ns + '|' + o.name),
    release: by(D.releases, (r) => r.ns + '/' + r.name),
    quota: by(D.quotas, 'name'),
  };
  const nodeByName = by(D.nodes, 'name');
  const nodeByAddr = by(D.nodes, 'address');

  // ---------------------------------------------------------------- derived relations
  // With a few hundred nodes the per-node lookups are indexed once.
  const ALLOCS_BY_NODE = new Map();
  D.allocations.forEach((a) => {
    if (!ALLOCS_BY_NODE.has(a.node)) ALLOCS_BY_NODE.set(a.node, []);
    ALLOCS_BY_NODE.get(a.node).push(a);
  });
  const allocsOfNode = (id) => ALLOCS_BY_NODE.get(id) || [];
  const allocsOfJob = (id) => D.allocations.filter((a) => a.job === id);
  const servicesOfNode = (id) => D.services.filter((s) => s.instances.some(([aid]) => (IX.alloc.get(aid) || {}).node === id));
  const lbsOfNode = (n) => D.loadBalancers.filter((l) => (l.status.targets || []).some((t) => t.split(':')[0] === n.address));
  const groupsOfJob = (j) => j.groups || [];

  /** What the node scaling operator says about a node, from its NodeGroup. */
  const SCALING_CACHE = new Map();
  function scalingOf(node) {
    if (!node) return null;
    if (!SCALING_CACHE.has(node.id)) SCALING_CACHE.set(node.id, scalingOfUncached(node));
    return SCALING_CACHE.get(node.id);
  }
  function scalingOfUncached(node) {
    for (const g of D.nodeGroups) {
      const st = g.status;
      const rec = (st.nodes || []).find((r) => r.node === node.id);
      const stray = (st.strayNodes || []).find((s) => s.node === node.id);
      if (!rec && !stray) continue;
      const rep = (st.rollout.replacing || []).find((r) => r.node === node.id);
      const outdated = (st.rollout.outdated || []).includes(node.name);
      const warned = (st.rollout.warned || []).includes(node.name);
      const badges = [];
      if (rec) badges.push(['Autoscaled', 'info nodot', 'Created by the node scaling operator for ' + g.name]);
      if (rep) badges.push([rep.phase === 'surging' ? 'Replacing · surge' : 'Replacing · ' + rep.phase, 'purple', 'Replaced (' + rep.reason + '): ' + phaseLabel(rep.phase)]);
      if (outdated) badges.push(['Outdated', 'warn', 'The rollout of ' + g.name + ' will replace it']);
      if (warned) badges.push(['Hard limit soon', 'warn', 'Raised the warning of its hard age limit']);
      if (rec && rec.slow) badges.push(['Slow join', 'warn', 'Joined after join.slow_after']);
      if (stray) badges.push([stray.kind === 'foreign' ? 'Unverified' : 'Instance gone', stray.kind === 'foreign' ? 'danger' : 'neutral', stray.kind === 'foreign' ? 'Carries the marks of ' + g.name + ' without a machine the operator asked for; gets no new work' : 'Its instance is gone']);
      return { group: g, rec, rep, outdated, warned, stray, badges };
    }
    return null;
  }

  const PHASES = {
    leaving: 'Leaving the load balancers',
    draining: 'Draining',
    settling: 'Checked for work',
    deleting: 'Deleting its instance',
    deleted: 'Instance deleted',
    surging: 'Waiting for its replacement',
    emptying: 'Waiting until empty',
  };
  const phaseLabel = (p) => PHASES[p] || p || '';

  // ---------------------------------------------------------------- status and conditions
  const STATUS_TONE = {
    ready: 'ok', down: 'danger', initializing: 'info', disconnected: 'warn', ineligible: 'neutral', draining: 'info',
    running: 'ok', pending: 'info', complete: 'neutral', failed: 'danger', lost: 'danger', dead: 'neutral',
    blocked: 'warn', canceled: 'neutral', successful: 'ok', cancelled: 'neutral', paused: 'warn',
    alive: 'ok', left: 'neutral', deployed: 'ok', 'pending-upgrade': 'info', creating: 'info', deleting: 'warn',
    passing: 'ok', warning: 'warn', critical: 'danger', healthy: 'ok', unhealthy: 'danger', allow: 'ok', deny: 'danger',
    Normal: 'neutral', Warning: 'warn',
  };
  const chip = (status, label, tone) =>
    `<span class="chip ${tone || STATUS_TONE[status] || 'neutral'}">${esc(label || status)}</span>`;

  // Condition polarity: which value is good.
  const POLARITY = {
    Degraded: 'danger', JoinFailing: 'danger',
    RollBlocked: 'warn', RollBehind: 'warn', ForeignNode: 'warn', ScaleDownBlocked: 'warn', DeletionBlocked: 'warn', Drifted: 'warn',
    Rolling: 'info', Progressing: 'info',
  };
  function condTone(c) {
    if (!c || c.status === 'Unknown') return 'neutral';
    const p = POLARITY[c.type];
    if (!p) return c.status === 'True' ? 'ok' : 'danger';
    if (c.status === 'True') return p;
    return p === 'info' ? 'neutral' : 'ok';
  }
  const condPolarityText = (type) => {
    const p = POLARITY[type];
    if (!p) return 'True is good, False is bad';
    if (p === 'info') return 'True means in progress';
    return 'True is ' + (p === 'danger' ? 'bad (danger)' : 'a warning');
  };
  const condChip = (c) =>
    `<span class="chip ${condTone(c)}" title="${esc(c.type + ' = ' + c.status + (c.reason ? ' · ' + c.reason : '') + (c.message ? ': ' + c.message : ''))}">${esc(c.type)}<span class="cs">${c.status === 'True' ? '' : ' = ' + esc(c.status)}</span></span>`;
  const TONE_RANK = { danger: 4, warn: 3, info: 2, ok: 1, neutral: 0 };
  function worstTone(conds) {
    let t = 'neutral';
    for (const c of conds || []) {
      const ct = condTone(c);
      if (TONE_RANK[ct] > TONE_RANK[t]) t = ct;
    }
    return t;
  }
  function health(conds) {
    const t = worstTone(conds);
    const label = { danger: 'Failing', warn: 'Warning', info: 'In progress', ok: 'Healthy', neutral: 'Unknown' }[t];
    return chip('', label, t);
  }
  /** The conditions worth showing in a header or a list cell: failing, warning or in progress. */
  const notableConds = (conds) => (conds || []).filter((c) => ['danger', 'warn', 'info'].includes(condTone(c)));

  function condTable(conds) {
    return table(
      [
        { h: 'Condition', f: (c) => `<b>${esc(c.type)}</b><div class="note">${esc(condPolarityText(c.type))}</div>` },
        { h: 'Status', f: (c) => `<span class="chip ${condTone(c)}">${esc(c.status)}</span>` },
        { h: 'Reason', f: (c) => `<span class="mono">${esc(c.reason || '')}</span>` },
        { h: 'Message', f: (c) => esc(c.message || '') },
        { h: 'Retry after', f: (c) => (c.retryAfter ? `<span class="nowrap">${esc(hm(c.retryAfter))} <span class="faint">(${esc(ago(c.retryAfter))})</span></span>` : '<span class="faint">—</span>') },
        { h: 'Since', f: (c) => when(c.lastTransitionTime) },
      ],
      conds,
      { rowClass: (c) => ({ danger: 'row-danger', warn: 'row-warn', info: 'row-info' })[condTone(c)] || '' }
    );
  }

  // ---------------------------------------------------------------- names for objects without one
  const jobName = (id) => (IX.job.get(id) || { name: id }).name;
  const evalTitle = (e) => {
    if (!e) return '';
    const n = e.node ? IX.node.get(e.node) : null;
    return e.triggeredBy + ' · ' + jobName(e.job) + (n ? ' on ' + n.name : '');
  };
  const depTitle = (d) => (d ? jobName(d.job) + ' v' + d.version : '');

  // ---------------------------------------------------------------- links (name first, ID muted)
  const KIND_PAGE = {
    'norca.io/NodeGroup': (o) => 'node-group.html?id=' + enc(o.name),
    'norca.io/NodeProvider': (o) => 'node-provider.html?id=' + enc(o.name),
    'norca.io/LoadBalancer': (o) => 'load-balancer.html?id=' + enc(o.ns + '/' + o.name),
  };

  /**
   * link(type, key, opt): the human name as the link text, the short ID in
   * muted monospace after it when the name is not unique or missing, and
   * the full ID in the tooltip.
   */
  function link(type, key, opt) {
    opt = opt || {};
    let href = '#';
    let label = key;
    let id = '';
    let title = '';
    let ico = '';
    switch (type) {
      case 'node': {
        const n = IX.node.get(key);
        href = 'node.html?id=' + enc(key);
        label = n ? n.name : short(key);
        title = 'Client node ' + label + ' · ' + key;
        if (opt.id) id = short(key);
        ico = 'cpu';
        break;
      }
      case 'server':
        href = 'server.html?id=' + enc(key);
        title = 'Server ' + key;
        ico = 'server';
        break;
      case 'dc':
        href = 'datacenter.html?id=' + enc(key);
        title = 'Datacenter ' + key;
        ico = 'building';
        break;
      case 'pool':
        href = 'node-pool.html?id=' + enc(key);
        title = 'Node pool ' + key;
        ico = 'layers';
        break;
      case 'ns':
        href = 'namespace.html?id=' + enc(key);
        title = 'Namespace ' + key;
        ico = 'folder';
        break;
      case 'job': {
        const j = IX.job.get(key);
        href = 'job.html?id=' + enc(key);
        label = j ? j.name : key;
        title = 'Job ' + label + (j ? ' in ' + j.ns : '');
        ico = 'briefcase';
        break;
      }
      case 'group': {
        const [jid, g] = key.split('|');
        href = 'job.html?id=' + enc(jid) + '&tab=groups#tg-' + enc(g);
        label = opt.label || jobName(jid) + ' / ' + g;
        title = 'Task group ' + g + ' of job ' + jobName(jid);
        ico = 'allocs';
        break;
      }
      case 'alloc': {
        const a = IX.alloc.get(key);
        href = 'allocation.html?id=' + enc(key);
        label = a ? a.name : short(key);
        id = short(key);
        title = 'Allocation ' + label + ' · ' + key;
        ico = 'allocs';
        break;
      }
      case 'eval': {
        const e = IX.eval.get(key);
        href = 'evaluation.html?id=' + enc(key);
        label = e ? evalTitle(e) : short(key);
        id = short(key);
        title = 'Evaluation ' + key;
        ico = 'evals';
        break;
      }
      case 'deployment': {
        const d = IX.deployment.get(key);
        href = 'deployment.html?id=' + enc(key);
        label = d ? depTitle(d) : short(key);
        id = short(key);
        title = 'Deployment ' + label + ' · ' + key;
        ico = 'deploy';
        break;
      }
      case 'service': {
        const [ns, name] = key.split('/');
        href = 'service.html?id=' + enc(key);
        label = name;
        title = 'Service ' + name + ' in ' + ns;
        ico = 'service';
        break;
      }
      case 'lb': {
        href = 'load-balancer.html?id=' + enc(key);
        label = key.split('/')[1];
        title = 'LoadBalancer ' + key;
        ico = 'lb';
        break;
      }
      case 'lbclass':
        href = 'object.html?kind=' + enc('norca.io/LoadBalancerClass') + '&name=' + enc(key);
        title = 'LoadBalancerClass ' + key;
        ico = 'lb';
        break;
      case 'nodegroup':
        href = 'node-group.html?id=' + enc(key);
        title = 'NodeGroup ' + key;
        ico = 'group';
        break;
      case 'provider':
        href = 'node-provider.html?id=' + enc(key);
        title = 'NodeProvider ' + key;
        ico = 'cloud';
        break;
      case 'kind':
        href = 'kind.html?id=' + enc(key);
        label = opt.full ? key : key.split('/')[1];
        title = 'Object kind ' + key;
        ico = 'braces';
        break;
      case 'object': {
        const [kind, ns, name] = key.split('|');
        const o = { kind, ns, name };
        href = KIND_PAGE[kind] ? KIND_PAGE[kind](o) : 'object.html?kind=' + enc(kind) + (ns ? '&ns=' + enc(ns) : '') + '&name=' + enc(name);
        label = name;
        title = kind + ' ' + (ns ? ns + '/' : '') + name;
        ico = 'objects';
        break;
      }
      case 'release':
        href = 'release.html?id=' + enc(key);
        label = key.split('/')[1];
        title = 'Release ' + key;
        ico = 'package';
        break;
      case 'quota':
        href = 'quotas.html?id=' + enc(key);
        title = 'Quota ' + key;
        ico = 'gauge';
        break;
      case 'policy':
        href = 'stub.html?p=scaling&id=' + enc(key);
        label = opt.label || key;
        title = 'Scaling policy ' + key;
        ico = 'scale';
        break;
      case 'variable':
        href = 'stub.html?p=variables&id=' + enc(key);
        title = 'Variable ' + key;
        ico = 'variable';
        break;
      case 'stub':
        href = 'stub.html?p=' + enc(key);
        label = opt.label || key;
        break;
      default:
        break;
    }
    if (opt.label) label = opt.label;
    return `<a class="olink" href="${href}" title="${esc(title)}">${opt.icon ? icon(ico) : ''}<span class="nm">${esc(label)}</span>${id && !opt.noId ? `<span class="idtag">${esc(id)}</span>` : ''}</a>`;
  }
  const links = (type, keys, opt) => (keys && keys.length ? keys.map((k) => link(type, k, opt)).join(', ') : '<span class="faint">—</span>');

  // ---------------------------------------------------------------- building blocks
  function table(cols, rows, opt) {
    opt = opt || {};
    const head = cols
      .map((c, i) => {
        const sortable = opt.sortable && c.sort !== false;
        const arrow = opt.sortIdx === i ? `<span class="arrow">${opt.sortDir > 0 ? '▲' : '▼'}</span>` : '';
        return `<th class="${c.cls || ''} ${sortable ? 'sortable' : ''}" ${sortable ? `data-i="${i}"` : ''}>${c.h}${arrow}</th>`;
      })
      .join('');
    const body = rows.length
      ? rows
          .map((r) => `<tr class="${opt.rowClass ? opt.rowClass(r) : ''}" ${opt.rowId ? `id="${esc(opt.rowId(r))}"` : ''}>${cols.map((c) => `<td class="${c.cls || ''}">${c.f(r)}</td>`).join('')}</tr>`)
          .join('')
      : `<tr><td class="empty" colspan="${cols.length}">${opt.empty || 'Nothing to show'}</td></tr>`;
    return `<div class="table-wrap"><table class="t ${opt.cls || ''}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function card(title, body, opt) {
    opt = opt || {};
    return `<section class="card ${opt.cls || ''}" ${opt.id ? `id="${opt.id}"` : ''}>
      ${title ? `<div class="card-h">${opt.icon ? icon(opt.icon) : ''}<h3>${title}</h3>${opt.hint ? `<span class="hint">${opt.hint}</span>` : ''}${opt.tools ? `<div class="tools">${opt.tools}</div>` : ''}</div>` : ''}
      <div class="card-b ${opt.flush ? 'flush' : ''}">${body}</div>
      ${opt.foot ? `<div class="card-f">${opt.foot}</div>` : ''}
    </section>`;
  }
  const kv = (pairs) =>
    `<dl class="kv">${pairs
      .filter(Boolean)
      .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v == null || v === '' ? '<span class="faint">—</span>' : v}</dd>`)
      .join('')}</dl>`;

  /** The "Related" card of every detail page. */
  function related(rows, opt) {
    const lis = rows
      .filter(Boolean)
      .map(([k, v, isNew]) => `<li><span class="rk">${esc(k)}${isNew ? '<span class="new" title="A link the current UI does not have">new</span>' : ''}</span><span class="rv">${v || '<span class="faint">—</span>'}</span></li>`)
      .join('');
    return card('Related', `<ul class="related">${lis}</ul>`, { flush: true, icon: 'topology', hint: (opt && opt.hint) || 'by the fields that link them' });
  }

  function meter(value, max, tone, title) {
    const p = Math.max(0, Math.min(100, pct(value, max)));
    const t = tone || (p >= 90 ? 'danger' : p >= 80 ? 'warn' : '');
    return `<div class="meter ${t}" title="${esc(title || p + '%')}"><span style="width:${p}%"></span></div>`;
  }
  function meterRow(label, used, max, fmtFn, tone) {
    return `<div class="meter-row"><span>${esc(label)}</span>${meter(used, max, tone)}<span class="v">${pct(used, max)}%</span></div>${fmtFn ? `<div class="note" style="margin:-2px 0 4px 78px">${fmtFn(used)} of ${fmtFn(max)}</div>` : ''}`;
  }
  /** Two values in one bar: allocated (thick) and used (thin). */
  function allocUsedBar(alloc, used) {
    return `<div class="meter" style="height:8px" title="allocated ${alloc}% · used ${used}%"><span style="width:${alloc}%;height:8px"></span><span class="used" style="width:${used}%;top:5px;height:3px"></span></div>`;
  }

  /**
   * A sparkline. lines: [{v: [...], cls: 'a'|'u'|'bl', area: true}], blocks:
   * values > 0 drawn as red bars (blocked demand).
   */
  function spark(lines, opt) {
    opt = Object.assign({ w: 160, h: 34, max: 100 }, opt || {});
    const { w, h, max } = opt;
    const n = lines[0].v.length;
    const x = (i) => (i / (n - 1)) * w;
    const y = (v) => h - 1 - (Math.min(v, max) / max) * (h - 2);
    let out = '';
    if (opt.blocks) {
      const bw = w / n;
      opt.blocks.forEach((v, i) => {
        if (v > 0) out += `<rect class="b" x="${(i * bw).toFixed(1)}" y="0" width="${(bw + 0.4).toFixed(1)}" height="${h}"/>`;
      });
    }
    for (const l of lines) {
      const pts = l.v.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
      if (l.area) out += `<polygon class="area" points="0,${h} ${pts} ${w},${h}"/>`;
      out += `<polyline class="${l.cls || 'a'}" points="${pts}"/>`;
    }
    return `<svg class="spark" width="${opt.fluid ? '100%' : w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(opt.label || 'trend')}">${out}</svg>`;
  }
  const last = (arr) => arr[arr.length - 1];

  // ---------------------------------------------------------------- metric families and ranges
  /**
   * The families of the metrics store: 1, 3, 4
   * are stored today, 2 is planned in the store design, 5–9 are proposed.
   */
  const FAMILIES = {
    1: ['Task groups', 'stored'],
    2: ['Application metrics', 'planned, not built'],
    3: ['Cluster capacity', 'stored'],
    4: ['Quotas', 'stored'],
    5: ['Scheduler and control plane', 'planned'],
    6: ['Workload and node state', 'planned'],
    7: ['Node host statistics', 'planned'],
    8: ['Server internals (Raft, RPC, bus)', 'planned'],
    9: ['Objects and operators', 'planned'],
  };
  /** A small badge for a chart whose metric is not stored yet; links to the explanation on the metrics page. */
  const planned = (n) =>
    `<a class="planned" href="metrics.html#family-${n}" title="Needs metric family ${n} (${esc(FAMILIES[n][0])}), which the store does not keep yet">planned: family ${n}</a>`;
  /** A chart placeholder: a faint outline of the curve, the badge and what it would show. */
  function plannedChart(title, n, opt) {
    opt = opt || {};
    const w = 300;
    const h = opt.h || 54;
    let pts = '';
    for (let i = 0; i <= 30; i++) pts += `${(i / 30) * w},${(h * (0.55 + 0.25 * Math.sin(i / 3 + (opt.seed || 1)))).toFixed(1)} `;
    return `<div class="planned-chart"><div class="pc-h"><span>${esc(title)}</span>${planned(n)}</div>
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="100%" height="${h}" aria-hidden="true"><polyline points="${pts}" /></svg>
      ${opt.note ? `<div class="note">${opt.note}</div>` : ''}</div>`;
  }
  /** Ranges the metrics store holds: the effective retention of the queried server (the leader). */
  const RANGE_DEFS = [['1h', 1], ['6h', 6], ['24h', 24], ['7d', 168], ['30d', 720]];
  const retentionHours = () => (D.metrics.store && D.metrics.store.retentionHours) || 720;
  function rangeSelect(selected) {
    const ok = RANGE_DEFS.filter(([, h]) => h <= retentionHours());
    return `<label class="small muted range-sel" title="The store keeps ${retentionHours()}h (retention of ${esc(D.servers.find((s) => s.leader).name)}); longer ranges are not offered">Range <select class="in" style="width:auto" data-range>${ok
      .map(([l]) => `<option ${l === (selected || '24h') ? 'selected' : ''}>${l}</option>`)
      .join('')}</select> <a href="metrics.html#retention" class="faint">retention ${retentionHours() / 24}d</a></label>`;
  }

  function eventsTimeline(events, opt) {
    const evs = (events || []).slice().sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
    if (!evs.length) return '<div class="empty muted" style="padding:16px">No events</div>';
    return `<ul class="tl">${evs
      .slice(0, (opt && opt.limit) || 50)
      .map(
        (e) => `<li class="${e.type === 'Warning' ? 'warn' : /Failed|Down|OOM/.test(e.reason || '') ? 'danger' : 'ok'}">
          <div class="tl-h"><b>${esc(e.reason)}</b>${e.type === 'Warning' ? chip('Warning', 'Warning') : ''}<span class="faint small" title="${esc(fmt(e.time))}">${esc(hm(e.time))} · ${esc(ago(e.time))}</span>${e.reporter ? `<span class="faint small">by ${opLink(e.reporter)}</span>` : ''}</div>
          <div class="tl-m">${esc(e.message)}</div></li>`
      )
      .join('')}</ul>`;
  }
  /** An object event reporter is an identity; resolve the operators we know to their job. */
  function opLink(rep) {
    const j = IX.job.get(rep);
    if (j) return link('job', rep);
    if (rep === 'autoscaler') return '<a class="olink" href="operators.html" title="The built-in autoscaler of the leader">autoscaler (built in)</a>';
    return esc(rep);
  }

  function alert(tone, html) {
    const ic = tone === 'info' ? 'info' : 'alert';
    return `<div class="alert ${tone}">${icon(ic)}<div>${html}</div></div>`;
  }

  function hcl(text) {
    return esc(text)
      .replace(/(&quot;[^&]*?&quot;)/g, '<span class="s">$1</span>')
      .replace(/^(\s*)([a-z_]+)(\s*(=|\{))/gm, '$1<span class="k">$2</span>$3')
      .replace(/(#.*)$/gm, '<span class="c">$1</span>');
  }
  function json(obj) {
    return esc(JSON.stringify(obj, null, 2))
      .replace(/(&quot;[^&]*?&quot;)(:)/g, '<span class="k">$1</span>$2')
      .replace(/: (&quot;[^&]*?&quot;)/g, ': <span class="s">$1</span>')
      .replace(/: (-?\d+\.?\d*|true|false|null)/g, ': <span class="n">$1</span>');
  }

  function tabs(defs, current) {
    return `<nav class="tabs">${defs
      .map(([id, label, n]) => `<a href="#${id}" data-tab="${id}" class="${id === current ? 'active' : ''}">${esc(label)}${n != null ? `<span class="n">${n}</span>` : ''}</a>`)
      .join('')}</nav>`;
  }
  /** Shows one [data-pane] at a time; the tab comes from ?tab= or the hash. */
  function wireTabs(root, initial) {
    const show = (id) => {
      root.querySelectorAll('[data-pane]').forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== id));
      root.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === id));
    };
    root.querySelectorAll('.tabs a').forEach((a) =>
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        show(a.dataset.tab);
        try {
          const p = new URLSearchParams(location.search);
          p.set('tab', a.dataset.tab);
          history.replaceState(null, '', '?' + p.toString());
        } catch (e) {
          /* file:// may refuse; the tab still switches */
        }
      })
    );
    show(params.get('tab') || initial);
    if (location.hash) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) setTimeout(() => el.scrollIntoView({ block: 'center' }), 50);
    }
  }

  // ---------------------------------------------------------------- list view with filters
  /**
   * A filterable, sortable list. Filters read their initial value from the
   * query string (so links such as nodes.html?dc=eu-dc2 open a filtered
   * list) and write it back.
   */
  function listView(el, cfg) {
    const state = { q: params.get('q') || '' };
    (cfg.filters || []).forEach((f) => (state[f.key] = params.get(f.key) || f.initial || ''));
    let sortIdx = cfg.sortIdx == null ? -1 : cfg.sortIdx;
    let sortDir = cfg.sortDir || 1;
    const sel = (f) => {
      const opts = typeof f.options === 'function' ? f.options() : f.options;
      return `<label class="f">${esc(f.label)}<select data-k="${f.key}"><option value="">All</option>${opts
        .map(([v, l]) => `<option value="${esc(v)}" ${state[f.key] === v ? 'selected' : ''}>${esc(l || v)}</option>`)
        .join('')}</select></label>`;
    };
    el.innerHTML = `<section class="card">
      <div class="filters">
        ${cfg.search ? `<input type="search" data-k="q" placeholder="${esc(cfg.searchPlaceholder || 'Filter by name')}" value="${esc(state.q)}">` : ''}
        ${(cfg.filters || []).map(sel).join('')}
        <a href="#" class="clear">Clear</a>
        <span class="count"></span>
      </div>
      <div class="filter-chips hidden"></div>
      <div class="lv-body"></div>
      ${cfg.foot ? `<div class="card-f">${cfg.foot}</div>` : ''}
    </section>`;
    const body = el.querySelector('.lv-body');
    const chips = el.querySelector('.filter-chips');
    const render = () => {
      let rows = cfg.rows.filter((r) => {
        for (const f of cfg.filters || []) if (state[f.key] && !f.match(r, state[f.key])) return false;
        if (state.q && cfg.search && !cfg.search(r).toLowerCase().includes(state.q.toLowerCase())) return false;
        return true;
      });
      if (sortIdx >= 0) {
        const col = cfg.cols[sortIdx];
        const key = col.sort || ((r) => String(col.f(r)).replace(/<[^>]+>/g, ''));
        rows = rows.slice().sort((a, b) => {
          const ka = key(a);
          const kb = key(b);
          return (ka > kb ? 1 : ka < kb ? -1 : 0) * sortDir;
        });
      }
      body.innerHTML = table(cfg.cols, rows, { sortable: true, sortIdx, sortDir, rowClass: cfg.rowClass, empty: cfg.empty || 'No match for these filters' });
      el.querySelector('.count').textContent = rows.length + ' of ' + cfg.rows.length;
      const active = (cfg.filters || []).filter((f) => state[f.key]);
      chips.classList.toggle('hidden', !active.length);
      chips.innerHTML = active.map((f) => `<span class="fc">${esc(f.label)}: ${esc(state[f.key])}<button data-clear="${f.key}" title="Remove">×</button></span>`).join('');
      try {
        const p = new URLSearchParams();
        Object.keys(state).forEach((k) => state[k] && p.set(k, state[k]));
        history.replaceState(null, '', p.toString() ? '?' + p.toString() : location.pathname);
      } catch (e) {
        /* file:// may refuse replaceState */
      }
    };
    el.addEventListener('change', (e) => {
      const k = e.target.dataset.k;
      if (k) {
        state[k] = e.target.value;
        render();
      }
    });
    el.addEventListener('input', (e) => {
      if (e.target.dataset.k === 'q') {
        state.q = e.target.value;
        render();
      }
    });
    el.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-i]');
      if (th) {
        const i = Number(th.dataset.i);
        sortDir = sortIdx === i ? -sortDir : 1;
        sortIdx = i;
        render();
        return;
      }
      const c = e.target.closest('[data-clear]');
      if (c) {
        state[c.dataset.clear] = '';
        const s = el.querySelector(`select[data-k="${c.dataset.clear}"]`);
        if (s) s.value = '';
        render();
        return;
      }
      if (e.target.classList.contains('clear')) {
        e.preventDefault();
        Object.keys(state).forEach((k) => (state[k] = ''));
        el.querySelectorAll('select[data-k]').forEach((s) => (s.value = ''));
        const q = el.querySelector('input[data-k="q"]');
        if (q) q.value = '';
        render();
      }
    });
    render();
    return {
      setRows(rows) {
        cfg.rows = rows;
        render();
      },
    };
  }
  const uniq = (arr) => Array.from(new Set(arr.filter((x) => x !== '' && x != null))).sort().map((v) => [v, v]);

  // ---------------------------------------------------------------- dashboard-wide lists
  /** Operations in progress: deployments, drains, node scaling, releases, restores. */
  function operations() {
    const ops = [];
    for (const d of D.deployments.filter((x) => x.status === 'running')) {
      const g = d.groups.reduce((a, x) => ({ desired: a.desired + x.desired, healthy: a.healthy + x.healthy }), { desired: 0, healthy: 0 });
      ops.push({ icon: 'deploy', tone: 'info', title: 'Deployment ' + link('deployment', d.id), text: `${g.healthy} of ${g.desired} healthy · rolling, max_parallel 1 · job ${link('job', d.job)}`, done: g.healthy, total: g.desired, time: d.createdAt });
    }
    for (const n of D.nodes.filter((x) => x.drain)) {
      ops.push({ icon: 'drain', tone: 'info', title: 'Drain of ' + link('node', n.id), text: `${esc(n.drain.reason)} · ${plural(n.drain.remaining, 'allocation')} left · deadline ${esc(ago(n.drain.deadline))}`, time: n.drain.started });
    }
    for (const g of D.nodeGroups) {
      const r = g.status.rollout;
      if (r.replacing && r.replacing.length) {
        const total = r.replacing.length + (r.outdated || []).length;
        ops.push({
          icon: 'replace', tone: 'info', title: 'Rolling replacement in ' + link('nodegroup', g.name),
          text: r.replacing.map((x) => `${link('node', x.node, { label: x.nodeName })} <span class="faint">${esc(x.phase)}</span>`).join(', ') + ` · ${(r.outdated || []).length} outdated waiting`,
          done: 0, total, time: r.replacing[0].since,
        });
      }
      for (const rec of (g.status.nodes || []).filter((x) => x.state === 'creating')) {
        ops.push({ icon: 'group', tone: 'info', title: 'Instance ' + esc(rec.instance) + ' joining ' + link('nodegroup', g.name), text: `request #${rec.request} · creating for ${esc(ago(rec.created).replace(' ago', ''))} (join deadline ${esc(g.spec.join.deadline)})`, time: rec.created });
      }
      const prov = g.status.conditions.find((c) => c.type === 'Provisioned');
      if (g.spec.replicas > g.status.replicas + g.status.joining && !(r.replacing || []).length && prov && prov.status === 'False') {
        ops.push({ icon: 'scale', tone: 'warn', title: 'Scale-up of ' + link('nodegroup', g.name) + ` ${g.status.replicas} → ${g.spec.replicas}`, text: 'stalled: ' + esc((g.status.conditions.find((c) => c.type === 'Provisioned') || {}).message || ''), time: g.status.decision ? g.status.decision.time : '' });
      }
    }
    for (const r of D.releases.filter((x) => x.status === 'pending-upgrade')) {
      ops.push({ icon: 'package', tone: 'info', title: 'Release ' + link('release', r.ns + '/' + r.name) + ` upgrade ${esc(r.version)} → ${esc(r.target)}`, text: 'waits for its pre-upgrade hook', time: r.updatedAt });
    }
    if (D.backups.restorePending) {
      const rp = D.backups.restorePending;
      ops.push({ icon: 'archive', tone: 'warn', title: link('stub', 'backups', { label: rp.mode }) + ' awaiting approval', text: `${esc(rp.scope)} · requested by ${esc(rp.requestedByName)}`, time: rp.time });
    }
    return ops;
  }

  /** Warnings: node state, object conditions by polarity, evaluations, quotas, releases. */
  function warnings() {
    const w = [];
    for (const n of D.nodes.filter((x) => x.status === 'down')) w.push({ tone: 'danger', title: link('node', n.id) + ' is down', text: `last heartbeat ${esc(ago(n.lastHeartbeat))} · ${link('dc', n.dc)} / ${link('pool', n.pool)}`, time: n.lastHeartbeat });
    // One row per object: its link, the chips of every bad condition, and the
    // message of the worst one (retryAfter included).
    const objWarn = (objLink, kindTag, conds) => {
      const bad = conds.filter((x) => ['warn', 'danger'].includes(condTone(x))).sort((a, b) => TONE_RANK[condTone(b)] - TONE_RANK[condTone(a)]);
      if (!bad.length) return;
      const c = bad[0];
      w.push({
        tone: condTone(c),
        title: `${objLink} ${kindTag ? `<span class="badge-kind">${esc(kindTag)}</span>` : ''} ${bad.map(condChip).join(' ')}`,
        text: esc(c.message) + (c.retryAfter ? ` · retry ${esc(ago(c.retryAfter))}` : '') + (bad.length > 1 ? ` <span class="faint">· ${bad.length - 1} more on the page</span>` : ''),
        time: c.lastTransitionTime,
      });
    };
    for (const g of D.nodeGroups) objWarn(link('nodegroup', g.name), 'NodeGroup', g.status.conditions);
    for (const p of D.nodeProviders) objWarn(link('provider', p.name), 'NodeProvider', p.status.conditions);
    for (const l of D.loadBalancers) objWarn(link('lb', l.ns + '/' + l.name), 'LoadBalancer', l.status.conditions);
    for (const o of D.objects) objWarn(link('object', o.kind + '|' + o.ns + '|' + o.name), o.kind.split('/')[1], o.status.conditions);
    for (const r of D.releases) objWarn(link('release', r.ns + '/' + r.name), 'Release', r.conditions);
    for (const e of D.evaluations.filter((x) => x.status === 'blocked'))
      w.push({ tone: 'warn', title: 'Blocked evaluation ' + link('eval', e.id), text: esc(e.desc), time: e.createdAt });
    for (const d of D.deployments.filter((x) => x.status === 'failed'))
      w.push({ tone: 'danger', title: 'Deployment ' + link('deployment', d.id) + ' failed', text: esc(d.desc), time: d.createdAt });
    for (const q of D.quotas) {
      const m = pct(q.used.mem, q.limits.mem);
      if (m >= 80) w.push({ tone: 'warn', title: 'Quota ' + link('quota', q.name) + ' nearly full', text: `memory ${m}% (${mb(q.used.mem)} of ${mb(q.limits.mem)})`, time: '' });
    }
    const rank = { danger: 0, warn: 1 };
    return w.sort((a, b) => rank[a.tone] - rank[b.tone]);
  }

  function itemsList(list, opt) {
    if (!list.length) return `<div class="empty muted" style="padding:16px">${(opt && opt.empty) || 'Nothing'}</div>`;
    return `<ul class="items">${list
      .map(
        (o) => `<li>${o.icon ? icon(o.icon, 'kind-ico') : `<span class="dot ${o.tone}"></span>`}<div class="what"><div class="t1">${o.title}</div><div class="t2">${o.text || ''}</div>${
          o.total ? `<div class="prog">${meter(o.done, o.total, 'ok')}<span class="small muted">${o.done} / ${o.total}</span></div>` : ''
        }</div><span class="when">${o.time ? when(o.time) : ''}</span></li>`
      )
      .join('')}</ul>`;
  }

  /** An event of the stream with its object linked by name. */
  function eventLine(e) {
    const ref = e.ref ? link(e.ref[0], e.ref[1]) : esc(e.key);
    return `${ref} <span class="muted">${esc(e.text)}</span>`;
  }

  // ---------------------------------------------------------------- navigation
  const NAV = [
    { group: 'Overview', items: [['dashboard', 'Dashboard', 'dashboard', 'index.html'], ['regionmap', 'Region map', 'map', 'region-map.html'], ['activity', 'Activity', 'activity', 'activity.html']] },
    {
      group: 'Cluster',
      items: [
        ['servers', 'Regions and servers', 'server', 'servers.html'],
        ['datacenters', 'Datacenters and pools', 'building', 'datacenters.html'],
        ['nodes', 'Clients', 'cpu', 'nodes.html'],
        ['nodegroups', 'Node groups', 'group', 'node-groups.html'],
        ['providers', 'Node providers', 'cloud', 'node-providers.html', { child: true }],
        ['topology', 'Topology', 'topology', 'stub.html?p=topology', { stub: true }],
        ['storage', 'Storage', 'database', 'stub.html?p=storage', { stub: true }],
      ],
    },
    { group: 'Workloads', items: [['jobs', 'Jobs', 'briefcase', 'jobs.html'], ['deployments', 'Deployments', 'deploy', 'deployments.html'], ['allocations', 'Allocations', 'allocs', 'allocations.html'], ['evaluations', 'Evaluations', 'evals', 'evaluations.html'], ['packages', 'Packages', 'package', 'packages.html']] },
    { group: 'Networking', items: [['services', 'Services', 'service', 'services.html'], ['endpoints', 'Endpoints and domains', 'globe', 'stub.html?p=endpoints', { stub: true }], ['lbs', 'Load balancers', 'lb', 'load-balancers.html'], ['intentions', 'Intentions and rules', 'shieldLock', 'stub.html?p=intentions', { stub: true }]] },
    { group: 'Governance', items: [['namespaces', 'Namespaces', 'folder', 'namespaces.html'], ['quotas', 'Quotas', 'gauge', 'quotas.html'], ['scaling', 'Scaling policies', 'scale', 'stub.html?p=scaling', { stub: true }], ['admission', 'Admission policies', 'shield', 'stub.html?p=admission', { stub: true }]] },
    { group: 'Security', items: [['access', 'Access control', 'key', 'stub.html?p=access', { stub: true }], ['secrets', 'Secrets', 'lock', 'stub.html?p=secrets', { stub: true }], ['variables', 'Variables', 'variable', 'stub.html?p=variables', { stub: true }], ['certificates', 'Certificates', 'cert', 'stub.html?p=certificates', { stub: true }]] },
    { group: 'Platform', items: [['objects', 'Objects', 'objects', 'objects.html'], ['kinds', 'Type definitions', 'braces', 'kinds.html'], ['operators', 'Operators', 'cog', 'operators.html']] },
    { group: 'Operations', items: [['backups', 'Backups', 'archive', 'stub.html?p=backups', { stub: true }], ['metrics', 'Metrics', 'chart', 'metrics.html']] },
  ];

  function navFlags() {
    const f = {};
    const worst = (list) => list.reduce((t, c) => (TONE_RANK[c] > TONE_RANK[t] ? c : t), 'neutral');
    f.nodes = D.nodes.some((n) => n.status === 'down') ? 'danger' : '';
    f.nodegroups = worst(D.nodeGroups.map((g) => worstTone(g.status.conditions)));
    f.providers = worst(D.nodeProviders.map((p) => worstTone(p.status.conditions)));
    f.lbs = worst(D.loadBalancers.map((l) => worstTone(l.status.conditions)));
    f.objects = worst(D.objects.map((o) => worstTone(o.status.conditions)));
    f.evaluations = D.evaluations.some((e) => e.status === 'blocked') ? 'warn' : '';
    f.packages = worst(D.releases.map((r) => worstTone(r.conditions)));
    Object.keys(f).forEach((k) => (f[k] = ['warn', 'danger'].includes(f[k]) ? f[k] : ''));
    return f;
  }

  function sidebarHTML(active) {
    const flags = navFlags();
    const counts = { nodes: D.nodes.length, jobs: D.jobs.filter((j) => !j.parent).length, nodegroups: D.nodeGroups.length, services: D.services.length, lbs: D.loadBalancers.length };
    return `<a class="brand" href="index.html"><span class="logo">N</span>Norca<small>mockup</small></a>
      ${NAV.map(
        (g) => `<div class="nav-group"><h6>${esc(g.group)}</h6>${g.items
          .map(([id, label, ic, href, o]) => {
            o = o || {};
            const right = flags[id] ? `<span class="flag ${flags[id]}" title="${flags[id] === 'danger' ? 'Something is failing' : 'Warnings'}"></span>` : o.stub ? '<span class="stubmark" title="Not mocked: a placeholder page">stub</span>' : counts[id] != null ? `<span class="count">${counts[id]}</span>` : '';
            return `<a class="nav-item ${o.child ? 'child' : ''} ${id === active ? 'active' : ''}" href="${href}">${o.child ? '' : icon(ic)}${esc(label)}${right}</a>`;
          })
          .join('')}</div>`
      ).join('')}`;
  }

  // ---------------------------------------------------------------- global search
  let SEARCH = null;
  function searchIndex() {
    if (SEARCH) return SEARCH;
    const s = [];
    const add = (type, label, sub, href, extra) => s.push({ type, label, sub, href, hay: (label + ' ' + sub + ' ' + (extra || '')).toLowerCase() });
    D.nodes.forEach((n) => add('Client node', n.name, `${n.dc} · ${n.pool} · ${n.status}`, 'node.html?id=' + enc(n.id), n.id + ' ' + n.address));
    D.servers.forEach((x) => add('Server', x.name, `${x.dc}${x.leader ? ' · leader' : ''}`, 'server.html?id=' + enc(x.name), x.address));
    D.datacenters.forEach((x) => add('Datacenter', x.name, x.location, 'datacenter.html?id=' + enc(x.name)));
    D.nodePools.forEach((x) => add('Node pool', x.name, x.description, 'node-pool.html?id=' + enc(x.name)));
    D.nodeGroups.forEach((x) => add('NodeGroup', x.name, `${x.spec.datacenter} / ${x.spec.pool}`, 'node-group.html?id=' + enc(x.name), x.id));
    D.nodeProviders.forEach((x) => add('NodeProvider', x.name, x.spec.endpoint, 'node-provider.html?id=' + enc(x.name)));
    D.namespaces.forEach((x) => add('Namespace', x.name, x.description, 'namespace.html?id=' + enc(x.name)));
    D.jobs.forEach((x) => add('Job', x.name, `${x.ns} · ${x.type} · v${x.version}`, 'job.html?id=' + enc(x.id)));
    D.allocations.forEach((x) => add('Allocation', x.name, `${short(x.id)} · ${x.status} · ${(IX.node.get(x.node) || {}).name}`, 'allocation.html?id=' + enc(x.id), x.id));
    D.evaluations.forEach((x) => add('Evaluation', evalTitle(x), `${short(x.id)} · ${x.status}`, 'evaluation.html?id=' + enc(x.id), x.id));
    D.deployments.forEach((x) => add('Deployment', depTitle(x), `${short(x.id)} · ${x.status}`, 'deployment.html?id=' + enc(x.id), x.id));
    D.services.forEach((x) => add('Service', x.name, `${x.ns} · job ${x.job}`, 'service.html?id=' + enc(x.ns + '/' + x.name), x.tags.join(' ')));
    D.loadBalancers.forEach((x) => add('LoadBalancer', x.name, `${x.ns} · ${x.spec.service} · ${(x.status.addresses || []).join(' ')}`, 'load-balancer.html?id=' + enc(x.ns + '/' + x.name)));
    D.lbClasses.forEach((x) => add('LoadBalancerClass', x.name, x.spec.endpoint, 'object.html?kind=' + enc('norca.io/LoadBalancerClass') + '&name=' + enc(x.name)));
    D.kinds.forEach((x) => add('Object kind', x.kind, x.group, 'kind.html?id=' + enc(x.group + '/' + x.kind)));
    D.objects.forEach((x) => add(x.kind.split('/')[1], x.name, `${x.ns} · ${x.kind}`, 'object.html?kind=' + enc(x.kind) + '&ns=' + enc(x.ns) + '&name=' + enc(x.name), x.id));
    D.releases.forEach((x) => add('Release', x.name, `${x.ns} · ${x.pack} ${x.version}`, 'release.html?id=' + enc(x.ns + '/' + x.name)));
    D.quotas.forEach((x) => add('Quota', x.name, x.description, 'quotas.html?id=' + enc(x.name)));
    NAV.forEach((g) => g.items.forEach(([, label, , href]) => add('Page', label, g.group, href)));
    SEARCH = s;
    return s;
  }
  function searchFind(q, limit) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/);
    return searchIndex()
      .filter((x) => terms.every((t) => x.hay.includes(t)))
      .sort((a, b) => (a.label.toLowerCase().startsWith(q) ? 0 : 1) - (b.label.toLowerCase().startsWith(q) ? 0 : 1))
      .slice(0, limit || 500);
  }
  function wireSearch() {
    const input = document.getElementById('gsearch');
    const box = document.getElementById('gresults');
    let selIdx = -1;
    let found = [];
    const render = () => {
      found = searchFind(input.value, 12);
      if (!input.value.trim()) {
        box.classList.add('hidden');
        return;
      }
      let html = '';
      let lastType = '';
      found.forEach((r, i) => {
        if (r.type !== lastType) {
          html += `<div class="sr-group">${esc(r.type)}</div>`;
          lastType = r.type;
        }
        html += `<a href="${r.href}" class="${i === selIdx ? 'sel' : ''}"><span>${esc(r.label)}</span><span class="sub">${esc(r.sub)}</span></a>`;
      });
      html += `<a href="search.html?q=${enc(input.value)}" class="${selIdx === found.length ? 'sel' : ''}"><span class="muted">All results for “${esc(input.value)}”</span></a>`;
      if (!found.length) html = `<div class="empty">No object matches “${esc(input.value)}”.</div>` + html;
      box.innerHTML = html;
      box.classList.remove('hidden');
    };
    input.addEventListener('input', () => {
      selIdx = -1;
      render();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        selIdx = Math.min(selIdx + 1, found.length);
        render();
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        selIdx = Math.max(selIdx - 1, -1);
        render();
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (selIdx >= 0 && selIdx < found.length) location.href = found[selIdx].href;
        else location.href = 'search.html?q=' + enc(input.value);
      } else if (e.key === 'Escape') {
        input.blur();
        box.classList.add('hidden');
      }
    });
    input.addEventListener('blur', () => setTimeout(() => box.classList.add('hidden'), 150));
    input.addEventListener('focus', render);
    document.addEventListener('keydown', (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  // ---------------------------------------------------------------- theme, toasts, mock actions
  function currentTheme() {
    const t = document.documentElement.dataset.theme;
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('norca-theme', next);
    } catch (e) {
      /* storage may be off for file:// */
    }
    document.getElementById('theme-btn').innerHTML = icon(next === 'dark' ? 'sun' : 'moon');
  }
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ---------------------------------------------------------------- the frame
  /**
   * shell({nav, title, pretitle, crumbs: [[label, href]], id, chips, sub,
   * conds, actions}) renders the frame and returns the content element.
   */
  function shell(o) {
    document.title = o.title.replace(/<[^>]+>/g, '') + ' · Norca';
    const crumbs = [['eu', 'index.html']].concat(o.crumbs || []);
    const ns = params.get('ns') || '';
    document.body.innerHTML = `<div class="app">
      <aside class="sidebar" aria-label="Main menu">${sidebarHTML(o.nav)}</aside>
      <div class="scrim"></div>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn menu-btn" id="menu-btn" title="Menu">${icon('menu')}</button>
          <div class="scope">Region <select title="Region"><option>eu</option></select>
            Namespace <select title="Namespace" id="ns-sel"><option value="">All</option>${D.namespaces.map((n) => `<option ${n.name === ns ? 'selected' : ''}>${esc(n.name)}</option>`).join('')}</select></div>
          <div class="search">${icon('search')}<input id="gsearch" type="search" autocomplete="off" placeholder="Search nodes, jobs, allocations, IDs, addresses…" aria-label="Global search"><kbd>/</kbd>
            <div id="gresults" class="search-results hidden"></div></div>
          <div class="top-actions">
            <span class="live" title="Event stream connected (mock)"><span class="pulse"></span>Live</span>
            <button class="icon-btn" id="theme-btn" title="Light or dark theme">${icon(currentTheme() === 'dark' ? 'sun' : 'moon')}</button>
            <span class="avatar" title="Signed in as ${esc(D.user.token)}">OA</span>
          </div>
        </header>
        <main class="page">
          <nav class="crumbs" aria-label="Breadcrumbs">${crumbs.map(([l, h], i) => (i ? '<span class="sep">/</span>' : '') + (h ? `<a href="${h}">${esc(l)}</a>` : `<span>${esc(l)}</span>`)).join('')}</nav>
          <div class="page-head">
            <div class="titles">
              ${o.pretitle ? `<div class="pretitle">${o.pretitle}</div>` : ''}
              <h1>${o.titleHTML || esc(o.title)}${o.id ? ` <span class="idtag" title="${esc(o.id)}">${esc(short(o.id))}</span><button class="copy" data-copy="${esc(o.id)}" title="Copy the full ID">${icon('copy')}</button>` : ''}${o.chips || ''}</h1>
              ${o.sub ? `<div class="sub">${o.sub}</div>` : ''}
              ${o.conds ? `<div class="head-conds">${o.conds}</div>` : ''}
            </div>
            ${o.actions ? `<div class="actions">${o.actions}</div>` : ''}
          </div>
          <div id="content"></div>
        </main>
      </div>
    </div>`;
    document.getElementById('theme-btn').addEventListener('click', toggleTheme);
    document.getElementById('menu-btn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    document.querySelector('.scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
    document.getElementById('ns-sel').addEventListener('change', (e) => toast('Mockup: the namespace scope would filter every list (here: ' + (e.target.value || 'all') + ')'));
    document.body.addEventListener('click', (e) => {
      const c = e.target.closest('[data-copy]');
      if (c) {
        const v = c.dataset.copy;
        try {
          navigator.clipboard.writeText(v).then(() => toast('Copied ' + v), () => toast(v));
        } catch (err) {
          toast(v);
        }
      }
      const m = e.target.closest('[data-mock]');
      if (m) {
        e.preventDefault();
        toast('Mockup: ' + m.dataset.mock);
      }
    });
    // Range selectors: the example data holds 24 h of 30-second points drawn as 48 samples.
    document.body.addEventListener('change', (e) => {
      if (e.target.matches && e.target.matches('[data-range]')) toast('Mockup: the example data draws 24 h; the real page would query ' + e.target.value + ' (the store holds ' + retentionHours() + 'h)');
    });
    wireSearch();
    return document.getElementById('content');
  }

  /** A page for an object that is not in data.js. */
  function notFound(nav, what, id, back) {
    const c = shell({ nav, title: what + ' not found', crumbs: [[what, back]] });
    c.innerHTML = alert('warn', `No ${esc(what.toLowerCase())} <code>${esc(id || '(none)')}</code> in the example data. <a href="${back}">Back to the list</a>.`);
  }

  // ---------------------------------------------------------------- shared pages: search, stub
  window.PAGES.search = function () {
    const q = params.get('q') || '';
    const c = shell({ nav: '', title: 'Search', pretitle: 'Global search', crumbs: [['Search', '']] , sub: q ? `Results for <b>${esc(q)}</b>` : 'Type in the search box above' });
    const res = searchFind(q);
    const groups = {};
    res.forEach((r) => (groups[r.type] = groups[r.type] || []).push(r));
    const types = Object.keys(groups);
    c.innerHTML = types.length
      ? `<div class="stack">${types
          .map((t) => card(esc(t), table([{ h: 'Name', f: (r) => `<a href="${r.href}">${esc(r.label)}</a>` }, { h: 'Details', f: (r) => `<span class="muted">${esc(r.sub)}</span>` }], groups[t], { cls: 'compact' }), { flush: true, hint: groups[t].length + ' found' }))
          .join('')}</div>`
      : alert('info', q ? `Nothing matches <b>${esc(q)}</b>. The search covers names, IDs (full or short), addresses and tags of every object in the example data.` : 'Search covers names, IDs (full or short), addresses and tags. Press <kbd>/</kbd> or <kbd>Ctrl</kbd>+<kbd>K</kbd> anywhere.');
  };

  const STUBS = {
    topology: ['Topology', 'Cluster', 'The existing topology view (allocations packed on nodes, D3). The new region map covers the overview; this page stays for the per-node packing.', '7.1', [['Region map', 'region-map.html'], ['Clients', 'nodes.html']]],
    storage: ['Storage', 'Cluster', 'CSI volumes and plugins and host volumes; host volumes link to their node (Node.HostVolumes).', '4.2', [['Clients', 'nodes.html']]],
    endpoints: ['Endpoints and domains', 'Networking', 'External services and domains (existing page). Node IDs there use the nodeName resolver.', '4.2, 8', [['Services', 'services.html']]],
    intentions: ['Intentions and rules', 'Networking', 'Service intentions (graph) and network policies; each rule links its services, each policy the workloads its selector picks.', '1.2, 6.1', [['Services', 'services.html'], ['Service web', 'service.html?id=default%2Fweb']]],
    scaling: ['Scaling policies', 'Governance', 'Task group scaling policies with their decisions and the norca.group.* history; each links its task group, and the NodeGroup checks link here.', '2.2, 6.2', [['Job api', 'job.html?id=api'], ['Job worker', 'job.html?id=worker'], ['Node groups', 'node-groups.html']]],
    admission: ['Admission policies', 'Governance', 'Admission policies and their denials (nomad.nomad.admission.* metrics, not shown today).', '2.3', [['Jobs', 'jobs.html']]],
    access: ['Access control', 'Security', 'Tokens, policies, roles and auth methods; accessor IDs resolve to token names where the token may read them.', '3.2', [['Activity', 'activity.html']]],
    secrets: ['Secrets', 'Security', 'Secrets with their engines and leases (leases link allocation, job and node by name; engines and leases have no page today).', '4.2', [['Jobs', 'jobs.html']]],
    variables: ['Variables', 'Security', 'Variables; nomad/jobs/<job>/... paths link their job. The NodeProvider token variables live here.', '1.2', [['NodeProvider hetzner-eu', 'node-provider.html?id=hetzner-eu']]],
    certificates: ['Certificates', 'Security', 'mTLS roots, CA rotation, distrusted CAs and node certificate expiry. Needs an API first (no API exposes the TLS configuration today).', '4.2, 9 #15', [['Node groups', 'node-groups.html']]],
    backups: ['Backups', 'Operations', 'Backups and restores; restores show requester name, time and mode instead of a restore ID.', '3.2', [['Dashboard', 'index.html'], ['Activity', 'activity.html']]],
    metrics: ['Metrics', 'Operations', 'The metrics page is a real page now.', '2.3, 9 #12', [['Metrics', 'metrics.html']]],
  };
  window.PAGES.stub = function () {
    const p = params.get('p') || '';
    const s = STUBS[p] || ['Page', '', 'Not part of the mockup.', '', [['Dashboard', 'index.html']]];
    const navId = { topology: 'topology', storage: 'storage', endpoints: 'endpoints', intentions: 'intentions', scaling: 'scaling', admission: 'admission', access: 'access', secrets: 'secrets', variables: 'variables', certificates: 'certificates', backups: 'backups', metrics: 'metrics' }[p];
    const c = shell({ nav: navId, title: s[0], pretitle: s[1], crumbs: [[s[1], ''], [s[0], '']], chips: ' <span class="chip neutral nodot">placeholder</span>' });
    const id = params.get('id');
    let extra = '';
    if (p === 'scaling' && id) {
      const pol = D.scalingPolicies.find((x) => x.id === id);
      if (pol) extra = card('Policy ' + esc(id), kv([['Target', link('group', pol.target.job + '|' + pol.target.group)], ['Bounds', `${pol.min} – ${pol.max}`], ['Check', esc(pol.check)], ['Last change', esc(pol.last)]]));
    }
    c.innerHTML = `<div class="stack">${alert('info', `This page is a placeholder: the mockup concentrates on the cluster, workload and platform pages. ${id ? `Requested object: <code>${esc(id)}</code>. ` : ''}<br>What it would show: ${esc(s[2])}`)}
      ${extra}
      ${card('Related pages in the mockup', `<ul class="related">${s[4].map(([l, h]) => `<li><span class="rk">Go to</span><span class="rv"><a href="${h}">${esc(l)}</a></span></li>`).join('')}</ul>`, { flush: true })}</div>`;
  };

  // ---------------------------------------------------------------- export and dispatch
  window.UI = {
    D, IX, NOW, params, esc, enc, short, ago, fmt, hm, when, mhz, mb, pct, plural, icon, chip, condTone, condChip, condTable, condPolarityText,
    worstTone, health, notableConds, link, links, table, card, kv, related, meter, meterRow, allocUsedBar, spark, last, eventsTimeline, alert,
    hcl, json, tabs, wireTabs, listView, uniq, operations, warnings, itemsList, eventLine, shell, notFound, toast, opLink,
    allocsOfNode, allocsOfJob, servicesOfNode, lbsOfNode, scalingOf, phaseLabel, evalTitle, depTitle, jobName, nodeByName, nodeByAddr, groupsOfJob, STATUS_TONE,
    FAMILIES, planned, plannedChart, rangeSelect, retentionHours, RANGE_DEFS, TONE_RANK,
  };

  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    const fn = window.PAGES[page];
    if (fn) {
      try {
        fn();
      } catch (err) {
        document.body.innerHTML = `<pre style="padding:20px;color:#b3261e">Mockup error on page ${esc(page)}: ${esc(err && err.stack ? err.stack : err)}</pre>`;
        throw err;
      }
    } else {
      document.body.textContent = 'Unknown page ' + page;
    }
  });
})();
