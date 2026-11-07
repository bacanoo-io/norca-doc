/* Networking, governance and platform pages: services, load balancers,
   namespaces, quotas, object kinds, custom objects, operators. */
(function () {
  'use strict';
  const U = window.UI;
  const { D, IX, esc, enc, link, links, card, chip, kv, spark, meter, pct, mb, mhz, when, icon, table, related, params } = U;

  // ------------------------------------------------------------ services
  const svcKey = (s) => s.ns + '/' + s.name;
  const checkSummary = (s) => {
    const c = { passing: 0, warning: 0, critical: 0 };
    s.instances.forEach((i) => (c[i[2]] = (c[i[2]] || 0) + 1));
    if (!s.instances.length) return chip('', 'no instances', 'danger');
    return Object.entries(c).filter(([, v]) => v).map(([k, v]) => chip(k, `${v} ${k}`)).join(' ');
  };
  window.PAGES.services = function () {
    const c = U.shell({ nav: 'services', title: 'Services', pretitle: 'Networking', crumbs: [['Networking', ''], ['Services', '']] });
    const el = document.createElement('div');
    c.appendChild(el);
    U.listView(el, {
      rows: D.services,
      cols: [
        { h: 'Service', f: (s) => link('service', svcKey(s)), sort: (s) => s.name },
        { h: 'Namespace', f: (s) => link('ns', s.ns), sort: (s) => s.ns },
        { h: 'Job', f: (s) => link('job', s.job) + ` <span class="faint small">/ ${esc(s.group)}</span>`, sort: (s) => s.job },
        { h: 'Instances', f: checkSummary, sort: (s) => s.instances.length },
        { h: 'Load balancers', f: (s) => links('lb', s.lbs) },
        { h: 'Intentions', f: (s) => { const k = svcKey(s); const i = D.intentions.filter((x) => x.destination === k).length; const o = D.intentions.filter((x) => x.source === k).length; return `<span class="small muted">${i} in · ${o} out</span>`; }, sort: false },
        { h: 'Tags', f: (s) => s.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(' ') },
      ],
      search: (s) => s.name + ' ' + s.tags.join(' '),
      filters: [
        { key: 'ns', label: 'Namespace', options: U.uniq(D.services.map((s) => s.ns)), match: (s, v) => s.ns === v },
        { key: 'lb', label: 'Exposed', options: [['yes', 'through a load balancer'], ['no', 'not exposed']], match: (s, v) => (v === 'yes' ? s.lbs.length > 0 : !s.lbs.length) },
      ],
      rowClass: (s) => (!s.instances.length ? 'row-danger' : ''),
    });
  };

  function intentionGraph(s) {
    const k = svcKey(s);
    const ins = D.intentions.filter((x) => x.destination === k || (x.destination === k && x.source === '*/*'));
    const outs = D.intentions.filter((x) => x.source === k);
    const W = 640;
    const rowH = 30;
    const H = Math.max(ins.length, outs.length, 1) * rowH + 30;
    const cy = H / 2;
    let g = `<rect x="${W / 2 - 70}" y="${cy - 16}" width="140" height="32" rx="16" fill="var(--primary-weak)" stroke="var(--primary)"/><text x="${W / 2}" y="${cy + 4}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--text)">${esc(s.name)}</text>`;
    const node = (x, y, label, action, left) => {
      const [ns, name] = label.split('/');
      const target = IX.service.get(label);
      const col = action === 'deny' ? 'var(--danger-dot)' : 'var(--ok-dot)';
      const lx = left ? x + 130 : x;
      const ex = left ? W / 2 - 70 : W / 2 + 70;
      return `<path d="M${lx} ${y} C ${(lx + ex) / 2} ${y}, ${(lx + ex) / 2} ${cy}, ${ex} ${cy}" stroke="${col}" stroke-width="1.6" fill="none" ${action === 'deny' ? 'stroke-dasharray="4 3"' : ''}/>
        ${target ? `<a href="service.html?id=${enc(label)}">` : ''}<rect x="${x}" y="${y - 12}" width="130" height="24" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/><text x="${x + 8}" y="${y + 4}" font-size="11" fill="var(--text)">${esc(name === '*' ? 'any service' : name)}</text><text x="${x + 122}" y="${y + 4}" font-size="9" text-anchor="end" fill="var(--faint)">${esc(ns === '*' ? '' : ns)}</text>${target ? '</a>' : ''}
        <text x="${(lx + ex) / 2}" y="${(y + cy) / 2 - 3}" font-size="9" text-anchor="middle" fill="${col}">${action}</text>`;
    };
    ins.forEach((x, i) => (g += node(10, 20 + i * rowH, x.source, x.action, true)));
    outs.forEach((x, i) => (g += node(W - 140, 20 + i * rowH, x.destination, x.action, false)));
    if (!ins.length && !outs.length) g += `<text x="10" y="20" font-size="12" fill="var(--muted)">No intentions name this service.</text>`;
    return `<div class="table-wrap"><svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:520px;font-family:var(--sans)" role="img" aria-label="Intentions">${g}</svg></div><div class="legend"><span><i style="background:var(--ok-dot)"></i>allow</span><span><i style="background:var(--danger-dot)"></i>deny</span><span>left: who may call it · right: what it calls</span></div>`;
  }

  window.PAGES.service = function () {
    const s = IX.service.get(params.get('id'));
    if (!s) return U.notFound('services', 'Service', params.get('id'), 'services.html');
    const j = IX.job.get(s.job);
    const nodes = Array.from(new Set(s.instances.map(([a]) => (IX.alloc.get(a) || {}).node)));
    const c = U.shell({
      nav: 'services', title: s.name, pretitle: 'Service', crumbs: [['Networking', ''], ['Services', 'services.html'], [s.name, '']],
      chips: ' ' + checkSummary(s),
      sub: `${link('ns', s.ns)} · job ${link('job', s.job)} / ${link('group', s.job + '|' + s.group, { label: s.group })} · port label <span class="mono">${esc(s.port)}</span> · provider norca`,
    });
    const lbs = s.lbs.map((k) => IX.lb.get(k));
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${!s.instances.length ? U.alert('danger', `No instance is registered: the allocation of ${link('job', s.job)} is not running. See ${link('object', 'data.example.test/PostgresCluster|default|analytics-db')}.`) : ''}
      ${card('Instances', table([
        { h: 'Allocation', f: ([a]) => link('alloc', a) },
        { h: 'Node', f: ([a]) => link('node', (IX.alloc.get(a) || {}).node) },
        { h: 'Datacenter', f: ([a]) => link('dc', (IX.node.get((IX.alloc.get(a) || {}).node) || {}).dc) },
        { h: 'Address', f: ([, addr]) => `<span class="mono small">${esc(addr)}</span>` },
        { h: 'Check', f: ([, , chk]) => chip(chk) },
      ], s.instances, { empty: 'No instances' }), { flush: true, icon: 'allocs', hint: 'node names instead of short IDs' })}
      ${lbs.length ? card('Load balancers', table([
        { h: 'LoadBalancer', f: (l) => link('lb', l.ns + '/' + l.name) },
        { h: 'Ready', f: (l) => U.condChip(l.status.conditions.find((x) => x.type === 'Ready')) },
        { h: 'Addresses', f: (l) => (l.status.addresses.length ? l.status.addresses.map((a) => `<span class="mono small">${esc(a)}</span>`).join('<br>') : '<span class="faint">none</span>') },
        { h: 'Class', f: (l) => link('lbclass', l.spec.class) },
        { h: 'Port', f: (l) => l.spec.port + (l.spec.internal ? ' · internal' : '') },
      ], lbs), { flush: true, icon: 'lb', hint: 'from expose { load_balancer } (new)' }) : ''}
      ${card('Intentions', intentionGraph(s), { icon: 'shieldLock', tools: '<a href="stub.html?p=intentions">Intentions and rules →</a>' })}
      ${s.meta ? card('Service meta', kv(Object.entries(s.meta).map(([k, v]) => [k, `<span class="mono small">${esc(v)}</span>`]))) : ''}
    </div>
    ${related([
      ['Job', link('job', s.job)],
      ['Task group', link('group', s.job + '|' + s.group, { label: s.group })],
      ['Namespace', link('ns', s.ns)],
      ['Nodes', links('node', nodes)],
      ['Load balancers', links('lb', s.lbs), true],
      ['Network policies', s.ns === 'default' ? link('stub', 'intentions', { label: 'default-deny (namespace default)' }) : '', true],
      ['Release', j && j.release ? link('release', j.release) : ''],
    ])}</div>`;
  };

  // ------------------------------------------------------------ load balancers
  const ready = (l) => l.status.conditions.find((x) => x.type === 'Ready');
  window.PAGES.lbs = function () {
    const c = U.shell({ nav: 'lbs', title: 'Load balancers', pretitle: 'Networking · norca.io/LoadBalancer', crumbs: [['Networking', ''], ['Load balancers', '']], sub: 'Created by the LoadBalancer operator for services with <span class="mono">expose { load_balancer }</span>. The menu item appears because the kind is present in the cluster.' });
    c.innerHTML = `<div class="stack">${card('', table([
      { h: 'Name', f: (l) => link('lb', l.ns + '/' + l.name) },
      { h: 'Namespace', f: (l) => link('ns', l.ns) },
      { h: 'Ready', f: (l) => U.condChip(ready(l)) },
      { h: 'Service', f: (l) => link('service', l.ns + '/' + l.spec.service) },
      { h: 'Class', f: (l) => link('lbclass', l.spec.class) },
      { h: 'Port', f: (l) => l.spec.port + (l.spec.internal ? ' <span class="tag">internal</span>' : '') },
      { h: 'Addresses', f: (l) => (l.status.addresses.length ? l.status.addresses.map((a) => `<span class="mono small">${esc(a)}</span>`).join('<br>') : '<span class="faint">none</span>') },
      { h: 'Targets', f: (l) => l.status.targets.length, cls: 'right' },
      { h: 'Leaving nodes', f: (l) => l.status.leavingNodes.length || '<span class="faint">0</span>', cls: 'right' },
    ], D.loadBalancers, { rowClass: (l) => (U.condTone(ready(l)) === 'danger' ? 'row-danger' : '') }), { flush: true })}
    ${card('Load balancer classes', table([
      { h: 'Class', f: (x) => link('lbclass', x.name) + (x.builtin ? ' <span class="tag">native</span>' : '') },
      { h: 'Heartbeat', f: (x) => chip('', U.ago(x.status.lastHeartbeat), U.NOW - Date.parse(x.status.lastHeartbeat) < 60000 ? 'ok' : 'danger') + ` <span class="note">TTL ${esc(x.ttl)}</span>` },
      { h: 'Capabilities', f: (x) => `internal ${x.spec.capabilities.internal ? 'yes' : 'no'} · ports ${esc(x.spec.capabilities.ports || 'any')}` },
      { h: 'Used by', f: (x) => links('lb', D.loadBalancers.filter((l) => l.spec.class === x.name).map((l) => l.ns + '/' + l.name)) },
    ], D.lbClasses), { flush: true, icon: 'lb' })}</div>`;
  };

  window.PAGES.lb = function () {
    const l = IX.lb.get(params.get('id'));
    if (!l) return U.notFound('lbs', 'Load balancer', params.get('id'), 'load-balancers.html');
    const cls = IX.lbclass.get(l.spec.class);
    const svc = IX.service.get(l.ns + '/' + l.spec.service);
    const hbAge = (U.NOW - Date.parse(cls.status.lastHeartbeat)) / 1000;
    const c = U.shell({
      nav: 'lbs', title: l.name, id: l.id, pretitle: 'LoadBalancer · norca.io',
      crumbs: [['Networking', ''], ['Load balancers', 'load-balancers.html'], [l.name, '']],
      chips: ' ' + U.health(l.status.conditions),
      sub: `${link('ns', l.ns)} · service ${link('service', l.ns + '/' + l.spec.service)} · class ${link('lbclass', l.spec.class)} · port ${l.spec.port}${l.spec.internal ? ' · internal' : ''}`,
      conds: l.status.conditions.map(U.condChip).join(''),
      actions: `<button class="btn" data-mock="schema-validated object editor">${icon('edit')}Edit</button>`,
    });
    const r = ready(l);
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${U.condTone(r) === 'danger' ? U.alert('danger', `<b>Not ready (${esc(r.reason)}).</b> ${esc(r.message)}. Change <span class="mono">expose { load_balancer { class } }</span> in job ${link('job', l.owners[0].name)} to a class that offers internal load balancers (${D.lbClasses.filter((x) => x.spec.capabilities.internal).map((x) => link('lbclass', x.name)).join(', ')}).`) : ''}
      ${card('Addresses and targets', `${kv([['Addresses', l.status.addresses.length ? l.status.addresses.map((a) => `<span class="mono">${esc(a)}</span>`).join(', ') : '<span class="faint">none yet</span>'], ['Provider resource', l.status.resource ? `<span class="mono">${esc(l.status.resource)}</span>` : ''], ['Datacenters', l.spec.datacenters.map((d) => link('dc', d)).join(', ')]])}
        <div style="margin-top:10px">${table([
          { h: 'Target', f: (t) => `<span class="mono small">${esc(t)}</span>` },
          { h: 'Node', f: (t) => { const n = U.nodeByAddr.get(t.split(':')[0]); return n ? link('node', n.id) : '—'; } },
          { h: 'Datacenter', f: (t) => { const n = U.nodeByAddr.get(t.split(':')[0]); return n ? link('dc', n.dc) : '—'; } },
          { h: 'Instance', f: (t) => { const i = svc && svc.instances.find((x) => x[1] === t); return i ? link('alloc', i[0]) : '—'; } },
          { h: 'Check', f: (t) => { const i = svc && svc.instances.find((x) => x[1] === t); return i ? chip(i[2]) : '—'; } },
          { h: 'Leaving', f: (t) => { const n = U.nodeByAddr.get(t.split(':')[0]); return n && l.status.leavingNodes.includes(n.id) ? chip('', 'leaving', 'warn') : '<span class="faint">no</span>'; } },
        ], l.status.targets, { cls: 'compact', empty: 'No targets' })}</div>`, { icon: 'lb', hint: 'targets resolved to node names' })}
      ${card('Class ' + esc(cls.name), kv([['Heartbeat', `${chip('', U.ago(cls.status.lastHeartbeat), hbAge < 60 ? 'ok' : 'danger')} <span class="note">TTL ${esc(cls.ttl)} · ${Math.round(hbAge)} s of 60 s</span> ${meter(hbAge, 60, hbAge < 45 ? 'ok' : 'warn')}`], ['Endpoint', `<span class="mono small">${esc(cls.spec.endpoint)}</span>`], ['Capabilities', `internal ${cls.spec.capabilities.internal ? 'yes' : '<b>no</b>'} · ports ${esc(cls.spec.capabilities.ports || 'any')}`], ['Version', esc(cls.status.version)]]), { icon: 'cloud', hint: 'LoadBalancerClass panel (new)' })}
      ${card('Conditions', U.condTable(l.status.conditions), { flush: true })}
      ${card('Health over time', `<div class="grid g2">${U.plannedChart('Targets', 9, { seed: 15, h: 40, note: 'norca.lb.targets' })}${U.plannedChart('Ready', 9, { seed: 16, h: 40, note: 'norca.lb.ready' })}</div>`, { icon: 'chart' })}
      ${card('Events', U.eventsTimeline(l.events), { flush: true })}
    </div>
    ${related([
      ['Service', link('service', l.ns + '/' + l.spec.service), true],
      ['Owner', l.owners.map((o) => link('job', o.name)).join(', ') + ' <span class="faint small">expose { load_balancer }</span>'],
      ['Class', link('lbclass', l.spec.class)],
      ['Nodes', links('node', l.status.targets.map((t) => (U.nodeByAddr.get(t.split(':')[0]) || {}).id).filter(Boolean)), true],
      ['Namespace', link('ns', l.ns)],
      ['Operator', link('job', l.managedBy)],
      ['Kind', link('kind', 'norca.io/LoadBalancer', { full: true })],
    ])}</div>`;
  };

  // ------------------------------------------------------------ namespaces and quotas
  window.PAGES.namespaces = function () {
    const c = U.shell({ nav: 'namespaces', title: 'Namespaces', pretitle: 'Governance', crumbs: [['Governance', ''], ['Namespaces', '']], sub: 'New page: today namespaces are only a selector in the top bar.' });
    c.innerHTML = card('', table([
      { h: 'Namespace', f: (n) => link('ns', n.name) },
      { h: 'Description', f: (n) => `<span class="muted">${esc(n.description)}</span>` },
      { h: 'Quota', f: (n) => { const q = IX.quota.get(n.quota); return q ? `${link('quota', q.name)}<div style="max-width:160px">${meter(q.used.mem, q.limits.mem)}</div><span class="note">memory ${pct(q.used.mem, q.limits.mem)}%</span>` : '<span class="faint">none</span>'; } },
      { h: 'Jobs', f: (n) => `<a href="jobs.html?ns=${enc(n.name)}">${D.jobs.filter((j) => j.ns === n.name && !j.parent).length}</a>`, cls: 'right' },
      { h: 'Services', f: (n) => D.services.filter((s) => s.ns === n.name).length, cls: 'right' },
      { h: 'Default pool', f: (n) => link('pool', n.pools.default) },
      { h: 'Allowed pools', f: (n) => n.pools.allowed.map((p) => link('pool', p)).join(', ') },
    ], D.namespaces), { flush: true });
  };

  window.PAGES.namespace = function () {
    const n = IX.ns.get(params.get('id'));
    if (!n) return U.notFound('namespaces', 'Namespace', params.get('id'), 'namespaces.html');
    const q = IX.quota.get(n.quota);
    const jobs = D.jobs.filter((j) => j.ns === n.name && !j.parent);
    const c = U.shell({ nav: 'namespaces', title: n.name, pretitle: 'Namespace', crumbs: [['Governance', ''], ['Namespaces', 'namespaces.html'], [n.name, '']], sub: esc(n.description) });
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${q ? card('Quota ' + link('quota', q.name), `${U.meterRow('CPU', q.used.cpu, q.limits.cpu, mhz)}${U.meterRow('Memory', q.used.mem, q.limits.mem, mb)}<div class="small muted" style="margin-top:6px">Memory, 7 days</div>${spark([{ v: D.metrics.quotas[q.name].mem, cls: 'a', area: true }], { w: 400, h: 34, fluid: true })}`, { icon: 'gauge', hint: 'norca.quota.* (new: history)' }) : ''}
      ${card('Jobs', table([{ h: 'Job', f: (j) => link('job', j.id) }, { h: 'Type', f: (j) => esc(j.type) }, { h: 'Status', f: U.jobHealth }, { h: 'Pool', f: (j) => link('pool', j.pool) }, { h: 'Owner', f: (j) => (j.owner ? link('object', j.owner.kind + '|' + j.owner.ns + '|' + j.owner.name) : j.release ? link('release', j.release) : '—') }], jobs, { cls: 'compact' }), { flush: true, icon: 'briefcase' })}
      ${card('Services and load balancers', table([{ h: 'Service', f: (s) => link('service', s.ns + '/' + s.name) }, { h: 'Job', f: (s) => link('job', s.job) }, { h: 'Load balancers', f: (s) => links('lb', s.lbs) }], D.services.filter((s) => s.ns === n.name), { cls: 'compact' }), { flush: true, icon: 'service' })}
    </div>
    ${related([
      ['Quota', q ? link('quota', q.name) : ''],
      ['Default pool', link('pool', n.pools.default)],
      ['Allowed pools', n.pools.allowed.map((p) => link('pool', p)).join(', ')],
      ['Releases', links('release', D.releases.filter((r) => r.ns === n.name).map((r) => r.ns + '/' + r.name))],
      ['Objects', links('object', D.objects.filter((o) => o.ns === n.name).map((o) => o.kind + '|' + o.ns + '|' + o.name).concat(D.loadBalancers.filter((l) => l.ns === n.name).map((l) => 'norca.io/LoadBalancer|' + l.ns + '|' + l.name)))],
      ['Allocations', `<a href="allocations.html?ns=${enc(n.name)}">${D.allocations.filter((a) => a.ns === n.name).length}</a>`],
      ['Evaluations', `<a href="evaluations.html?ns=${enc(n.name)}">${D.evaluations.filter((e) => e.ns === n.name).length}</a>`],
    ])}</div>`;
  };

  window.PAGES.quotas = function () {
    const sel = params.get('id');
    const c = U.shell({ nav: 'quotas', title: sel ? 'Quota ' + sel : 'Quotas', pretitle: 'Governance', crumbs: [['Governance', ''], ['Quotas', sel ? 'quotas.html' : '']].concat(sel ? [[sel, '']] : []), sub: 'Usage now and the 7-day history from the metrics store (new: quota pages show the current usage only).' });
    const rows = sel ? D.quotas.filter((q) => q.name === sel) : D.quotas;
    c.innerHTML = `<div class="stack">${rows
      .map((q) =>
        card(
          link('quota', q.name),
          `<div class="grid g2"><div>${U.meterRow('CPU', q.used.cpu, q.limits.cpu, mhz)}${U.meterRow('Memory', q.used.mem, q.limits.mem, mb)}
            <div style="margin-top:8px">${kv([['Namespaces', q.namespaces.map((n) => link('ns', n)).join(', ')], ['Jobs', links('job', D.jobs.filter((j) => q.namespaces.includes(j.ns) && !j.parent).map((j) => j.id))], ['Blocked by quota', '<span class="muted">no evaluation</span>']])}</div></div>
            <div><div class="small muted">CPU allocated, 7 days</div>${spark([{ v: D.metrics.quotas[q.name].cpu, cls: 'a', area: true }], { w: 400, h: 40, fluid: true })}<div class="small muted" style="margin-top:6px">Memory allocated, 7 days</div>${spark([{ v: D.metrics.quotas[q.name].mem, cls: 'a', area: true }], { w: 400, h: 40, fluid: true })}</div></div>`,
          { icon: 'gauge', hint: esc(q.description) }
        )
      )
      .join('')}</div>`;
  };

  // ------------------------------------------------------------ kinds and objects
  /** Every custom object as one row, whatever its kind. */
  function allObjects() {
    const rows = [];
    D.nodeGroups.forEach((g) => rows.push({ kind: 'norca.io/NodeGroup', ns: '', name: g.name, conds: g.status.conditions, managedBy: g.managedBy, owners: [], createdAt: g.createdAt, summary: `${g.status.replicas}/${g.spec.replicas} ready · ${g.spec.datacenter}/${g.spec.pool}` }));
    D.nodeProviders.forEach((p) => rows.push({ kind: 'norca.io/NodeProvider', ns: '', name: p.name, conds: p.status.conditions, managedBy: p.name, owners: [], createdAt: p.createdAt, summary: p.spec.endpoint }));
    D.loadBalancers.forEach((l) => rows.push({ kind: 'norca.io/LoadBalancer', ns: l.ns, name: l.name, conds: l.status.conditions, managedBy: l.managedBy, owners: l.owners, createdAt: l.createdAt, summary: `${l.spec.service}:${l.spec.port} via ${l.spec.class}` }));
    D.lbClasses.forEach((x) => rows.push({ kind: 'norca.io/LoadBalancerClass', ns: '', name: x.name, conds: [], managedBy: 'lb-operator', owners: [], createdAt: '2026-10-30T12:00:00Z', summary: x.spec.endpoint }));
    D.objects.forEach((o) => rows.push({ kind: o.kind, ns: o.ns, name: o.name, conds: o.status.conditions, managedBy: o.managedBy, owners: o.owners, createdAt: o.createdAt, summary: `phase ${o.status.phase}` }));
    return rows;
  }
  const objKey = (r) => r.kind + '|' + r.ns + '|' + r.name;
  const objLink = (r) => (r.kind === 'norca.io/LoadBalancerClass' ? link('lbclass', r.name) : link('object', objKey(r)));

  window.PAGES.objects = function () {
    const c = U.shell({ nav: 'objects', title: 'Objects', pretitle: 'Platform', crumbs: [['Platform', ''], ['Objects', '']], sub: 'Every custom object. Health reads the conditions by their meaning, so a NodeGroup with RollBlocked = True is a warning, not “healthy”. Kinds with a page of their own open it.' });
    const el = document.createElement('div');
    c.appendChild(el);
    const rows = allObjects();
    U.listView(el, {
      rows,
      cols: [
        { h: 'Name', f: objLink, sort: (r) => r.name },
        { h: 'Kind', f: (r) => link('kind', r.kind), sort: (r) => r.kind },
        { h: 'Namespace', f: (r) => (r.ns ? link('ns', r.ns) : '<span class="faint">cluster</span>'), sort: (r) => r.ns },
        { h: 'Health', f: (r) => (r.conds.length ? U.health(r.conds) : '<span class="faint">no conditions</span>'), sort: (r) => -['neutral', 'ok', 'info', 'warn', 'danger'].indexOf(U.worstTone(r.conds)) },
        { h: 'Conditions', f: (r) => U.notableConds(r.conds).map(U.condChip).join(' ') },
        { h: 'Summary', f: (r) => `<span class="small muted">${esc(r.summary)}</span>` },
        { h: 'Managed by', f: (r) => (IX.job.get(r.managedBy) ? link('job', r.managedBy) : esc(r.managedBy)) },
        { h: 'Age', f: (r) => when(r.createdAt), sort: (r) => -Date.parse(r.createdAt) },
      ],
      search: (r) => r.name + ' ' + r.kind + ' ' + r.summary,
      rowClass: (r) => ({ danger: 'row-danger', warn: 'row-warn' })[U.worstTone(r.conds)] || '',
      filters: [
        { key: 'kind', label: 'Kind', options: U.uniq(rows.map((r) => r.kind)), match: (r, v) => r.kind === v },
        { key: 'ns', label: 'Namespace', options: U.uniq(rows.map((r) => r.ns)), match: (r, v) => r.ns === v },
        { key: 'health', label: 'Health', options: [['danger', 'failing'], ['warn', 'warning'], ['info', 'in progress'], ['ok', 'healthy']], match: (r, v) => U.worstTone(r.conds) === v },
        { key: 'label', label: 'Label', options: [['tier=workers'], ['tier=data'], ['team=orders'], ['team=finance']].map(([x]) => [x, x]), match: (r, v) => { const src = D.nodeGroups.find((g) => g.name === r.name) || D.objects.find((o) => o.name === r.name) || {}; const [k, val] = v.split('='); return (src.labels || {})[k] === val; } },
      ],
      foot: 'The label filter maps to the Labels selector of the object list API, unused by the UI today.',
    });
  };

  const KIND_CONDS = {
    'norca.io/NodeGroup': ['ProviderAvailable', 'Provisioned', 'JoinFailing', 'ForeignNode', 'ScaleDownBlocked', 'DeletionBlocked', 'Rolling', 'RollBlocked', 'RollBehind', 'NetworkCovered'],
    'norca.io/NodeProvider': ['Available'],
    'norca.io/LoadBalancer': ['Ready'],
    'norca.io/LoadBalancerClass': [],
    'data.example.test/PostgresCluster': ['Ready', 'Degraded', 'Progressing', 'Drifted'],
  };

  window.PAGES.kinds = function () {
    const c = U.shell({ nav: 'kinds', title: 'Type definitions', pretitle: 'Platform · object kinds', crumbs: [['Platform', ''], ['Type definitions', '']], actions: `<button class="btn primary" data-mock="kind editor (schema, rules, columns, conditions)">${icon('plus')}New kind</button>` });
    const rows = allObjects();
    c.innerHTML = card('', table([
      { h: 'Kind', f: (k) => link('kind', k.group + '/' + k.kind) + `<div class="note mono">${esc(k.group)}</div>` },
      { h: 'Scope', f: (k) => (k.namespaced ? 'namespaced' : 'cluster') },
      { h: 'Defined by', f: (k) => (k.builtIn ? '<span class="tag">built in</span>' : link('release', k.release)) },
      { h: 'Reconciled by', f: (k) => link('job', k.operator) },
      { h: 'Objects', f: (k) => { const os = rows.filter((r) => r.kind === k.group + '/' + k.kind); const t = {}; os.forEach((o) => { const x = U.worstTone(o.conds); t[x] = (t[x] || 0) + 1; }); return `<a href="objects.html?kind=${enc(k.group + '/' + k.kind)}">${os.length}</a> ` + Object.entries(t).filter(([x]) => x !== 'neutral').map(([x, n]) => `<span class="dot ${x}" title="${x}: ${n}"></span>`).join(' '); } },
      { h: 'Description', f: (k) => `<span class="small muted">${esc(k.description)}</span>` },
    ], D.kinds), { flush: true });
  };

  window.PAGES.kind = function () {
    const k = IX.kind.get(params.get('id'));
    if (!k) return U.notFound('kinds', 'Kind', params.get('id'), 'kinds.html');
    const key = k.group + '/' + k.kind;
    const objs = allObjects().filter((r) => r.kind === key);
    const conds = KIND_CONDS[key] || [];
    const c = U.shell({
      nav: 'kinds', title: k.kind, pretitle: 'Object kind · ' + esc(k.group), crumbs: [['Platform', ''], ['Type definitions', 'kinds.html'], [k.kind, '']],
      chips: k.builtIn ? ' <span class="chip neutral nodot">built in</span>' : '',
      sub: `${esc(k.description)} · ${k.namespaced ? 'namespaced' : 'cluster-scoped'}`,
      actions: k.builtIn ? '' : `<button class="btn" data-mock="kind editor">${icon('edit')}Edit</button>`,
    });
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${card('Objects', table([
        { h: 'Name', f: objLink },
        { h: 'Namespace', f: (r) => (r.ns ? link('ns', r.ns) : '<span class="faint">cluster</span>') },
        { h: 'Health', f: (r) => (r.conds.length ? U.health(r.conds) : '—') },
        { h: 'Conditions', f: (r) => U.notableConds(r.conds).map(U.condChip).join(' ') },
        { h: k.columns.join(' · '), f: (r) => `<span class="small muted">${esc(r.summary)}</span>` },
      ], objs, { cls: 'compact' }), { flush: true, icon: 'objects', hint: 'columns: ' + esc(k.columns.join(', ')) })}
      ${card('Conditions and their meaning', conds.length ? table([
        { h: 'Condition', f: (t) => `<span class="mono">${esc(t)}</span>` },
        { h: 'True', f: (t) => U.condChip({ type: t, status: 'True' }) },
        { h: 'False', f: (t) => U.condChip({ type: t, status: 'False' }) },
        { h: 'Meaning', f: (t) => esc(U.condPolarityText(t)) },
      ], conds, { cls: 'compact' }) : '<span class="muted">This kind reports no conditions.</span>', { flush: !!conds.length, icon: 'info', hint: 'proposal: a Conditions hint in the kind definition' })}
      ${card('Definition', `<pre class="code">${U.hcl(`kind "${k.kind}" {\n  group      = "${k.group}"\n  namespaced = ${k.namespaced}\n\n  columns = [${k.columns.map((x) => '"' + x + '"').join(', ')}]\n${conds.length ? `\n  conditions {\n${conds.map((t) => `    ${t.padEnd(18)} = "${{ danger: 'true-is-bad', warn: 'true-is-warning', info: 'true-is-progress' }[U.condTone({ type: t, status: 'True' })] || 'true-is-good'}"`).join('\n')}\n  }\n` : ''}${k.webhooks.length ? `\n  webhook = "${k.webhooks[0]}"\n` : ''}\n  schema = file("${k.kind.toLowerCase()}.schema.json")\n}`)}</pre>`, { hint: 'the conditions block is the proposed polarity hint' })}
    </div>
    ${related([
      ['Defined by', k.builtIn ? 'the core (registered by the leader)' : link('release', k.release), !k.builtIn],
      ['Reconciled by', link('job', k.operator), true],
      ['Webhooks', k.webhooks.map((w) => `<span class="mono small">${esc(w)}</span>`).join('<br>')],
      ['Objects', `<a href="objects.html?kind=${enc(key)}">${objs.length}</a>`],
      ['Page', k.page ? `<a href="${k.page.replace('.html', 's.html').replace('node-groups.html', 'node-groups.html')}">kind-specific list</a>` : 'generic object page'],
    ])}</div>`;
  };

  window.PAGES.object = function () {
    const kind = params.get('kind') || '';
    const name = params.get('name') || '';
    const ns = params.get('ns') || '';
    if (kind === 'norca.io/NodeGroup') return location.replace('node-group.html?id=' + enc(name));
    if (kind === 'norca.io/NodeProvider') return location.replace('node-provider.html?id=' + enc(name));
    if (kind === 'norca.io/LoadBalancer') return location.replace('load-balancer.html?id=' + enc(ns + '/' + name));
    if (kind === 'norca.io/LoadBalancerClass') return lbClassPage(name);
    const o = IX.object.get(kind + '|' + ns + '|' + name) || D.objects.find((x) => x.kind === kind && x.name === name);
    if (!o) return U.notFound('objects', 'Object', kind + ' ' + name, 'objects.html');
    const owned = D.jobs.filter((j) => j.owner && j.owner.kind === o.kind && j.owner.name === o.name);
    const k = IX.kind.get(o.kind);
    const c = U.shell({
      nav: 'objects', title: o.name, id: o.id, pretitle: esc(o.kind),
      crumbs: [['Platform', ''], ['Objects', 'objects.html'], [o.kind.split('/')[1], 'objects.html?kind=' + enc(o.kind)], [o.name, '']],
      chips: ' ' + U.health(o.status.conditions),
      sub: `${link('ns', o.ns)} · kind ${link('kind', o.kind, { full: true })} · generation ${o.generation} · managed by ${link('job', o.managedBy)} · created ${when(o.createdAt)}`,
      conds: U.notableConds(o.status.conditions).map(U.condChip).join(''),
      actions: `<button class="btn" data-mock="schema-validated editor with dry run">${icon('edit')}Edit</button><button class="btn danger" data-mock="delete (finalizers run first)">Delete</button>`,
    });
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${card('Conditions', U.condTable(o.status.conditions), { flush: true, hint: 'coloured by meaning' })}
      ${card('Owns', table([{ h: 'Job', f: (j) => link('job', j.id) }, { h: 'Status', f: U.jobHealth }, { h: 'Allocations', f: (j) => U.allocsOfJob(j.id).map((a) => link('alloc', a.id) + ' ' + chip(a.status)).join('<br>') }], owned, { cls: 'compact', empty: 'Owns nothing' }), { flush: true, icon: 'topology', hint: 'jobs with meta norca.owner' })}
      <div class="grid g2">${card('Spec', `<pre class="code">${U.json(o.spec)}</pre>`)}${card('Status', `<pre class="code">${U.json(Object.assign({}, o.status, { conditions: undefined }))}</pre>`)}</div>
      ${card('Events', U.eventsTimeline(o.events), { flush: true })}
    </div><div class="stack">
    ${related([
      ['Kind', link('kind', o.kind, { full: true })],
      ['Namespace', link('ns', o.ns)],
      ['Managed by', link('job', o.managedBy)],
      ['Installed by', k && k.release ? link('release', k.release) : ''],
      ['Owns jobs', links('job', owned.map((j) => j.id))],
      ['Services', links('service', D.services.filter((s) => owned.some((j) => j.id === s.job)).map((s) => s.ns + '/' + s.name))],
      ['Nodes', links('node', Array.from(new Set(owned.flatMap((j) => U.allocsOfJob(j.id).filter((a) => a.status !== 'failed').map((a) => a.node)))))],
    ])}
    ${card('Labels and finalizers', kv([['Labels', Object.entries(o.labels).map(([a, b]) => `<a class="tag" href="objects.html?label=${enc(a + '=' + b)}">${esc(a)}=${esc(b)}</a>`).join(' ')], ['Finalizers', o.finalizers.map((f) => `<span class="tag">${esc(f)}</span>`).join(' ')], ['Owners', o.owners.length ? '' : '<span class="muted">none</span>']]))}
    </div></div>`;
  };

  function lbClassPage(name) {
    const x = IX.lbclass.get(name);
    if (!x) return U.notFound('lbs', 'LoadBalancerClass', name, 'load-balancers.html');
    const age = (U.NOW - Date.parse(x.status.lastHeartbeat)) / 1000;
    const users = D.loadBalancers.filter((l) => l.spec.class === x.name);
    const c = U.shell({
      nav: 'lbs', title: x.name, id: x.id, pretitle: 'LoadBalancerClass · norca.io',
      crumbs: [['Networking', ''], ['Load balancers', 'load-balancers.html'], [x.name, '']],
      chips: ' ' + chip('', age < 60 ? 'available' : 'stale', age < 60 ? 'ok' : 'danger'),
      sub: `<span class="mono">${esc(x.spec.endpoint)}</span> · version ${esc(x.status.version)}`,
    });
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${card('Heartbeat', `${kv([['Last heartbeat', `${esc(U.fmt(x.status.lastHeartbeat))} (${esc(U.ago(x.status.lastHeartbeat))})`], ['TTL', esc(x.ttl)]])}<div style="margin-top:8px">${meter(age, 60, age < 45 ? 'ok' : 'warn')}<span class="note">${Math.round(age)} s of the 60 s TTL</span></div>`, { icon: 'activity', hint: 'heartbeat age vs TTL' })}
      ${card('Capabilities', kv([['Internal load balancers', x.spec.capabilities.internal ? 'yes' : 'no'], ['Frontend ports', esc(x.spec.capabilities.ports || 'any')], ['Token', x.spec.tokenVariable ? link('variable', x.spec.tokenVariable) : '']]))}
      ${card('Load balancers of this class', table([{ h: 'LoadBalancer', f: (l) => link('lb', l.ns + '/' + l.name) }, { h: 'Ready', f: (l) => U.condChip(ready(l)) }, { h: 'Service', f: (l) => link('service', l.ns + '/' + l.spec.service) }], users, { cls: 'compact', empty: 'None' }), { flush: true })}
    </div>
    ${related([['Load balancers', links('lb', users.map((l) => l.ns + '/' + l.name))], ['Installed by', link('release', x.release)], ['Operator', link('job', 'lb-operator')], ['Kind', link('kind', 'norca.io/LoadBalancerClass', { full: true })]])}</div>`;
  }

  // ------------------------------------------------------------ operators (inferred)
  window.PAGES.operators = function () {
    const c = U.shell({ nav: 'operators', title: 'Operators', pretitle: 'Platform', crumbs: [['Platform', ''], ['Operators', '']], sub: 'Operators have no registry object in the API. This page infers them from what identifies one today: the job that runs it, the release that installed it, the kinds whose objects name it in ManagedBy, and the reporter of the object events.' });
    const objs = allObjects();
    const reporterEvents = (rep) => D.nodeGroups.flatMap((g) => g.events).concat(D.nodeProviders.flatMap((p) => p.events), D.loadBalancers.flatMap((l) => l.events), D.objects.flatMap((o) => o.events)).filter((e) => e.reporter === rep).sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
    const ops = [
      { name: 'nodescaler-operator', job: 'nodescaler-operator', kinds: ['norca.io/NodeGroup', 'norca.io/NodeProvider'], metrics: 'norca_controller_reconcile_total, _queue_depth, norca_nodescaler_orphaned_instances' },
      { name: 'lb-operator', job: 'lb-operator', kinds: ['norca.io/LoadBalancer', 'norca.io/LoadBalancerClass'], metrics: 'norca_controller_reconcile_total, _queue_depth' },
      { name: 'pg-operator', job: 'pg-operator', kinds: ['data.example.test/PostgresCluster'], metrics: 'norca_controller_reconcile_total' },
      { name: 'autoscaler', job: null, kinds: ['norca.io/NodeGroup'], metrics: 'nomad.nomad.autoscaler.* (agent /v1/metrics)' },
    ];
    c.innerHTML = `<div class="stack">${card('', table([
      { h: 'Operator', f: (o) => `<b>${esc(o.name)}</b>` + (o.job ? '' : ' <span class="tag">built in, runs on the leader</span>') },
      { h: 'Runs as', f: (o) => (o.job ? link('job', o.job) + '<div>' + U.allocsOfJob(o.job).filter((a) => a.status === 'running').map((a) => link('alloc', a.id) + ' on ' + link('node', a.node)).join('<br>') + '</div>' : link('server', D.servers.find((s) => s.leader).name)) },
      { h: 'Installed by', f: (o) => (o.job && IX.job.get(o.job).release ? link('release', IX.job.get(o.job).release) : '<span class="faint">—</span>') },
      { h: 'Kinds', f: (o) => o.kinds.map((k) => link('kind', k)).join(', ') },
      { h: 'Objects', f: (o) => { const mine = objs.filter((r) => o.kinds.includes(r.kind)); const bad = mine.filter((r) => ['warn', 'danger'].includes(U.worstTone(r.conds))).length; return `${mine.length}${bad ? ' · ' + chip('', bad + ' with problems', 'warn') : ''}`; } },
      { h: 'Last event', f: (o) => { const e = reporterEvents(o.name)[0]; return e ? `<span class="mono small">${esc(e.reason)}</span> ${when(e.time)}` : '<span class="faint">—</span>'; } },
      { h: 'Metrics', f: (o) => `<span class="small muted">${esc(o.metrics)}</span>` },
    ], ops), { flush: true, foot: 'Controller metrics live on the operator’s own /metrics port and are not reachable through the agent today. A status summary in the objects or an agent proxy would fill the Metrics column with values.' })}</div>`;
  };
})();
