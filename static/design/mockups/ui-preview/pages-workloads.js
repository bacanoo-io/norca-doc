/* Workload pages: jobs, task groups, allocations, evaluations, deployments, packages (releases). */
(function () {
  'use strict';
  const U = window.UI;
  const { D, IX, esc, enc, link, links, card, chip, kv, spark, meter, pct, mb, mhz, when, icon, table, related, params } = U;

  const STATUS_COLORS = [['running', 'var(--ok-dot)'], ['pending', 'var(--info-dot)'], ['complete', 'var(--neutral-dot)'], ['failed', 'var(--danger-dot)'], ['lost', 'var(--warn-dot)']];
  function queued(j) {
    if (j.type !== 'service') return 0;
    const live = U.allocsOfJob(j.id).filter((a) => a.desired === 'run' && ['running', 'pending'].includes(a.status)).length;
    return Math.max(0, j.groups.reduce((s, g) => s + g.count, 0) - live);
  }
  function allocBar(allocs, q, w) {
    const counts = {};
    allocs.forEach((a) => (counts[a.status] = (counts[a.status] || 0) + 1));
    const total = allocs.length + (q || 0) || 1;
    return `<div class="stackbar" style="width:${w || 120}px">${STATUS_COLORS.map(([s, col]) => (counts[s] ? `<span style="width:${(counts[s] / total) * 100}%;background:${col}" title="${s}: ${counts[s]}"></span>` : '')).join('')}${q ? `<span style="width:${(q / total) * 100}%;background:repeating-linear-gradient(45deg,var(--warn-dot),var(--warn-dot) 3px,transparent 3px,transparent 6px)" title="queued: ${q}"></span>` : ''}</div>
      <div class="note">${STATUS_COLORS.filter(([s]) => counts[s]).map(([s]) => `${counts[s]} ${s}`).join(' · ')}${q ? ` · <span style="color:var(--warn)">${q} queued</span>` : ''}</div>`;
  }
  const jobHealth = (j) => {
    const al = U.allocsOfJob(j.id);
    if (al.some((a) => a.status === 'failed' && a.desired === 'stop' && a.next)) return chip('', 'recovering', 'warn');
    if (queued(j)) return chip('', 'queued work', 'warn');
    if (D.deployments.some((d) => d.job === j.id && d.status === 'running')) return chip('', 'deploying', 'info');
    if (j.status === 'dead') return chip('dead', al.some((a) => a.status === 'failed') ? 'dead · failed' : 'dead · complete', al.some((a) => a.status === 'failed') ? 'danger' : 'neutral');
    return chip(j.status);
  };

  // ------------------------------------------------------------ jobs
  window.PAGES.jobs = function () {
    const c = U.shell({ nav: 'jobs', title: 'Jobs', pretitle: 'Workloads', crumbs: [['Workloads', ''], ['Jobs', '']], actions: `<a class="btn primary" href="job-edit.html?new=1">${icon('plus')}Run job</a>` });
    const el = document.createElement('div');
    c.appendChild(el);
    U.listView(el, {
      rows: D.jobs.filter((j) => !j.parent),
      cols: [
        { h: 'Job', f: (j) => link('job', j.id) + (j.periodic ? ` <span class="tag" title="periodic">${esc(j.periodic)}</span>` : '') + (j.children ? `<div class="note">${j.children.length} runs</div>` : ''), sort: (j) => j.name },
        { h: 'Namespace', f: (j) => link('ns', j.ns), sort: (j) => j.ns },
        { h: 'Type', f: (j) => esc(j.type), sort: (j) => j.type },
        { h: 'Status', f: jobHealth, sort: (j) => j.status },
        { h: 'Allocations', f: (j) => allocBar(U.allocsOfJob(j.id).filter((a) => a.desired === 'run' || a.status !== 'running'), queued(j)), sort: (j) => U.allocsOfJob(j.id).length },
        { h: 'Version', f: (j) => 'v' + j.version, sort: (j) => j.version },
        { h: 'Node pool', f: (j) => link('pool', j.pool), sort: (j) => j.pool },
        { h: 'Owner', f: (j) => (j.owner ? link('object', j.owner.kind + '|' + j.owner.ns + '|' + j.owner.name, { icon: true }) : j.release ? link('release', j.release, { icon: true }) : '<span class="faint">—</span>'), sort: (j) => (j.owner ? j.owner.name : j.release || '') },
        { h: 'Submitted', f: (j) => when(j.submittedAt), sort: (j) => -Date.parse(j.submittedAt) },
      ],
      search: (j) => j.name + ' ' + Object.values(j.meta || {}).join(' '),
      searchPlaceholder: 'Filter by name or meta',
      sortIdx: 0,
      filters: [
        { key: 'ns', label: 'Namespace', options: U.uniq(D.jobs.map((j) => j.ns)), match: (j, v) => j.ns === v },
        { key: 'type', label: 'Type', options: U.uniq(D.jobs.map((j) => j.type)), match: (j, v) => j.type === v },
        { key: 'status', label: 'Status', options: [['running', 'running'], ['dead', 'dead'], ['queued', 'with queued work']], match: (j, v) => (v === 'queued' ? queued(j) > 0 : j.status === v) },
        { key: 'pool', label: 'Node pool', options: U.uniq(D.jobs.map((j) => j.pool)), match: (j, v) => j.pool === v },
        { key: 'owner', label: 'Owned by', options: [['release', 'a release'], ['object', 'a custom object'], ['none', 'nothing']], match: (j, v) => (v === 'release' ? !!j.release : v === 'object' ? !!j.owner : !j.release && !j.owner) },
      ],
      foot: 'Owner uses the job meta norca.owner (custom object) and the resources of releases. The API filter expression (e.g. Meta["norca.owner"]) would back the “Owned by” filter.',
    });
  };

  function jobHCL(j) {
    let s = `job "${j.name}" {\n  namespace   = "${j.ns}"\n  type        = "${j.type}"\n  node_pool   = "${j.pool}"\n  datacenters = [${j.datacenters.map((d) => '"' + d + '"').join(', ')}]\n  priority    = ${j.priority}\n`;
    if (j.periodic) s += `\n  periodic {\n    crons            = ["${j.periodic}"]\n    prohibit_overlap = true\n  }\n`;
    const meta = Object.entries(j.meta || {});
    if (meta.length) s += `\n  meta {\n${meta.map(([k, v]) => `    "${k}" = "${v}"`).join('\n')}\n  }\n`;
    for (const g of j.groups) {
      s += `\n  group "${g.name}" {\n    count = ${g.count}\n`;
      if (g.update) s += `\n    update {\n      max_parallel = ${g.update.max_parallel}\n      auto_revert  = ${g.update.auto_revert}\n    }\n`;
      const svc = D.services.find((x) => x.job === j.id && x.group === g.name);
      if (svc) {
        s += `\n    service {\n      name = "${svc.name}"\n      port = "${svc.port}"\n      tags = [${svc.tags.map((t) => '"' + t + '"').join(', ')}]\n`;
        if (g.expose) {
          const lb = D.loadBalancers.find((l) => l.name === g.expose.load_balancer);
          s += `\n      expose {\n        load_balancer {\n          class    = "${lb.spec.class}"\n          port     = ${lb.spec.port}\n          internal = ${lb.spec.internal}\n        }\n      }\n`;
        }
        s += `    }\n`;
      }
      for (const t of g.tasks) {
        s += `\n    task "${t.name}" {\n      driver = "${t.driver}"\n\n      config {\n        ${t.driver === 'docker' ? 'image' : 'command'} = "${t.image}"\n      }\n\n      resources {\n        cpu    = ${g.cpu}\n        memory = ${g.mem}\n      }\n    }\n`;
      }
      s += `  }\n`;
    }
    return s + '}\n';
  }
  U.jobHCL = jobHCL;

  function groupSeries(seed) {
    const out = [];
    let s = seed;
    for (let i = 0; i < 48; i++) {
      s = (s * 9301 + 49297) % 233280;
      out.push(35 + 20 * Math.sin(i / 7 + seed) + (s / 233280) * 15);
    }
    return out;
  }

  window.PAGES.job = function () {
    const j = IX.job.get(params.get('id'));
    if (!j) return U.notFound('jobs', 'Job', params.get('id'), 'jobs.html');
    const allocs = U.allocsOfJob(j.id);
    const deps = D.deployments.filter((d) => d.job === j.id).sort((a, b) => b.version - a.version);
    const evals = D.evaluations.filter((e) => e.job === j.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const svcs = D.services.filter((s) => s.job === j.id);
    const lbs = svcs.flatMap((s) => s.lbs);
    const pols = D.scalingPolicies.filter((p) => p.target.job === j.id);
    const ns = IX.ns.get(j.ns);
    const q = queued(j);
    const blocked = evals.find((e) => e.status === 'blocked');
    const parent = j.parent ? IX.job.get(j.parent) : null;
    const dcs = D.datacenters.filter((d) => U.dcMatch(j.datacenters, d.name)).map((d) => d.name);
    const poolGroups = D.nodeGroups.filter((g) => g.spec.pool === j.pool && dcs.includes(g.spec.datacenter));
    const c = U.shell({
      nav: 'jobs', title: j.name, pretitle: `Job · ${esc(j.type)}${j.periodic ? ' · periodic' : ''}`,
      crumbs: [['Workloads', ''], ['Jobs', 'jobs.html']].concat(parent ? [[parent.name, 'job.html?id=' + enc(parent.id)]] : []).concat([[j.name.replace(/^.*\//, ''), '']]),
      chips: ' ' + jobHealth(j),
      sub: `${link('ns', j.ns)} · version ${j.version} · pool ${link('pool', j.pool)} · datacenters ${dcs.map((d) => link('dc', d)).join(', ')} · priority ${j.priority} · submitted ${when(j.submittedAt)}`,
      actions: `<a class="btn primary" href="job-edit.html?id=${enc(j.id)}">${icon('edit')}Edit</a><button class="btn" data-mock="scale dialog per task group">${icon('scale')}Scale</button><button class="btn danger" data-mock="stop job (confirm)">${icon('stop')}Stop</button>`,
    });

    let banners = '';
    if (j.owner) banners += U.alert('info', `Managed by ${link('object', j.owner.kind + '|' + j.owner.ns + '|' + j.owner.name)} <span class="badge-kind">${esc(j.owner.kind)}</span> through ${link('job', j.meta['norca.managed-by'])}. Changes made here are overwritten by the operator (meta <span class="mono">norca.owner</span>).`);
    if (j.release) banners += U.alert('info', `Installed by release ${link('release', j.release)}. Edit the release values instead of the job, or the release reports <span class="mono">Drifted</span>.`);
    if (blocked) banners += U.alert('warn', `<b>${q} allocation${q === 1 ? '' : 's'} queued.</b> ${link('eval', blocked.id)} is blocked: ${esc(blocked.desc)}. ${poolGroups.length ? 'Node groups that can add capacity: ' + poolGroups.map((g) => link('nodegroup', g.name) + ' ' + U.health(g.status.conditions)).join(', ') + '.' : ''}`);

    const groupsCard = card(
      'Task groups',
      table(
        [
          { h: 'Group', f: (g) => link('group', j.id + '|' + g.name, { label: g.name }) },
          { h: 'Count', f: (g) => g.count, cls: 'right' },
          { h: 'Allocations', f: (g) => allocBar(allocs.filter((a) => a.group === g.name && (a.desired === 'run' || a.status !== 'running')), j.type === 'service' ? Math.max(0, g.count - allocs.filter((a) => a.group === g.name && a.desired === 'run' && ['running', 'pending'].includes(a.status)).length) : 0) },
          { h: 'Resources', f: (g) => `${mhz(g.cpu)} · ${mb(g.mem)}` },
          { h: 'CPU 24 h', f: (g) => spark([{ v: groupSeries(g.cpu % 97), cls: 'u', area: true }], { w: 110, h: 22 }) },
        ],
        j.groups,
        { cls: 'compact' }
      ),
      { flush: true, icon: 'allocs', hint: 'norca.group.* from the metrics store' }
    );
    const latest = deps[0];
    const depCard = latest
      ? card(
          'Latest deployment',
          `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${link('deployment', latest.id)} ${chip(latest.status, latest.status, latest.status === 'running' ? 'info' : undefined)} <span class="muted small">${esc(latest.desc)}</span></div>
          ${latest.groups.map((g) => `<div class="meter-row" style="grid-template-columns:90px 1fr 110px;margin-top:8px"><span>${esc(g.name)}</span>${meter(g.healthy, g.desired, 'ok')}<span class="v">${g.healthy} / ${g.desired} healthy</span></div>`).join('')}`,
          { icon: 'deploy', tools: `<a href="?id=${enc(j.id)}&tab=deployments">All deployments →</a>` }
        )
      : '';
    const allocCols = [
      { h: 'Allocation', f: (a) => link('alloc', a.id) },
      { h: 'Node', f: (a) => link('node', a.node) },
      { h: 'Status', f: (a) => chip(a.status) + (a.desired === 'stop' && a.status === 'running' ? ' ' + chip('', 'stopping', 'neutral') : '') },
      { h: 'Version', f: (a) => 'v' + a.version },
      { h: 'Created', f: (a) => when(a.createdAt) },
    ];
    const overview = `<div class="with-rail"><div class="stack">
      ${banners}
      ${groupsCard}
      ${depCard}
      ${card('Recent allocations', table(allocCols, allocs.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6), { cls: 'compact' }), { flush: true, icon: 'allocs', tools: `<a href="allocations.html?job=${enc(j.id)}">All, with filters →</a>` })}
      ${j.children ? card('Runs', table([{ h: 'Run', f: (id) => link('job', id) }, { h: 'Status', f: (id) => jobHealth(IX.job.get(id)) }, { h: 'Launched', f: (id) => when(IX.job.get(id).submittedAt) }], j.children, { cls: 'compact' }), { flush: true, icon: 'clock' }) : ''}
    </div>
    ${related([
      ['Namespace', link('ns', j.ns)],
      ['Quota', ns && ns.quota ? link('quota', ns.quota) : '', true],
      ['Node pool', link('pool', j.pool), true],
      ['Datacenters', dcs.map((d) => link('dc', d)).join(', ')],
      ['Release', j.release ? link('release', j.release) : '', true],
      ['Owner object', j.owner ? link('object', j.owner.kind + '|' + j.owner.ns + '|' + j.owner.name) : ''],
      ['Parent job', parent ? link('job', parent.id) : ''],
      ['Scaling policies', pols.map((p) => link('policy', p.id, { label: `${p.target.group}: ${p.check}` })).join('<br>'), true],
      ['Services', links('service', svcs.map((s) => s.ns + '/' + s.name))],
      ['Load balancers', links('lb', lbs), true],
      ['Deployments', `<a href="?id=${enc(j.id)}&tab=deployments">${deps.length}</a>${latest ? ' · latest ' + link('deployment', latest.id) : ''}`],
      ['Evaluations', `<a href="evaluations.html?job=${enc(j.id)}">${evals.length}</a>${blocked ? ' · ' + chip('blocked') : ''}`],
      ['Node groups', links('nodegroup', poolGroups.map((g) => g.name)), true],
      ['Clients', links('node', Array.from(new Set(allocs.filter((a) => a.status === 'running').map((a) => a.node))))],
    ])}</div>`;

    const tgPane = j.groups
      .map((g) => {
        const ga = allocs.filter((a) => a.group === g.name);
        const svc = svcs.find((s) => s.group === g.name);
        const pol = pols.find((p) => p.target.group === g.name);
        return card(
          `Task group ${esc(g.name)}`,
          `<div class="kv-cols">${kv([
            ['Count', g.count],
            ['Resources per allocation', `${mhz(g.cpu)}, ${mb(g.mem)}`],
            ['Tasks', g.tasks.map((t) => `<b>${esc(t.name)}</b> <span class="tag">${esc(t.driver)}</span> <span class="mono small">${esc(t.image)}</span>`).join('<br>')],
            ['Update', g.update ? `max_parallel ${g.update.max_parallel}, auto_revert ${g.update.auto_revert}` : ''],
          ])}${kv([
            ['Service', svc ? link('service', svc.ns + '/' + svc.name) : ''],
            ['expose { load_balancer }', g.expose ? link('lb', (svc ? svc.ns : j.ns) + '/' + g.expose.load_balancer) : ''],
            ['Scaling policy', pol ? link('policy', pol.id, { label: pol.check + ` (${pol.min}–${pol.max})` }) : ''],
            ['Variables', `<a href="stub.html?p=variables&id=${enc('nomad/jobs/' + j.id + '/' + g.name)}" class="mono small">nomad/jobs/${esc(j.id)}/${esc(g.name)}</a>`],
          ])}</div>
          <div class="grid g3" style="margin-top:12px">
            <div><div class="small muted">CPU MHz avg / max (24 h)</div>${spark([{ v: groupSeries(g.cpu % 89), cls: 'u', area: true }, { v: groupSeries(g.cpu % 89).map((x) => x + 12), cls: 'a' }], { w: 220, h: 36, fluid: true })}</div>
            <div><div class="small muted">Memory MB avg / max</div>${spark([{ v: groupSeries(g.mem % 83), cls: 'u', area: true }, { v: groupSeries(g.mem % 83).map((x) => x + 9), cls: 'a' }], { w: 220, h: 36, fluid: true })}</div>
            <div><div class="small muted">allocs_running vs allocs_queued</div>${spark([{ v: Array.from({ length: 48 }, () => (g.count - 1) * 20 + 20), cls: 'a' }, { v: Array.from({ length: 48 }, (_, i) => (q && i > 40 ? 20 : 0)), cls: 'bl' }], { w: 220, h: 36, fluid: true })}</div>
          </div>
          <div class="grid g2" style="margin-top:10px">${U.plannedChart('Failed, lost and starting allocations; restarts', 6, { seed: 13, h: 40, note: 'norca.group.allocs_{failed,lost,starting}, restarts' })}${U.plannedChart('Peak memory and swap', 6, { seed: 14, h: 40, note: 'norca.group.memory_peak_mb, memory_swap_mb (needs a client report change)' })}</div>
          <div style="margin-top:12px">${table(allocCols, ga, { cls: 'compact' })}</div>`,
          { id: 'tg-' + g.name, icon: 'allocs', hint: 'norca.group.{cpu_mhz,memory_mb,allocs_running,allocs_queued}' }
        );
      })
      .join('');

    c.innerHTML = `${U.tabs([['overview', 'Overview'], ['groups', 'Task groups', j.groups.length], ['allocations', 'Allocations', allocs.length], ['deployments', 'Deployments', deps.length], ['evaluations', 'Evaluations', evals.length], ['services', 'Services', svcs.length], ['definition', 'Definition']], 'overview')}
      <div data-pane="overview">${overview}</div>
      <div data-pane="groups"><div class="stack">${tgPane}</div></div>
      <div data-pane="allocations">${card('', table(allocCols.concat([{ h: 'Deployment', f: (a) => (a.deployment ? link('deployment', a.deployment) : '—') }, { h: 'Evaluation', f: (a) => (a.eval ? link('eval', a.eval) : '—') }]), allocs, { rowClass: (a) => (['failed', 'lost'].includes(a.status) ? 'row-danger' : '') }), { flush: true })}</div>
      <div data-pane="deployments">${card('', table([{ h: 'Deployment', f: (d) => link('deployment', d.id) }, { h: 'Status', f: (d) => chip(d.status, d.status, d.status === 'running' ? 'info' : undefined) }, { h: 'Description', f: (d) => esc(d.desc) }, { h: 'Healthy', f: (d) => d.groups.map((g) => `${g.healthy}/${g.desired}`).join(', ') }, { h: 'Started', f: (d) => when(d.createdAt) }], deps), { flush: true })}</div>
      <div data-pane="evaluations">${card('', evalTable(evals), { flush: true })}</div>
      <div data-pane="services">${card('', table([{ h: 'Service', f: (s) => link('service', s.ns + '/' + s.name) }, { h: 'Group', f: (s) => esc(s.group) }, { h: 'Instances', f: (s) => s.instances.length }, { h: 'Load balancers', f: (s) => links('lb', s.lbs) }, { h: 'Tags', f: (s) => s.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(' ') }], svcs, { empty: 'This job registers no service' }), { flush: true })}</div>
      <div data-pane="definition">${card('Job specification', `<pre class="code">${U.hcl(jobHCL(j))}</pre>`, { tools: `<a class="btn sm" href="job-edit.html?id=${enc(j.id)}">${icon('edit')}Edit</a>`, hint: 'version ' + j.version })}</div>`;
    U.wireTabs(c, 'overview');
  };

  // ------------------------------------------------------------ job editor
  window.PAGES.jobedit = function () {
    const isNew = params.get('new') === '1';
    const j = isNew ? null : IX.job.get(params.get('id') || 'web');
    const text = j ? jobHCL(j) : 'job "example" {\n  namespace   = "default"\n  type        = "service"\n  node_pool   = "default"\n  datacenters = ["eu-*"]\n\n  group "app" {\n    count = 2\n\n    task "app" {\n      driver = "docker"\n\n      config {\n        image = "registry.example.test/app:1.0.0"\n      }\n\n      resources {\n        cpu    = 500\n        memory = 512\n      }\n    }\n  }\n}\n';
    const c = U.shell({
      nav: 'jobs', title: j ? 'Edit ' + j.name : 'Run a job', pretitle: 'Job',
      crumbs: [['Workloads', ''], ['Jobs', 'jobs.html']].concat(j ? [[j.name, 'job.html?id=' + enc(j.id)], ['Edit', '']] : [['New', '']]),
      sub: 'The specification on the left; the plan and what the job will touch on the right.',
    });
    const ns = j ? IX.ns.get(j.ns) : IX.ns.get('default');
    const quota = ns && ns.quota ? IX.quota.get(ns.quota) : null;
    const running = j ? D.deployments.find((d) => d.job === j.id && d.status === 'running') : null;
    c.innerHTML = `<div class="with-rail" style="grid-template-columns:minmax(0,1fr) 420px"><div class="stack">
        ${j && (j.owner || j.release) ? U.alert('warn', `This job is managed by ${j.owner ? link('object', j.owner.kind + '|' + j.owner.ns + '|' + j.owner.name) : 'release ' + link('release', j.release)}: a change here will be overwritten or reported as drift.`) : ''}
        ${card('Specification (HCL)', `<textarea class="in" id="spec" spellcheck="false">${esc(text)}</textarea>`, { icon: 'edit', foot: `<button class="btn" id="plan-btn">Plan</button> <button class="btn primary" data-mock="would submit the job (norca job run)">${icon('play')}Run</button> <a class="btn" href="${j ? 'job.html?id=' + enc(j.id) : 'jobs.html'}">Cancel</a> <span class="note" style="margin-left:8px">Format: HCL or JSON · checked by admission policies on submit</span>` })}
      </div><div class="stack">
        ${card('Plan', '<div id="plan"><span class="muted">Press Plan to see what the scheduler would do.</span></div>', { icon: 'evals' })}
        ${running ? U.alert('info', `Deployment ${link('deployment', running.id)} is in progress. A new version replaces it.`) : ''}
        ${related([
          ['Namespace', link('ns', ns.name)],
          ['Quota', quota ? `${link('quota', quota.name)} <div style="width:100%">${U.meterRow('CPU', quota.used.cpu, quota.limits.cpu)}${U.meterRow('Memory', quota.used.mem, quota.limits.mem)}</div>` : ''],
          ['Node pool', j ? link('pool', j.pool) + `<div style="width:100%">${(() => { const m = D.metrics.cells['eu-dc1/' + j.pool]; return m ? spark([{ v: m.memAlloc, cls: 'a', area: true }, { v: m.memUsed, cls: 'u' }], { w: 220, h: 26, fluid: true }) : ''; })()}<span class="note">memory in eu-dc1/${esc(j.pool)}</span></div>` : link('pool', 'default')],
          ['Versions', j ? `v${j.version} current · <a href="job.html?id=${enc(j.id)}&tab=deployments">history</a>` : ''],
          ['Admission', `<a href="stub.html?p=admission">2 policies apply</a>`],
        ], { hint: 'what the job will touch' })}
      </div></div>`;
    document.getElementById('plan-btn').addEventListener('click', () => {
      const now = document.getElementById('spec').value;
      const a = text.split('\n');
      const b = now.split('\n');
      const changed = b.filter((l, i) => l !== a[i]);
      const countM = now.match(/count\s*=\s*(\d+)/);
      const cnt = countM ? Number(countM[1]) : 1;
      const imgChanged = (now.match(/image\s*=\s*"([^"]+)"/) || [])[1] !== (text.match(/image\s*=\s*"([^"]+)"/) || [])[1];
      const g = j ? j.groups[0] : { name: 'app', count: 0, mem: 512 };
      const lines = [];
      if (!changed.length && !isNew) lines.push('<span class="muted">No change: the plan would place nothing.</span>');
      else {
        if (imgChanged) lines.push(`<div class="chg">+/- task config.image</div>`);
        if (cnt !== g.count) lines.push(`<div class="${cnt > g.count ? 'add' : 'del'}">${cnt > g.count ? '+' : '-'} group "${esc(g.name)}" count ${g.count} → ${cnt}</div>`);
        if (changed.length && !imgChanged && cnt === g.count) lines.push(`<div class="chg">+/- ${changed.length} line(s) changed</div>`);
      }
      const place = Math.max(0, cnt - g.count);
      const memNeeded = place * g.mem;
      const fits = memNeeded <= 4096;
      document.getElementById('plan').innerHTML = `<div class="diff">${lines.join('')}</div>
        <div style="margin-top:10px">${kv([
          ['Scheduler', `${imgChanged ? cnt + ' destructive update(s), ' : ''}${place} new placement(s)`],
          ['Fits', fits ? chip('', 'yes', 'ok') : chip('', 'no: ' + memNeeded + ' MB would be blocked', 'warn') + `<div class="note">The node groups of pool ${esc(j ? j.pool : 'default')} would scale up for it (blocked-demand).</div>`],
          ['Job modify index', '<span class="mono">482114</span> <span class="faint">(use with -check-index)</span>'],
        ])}</div>`;
    });
  };

  // ------------------------------------------------------------ allocations
  const allocCols = (opt) => [
    { h: 'Allocation', f: (a) => link('alloc', a.id), sort: (a) => a.name },
    { h: 'Job', f: (a) => link('job', a.job) + ` <span class="faint small">/ ${esc(a.group)}</span>`, sort: (a) => a.job },
    { h: 'Node', f: (a) => link('node', a.node), sort: (a) => (IX.node.get(a.node) || {}).name },
    { h: 'Datacenter', f: (a) => link('dc', (IX.node.get(a.node) || {}).dc), sort: (a) => (IX.node.get(a.node) || {}).dc },
    { h: 'Status', f: (a) => chip(a.status) + (a.desired === 'stop' && a.status === 'running' ? ' ' + chip('', 'stopping', 'neutral') : ''), sort: (a) => a.status },
    { h: 'Version', f: (a) => 'v' + a.version, sort: (a) => a.version },
    { h: 'Use', f: (a) => (a.status === 'running' ? `<div style="min-width:80px" title="CPU ${Math.round(a.cpuUse * 100)}% · memory ${Math.round(a.memUse * 100)}% of reserved">${U.allocUsedBar(Math.round(a.cpuUse * 100), Math.round(a.memUse * 100))}</div>` : '<span class="faint">—</span>'), sort: (a) => a.cpuUse },
    { h: 'Created', f: (a) => when(a.createdAt), sort: (a) => -Date.parse(a.createdAt) },
  ];
  window.PAGES.allocations = function () {
    const c = U.shell({ nav: 'allocations', title: 'Allocations', pretitle: 'Workloads', crumbs: [['Workloads', ''], ['Allocations', '']], sub: 'Every allocation of the region in one list (new: today allocations are only listed per job, node or deployment). Name first, short ID muted: a replacement keeps the name.' });
    const el = document.createElement('div');
    c.appendChild(el);
    const nodeOf = (a) => IX.node.get(a.node) || {};
    U.listView(el, {
      rows: D.allocations,
      cols: allocCols(),
      sortIdx: 7,
      search: (a) => [a.name, a.id, a.job, nodeOf(a).name].join(' '),
      searchPlaceholder: 'Filter by name, ID, job or node',
      rowClass: (a) => (['failed', 'lost'].includes(a.status) ? 'row-danger' : a.status === 'pending' ? 'row-info' : ''),
      filters: [
        { key: 'status', label: 'Status', options: U.uniq(D.allocations.map((a) => a.status)), match: (a, v) => a.status === v },
        { key: 'job', label: 'Job', options: U.uniq(D.allocations.map((a) => a.job)), match: (a, v) => a.job === v },
        { key: 'node', label: 'Node', options: U.uniq(D.allocations.map((a) => nodeOf(a).name)), match: (a, v) => nodeOf(a).name === v },
        { key: 'ns', label: 'Namespace', options: U.uniq(D.allocations.map((a) => a.ns)), match: (a, v) => a.ns === v },
        { key: 'pool', label: 'Pool', options: U.uniq(D.allocations.map((a) => nodeOf(a).pool)), match: (a, v) => nodeOf(a).pool === v },
        { key: 'dc', label: 'Datacenter', options: U.uniq(D.allocations.map((a) => nodeOf(a).dc)), match: (a, v) => nodeOf(a).dc === v },
      ],
      foot: 'Backed by /v1/allocations?filter=… on the server; status, job, node, namespace, pool and datacenter filters are in the address, so the dashboard tiles link here pre-filtered.',
    });
  };

  window.PAGES.allocation = function () {
    const a = IX.alloc.get(params.get('id'));
    if (!a) return U.notFound('allocations', 'Allocation', params.get('id'), 'allocations.html');
    const j = IX.job.get(a.job);
    const g = j.groups.find((x) => x.name === a.group);
    const n = IX.node.get(a.node);
    const sc = n ? U.scalingOf(n) : null;
    const svcs = D.services.filter((s) => s.instances.some(([id]) => id === a.id));
    const lbs = svcs.flatMap((s) => s.lbs);
    const pol = D.scalingPolicies.find((p) => p.target.job === a.job && p.target.group === a.group);
    const c = U.shell({
      nav: 'allocations', title: a.name, id: a.id, pretitle: 'Allocation',
      crumbs: [['Workloads', ''], ['Jobs', 'jobs.html'], [j.name, 'job.html?id=' + enc(j.id)], [a.name.replace(/^.*\./, ''), '']],
      chips: ' ' + chip(a.status) + (a.desired === 'stop' && a.status === 'running' ? ' ' + chip('', 'desired: stop', 'neutral') : '') + (a.health ? ' ' + chip(a.health, 'deployment: ' + a.health) : ''),
      sub: `${link('job', a.job)} / ${link('group', a.job + '|' + a.group, { label: a.group })} · on ${link('node', a.node)} (${link('dc', n.dc)} / ${link('pool', n.pool)}) · ${link('ns', a.ns)} · v${a.version}`,
      actions: `<button class="btn" data-mock="logs of a task (stdout/stderr, follow)">Logs</button><button class="btn" data-mock="exec into a task">Exec</button><button class="btn" data-mock="restart all tasks">Restart</button><button class="btn danger" data-mock="stop the allocation (it is rescheduled)">${icon('stop')}Stop</button>`,
    });
    const chain = [];
    if (a.prev) chain.push(link('alloc', a.prev) + ` <span class="faint small">${esc((IX.alloc.get(a.prev) || {}).status || '')}</span>`);
    chain.push(`<b>${esc(a.name)}</b> <span class="idtag">${U.short(a.id)}</span>`);
    if (a.next) chain.push(link('alloc', a.next) + ` <span class="faint small">${esc((IX.alloc.get(a.next) || {}).status || '')}</span>`);
    const evs = a.taskEvents.length
      ? a.taskEvents
      : [
          { time: a.createdAt, task: g.tasks[0].name, type: 'Received', msg: 'Task received by client' },
          { time: a.createdAt, task: g.tasks[0].name, type: a.status === 'complete' ? 'Terminated' : a.status === 'lost' ? 'Lost' : 'Started', msg: a.status === 'complete' ? 'Exit Code: 0' : a.status === 'lost' ? 'Node down, allocation lost' : 'Task started by client' },
        ];
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${a.desc ? U.alert(['failed', 'lost'].includes(a.status) ? 'danger' : a.desired === 'stop' ? 'info' : 'info', esc(a.desc)) : ''}
      ${card('Summary', `<div class="kv-cols">${kv([
        ['Job', link('job', a.job) + ` <span class="faint small">v${a.version}</span>`],
        ['Task group', link('group', a.job + '|' + a.group, { label: a.group })],
        ['Namespace', link('ns', a.ns)],
        ['Node', `${link('node', a.node)} <span class="idtag">${U.short(a.node)}</span>`],
        ['Node group', sc ? link('nodegroup', sc.group.name) + ' ' + sc.badges.filter((b) => b[0] !== 'Autoscaled').map((b) => `<span class="chip ${b[1]}">${esc(b[0])}</span>`).join(' ') : ''],
      ])}${kv([
        ['Client status', chip(a.status)],
        ['Desired status', esc(a.desired)],
        ['Created', when(a.createdAt)],
        ['Evaluation', a.eval ? link('eval', a.eval) : '<span class="faint">— (placed before the window)</span>'],
        ['Deployment', a.deployment ? link('deployment', a.deployment) + (a.health ? ' ' + chip(a.health) : '') : ''],
      ])}</div>`, { icon: 'info' })}
      ${card('Reschedule chain', `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${chain.join(' <span class="faint">→</span> ')}</div><div class="note" style="margin-top:6px">PreviousAllocation / NextAllocation: a replacement keeps the name, so the short ID tells them apart.</div>`, { icon: 'replace', hint: 'new: these fields exist but are not linked today' })}
      ${card('Tasks', table([
        { h: 'Task', f: (t) => `<b>${esc(t.name)}</b>` },
        { h: 'State', f: () => chip(a.status === 'running' ? 'running' : a.status === 'pending' ? 'pending' : a.status === 'complete' ? 'complete' : 'failed', a.status === 'running' ? 'running' : a.status === 'pending' ? 'pending' : 'dead') },
        { h: 'Driver', f: (t) => `<span class="tag">${esc(t.driver)}</span>` },
        { h: 'Image / command', f: (t) => `<span class="mono small">${esc(t.image)}</span>` },
        { h: 'CPU', f: () => (a.status === 'running' ? `${meter(a.cpuUse * 100, 100, '')}<span class="note">${Math.round(a.cpuUse * g.cpu)} of ${g.cpu} MHz</span>` : '—') },
        { h: 'Memory', f: () => (a.status === 'running' ? `${meter(a.memUse * 100, 100)}<span class="note">${Math.round(a.memUse * g.mem)} of ${g.mem} MB</span>` : '—') },
      ], g.tasks), { flush: true, icon: 'allocs', hint: 'live client stats while the page is open' })}
      ${card('Task events', `<ul class="tl">${evs.slice().reverse().map((e) => `<li class="${/Terminated|Not Restarting|Lost/.test(e.type) && a.status !== 'complete' ? 'danger' : 'ok'}"><div class="tl-h"><b>${esc(e.type)}</b><span class="tag">${esc(e.task)}</span><span class="faint small">${esc(U.hm(e.time))} · ${esc(U.ago(e.time))}</span></div><div class="tl-m">${esc(e.msg)}</div></li>`).join('')}</ul>`, { flush: true, icon: 'activity' })}
      ${svcs.length ? card('Service registrations', table([{ h: 'Service', f: (s) => link('service', s.ns + '/' + s.name) }, { h: 'Address', f: (s) => `<span class="mono small">${esc(s.instances.find(([id]) => id === a.id)[1])}</span>` }, { h: 'Check', f: (s) => chip(s.instances.find(([id]) => id === a.id)[2]) }, { h: 'Load balancers', f: (s) => links('lb', s.lbs) }], svcs, { cls: 'compact' }), { flush: true, icon: 'service' }) : ''}
    </div>
    ${related([
      ['Job', link('job', a.job)],
      ['Task group', link('group', a.job + '|' + a.group, { label: a.group })],
      ['Namespace', link('ns', a.ns)],
      ['Node', link('node', a.node)],
      ['Datacenter', link('dc', n.dc), true],
      ['Node pool', link('pool', n.pool), true],
      ['Node group', sc ? link('nodegroup', sc.group.name) : '', true],
      ['Evaluation', a.eval ? link('eval', a.eval) : '', true],
      ['Deployment', a.deployment ? link('deployment', a.deployment) : '', true],
      ['Previous', a.prev ? link('alloc', a.prev) : '', true],
      ['Next', a.next ? link('alloc', a.next) : '', true],
      ['Services', links('service', svcs.map((s) => s.ns + '/' + s.name))],
      ['Load balancers', links('lb', lbs), true],
      ['Scaling policy', pol ? link('policy', pol.id, { label: pol.check }) : ''],
      ['Secret leases', a.job.startsWith('pg-') ? link('stub', 'secrets', { label: '1 database lease' }) : '', true],
    ])}</div>`;
  };

  // ------------------------------------------------------------ evaluations
  function evalTable(rows) {
    return table(
      [
        { h: 'Evaluation', f: (e) => link('eval', e.id) },
        { h: 'Status', f: (e) => chip(e.status) },
        { h: 'Triggered by', f: (e) => `<span class="mono small">${esc(e.triggeredBy)}</span>` },
        { h: 'Job', f: (e) => link('job', e.job) },
        { h: 'Node', f: (e) => (e.node ? link('node', e.node) : '<span class="faint">—</span>') },
        { h: 'Created', f: (e) => when(e.createdAt) },
      ],
      rows,
      { rowClass: (e) => (e.status === 'blocked' ? 'row-warn' : '') }
    );
  }
  window.PAGES.evaluations = function () {
    const c = U.shell({ nav: 'evaluations', title: 'Evaluations', pretitle: 'Workloads', crumbs: [['Workloads', ''], ['Evaluations', '']], sub: 'Evaluations have no name; the title is “trigger · job (on node)”. Each one now has a page of its own, so allocations and node group decisions can link to it.' });
    const el = document.createElement('div');
    c.appendChild(el);
    U.listView(el, {
      rows: D.evaluations,
      cols: [
        { h: 'Evaluation', f: (e) => link('eval', e.id), sort: (e) => U.evalTitle(e) },
        { h: 'Status', f: (e) => chip(e.status), sort: (e) => e.status },
        { h: 'Triggered by', f: (e) => `<span class="mono small">${esc(e.triggeredBy)}</span>`, sort: (e) => e.triggeredBy },
        { h: 'Job', f: (e) => link('job', e.job), sort: (e) => e.job },
        { h: 'Node', f: (e) => (e.node ? link('node', e.node) : '<span class="faint">—</span>') },
        { h: 'Deployment', f: (e) => (e.deployment ? link('deployment', e.deployment) : '<span class="faint">—</span>') },
        { h: 'Summary', f: (e) => `<span class="small muted">${esc(e.desc)}</span>` },
        { h: 'Created', f: (e) => when(e.createdAt), sort: (e) => -Date.parse(e.createdAt) },
      ],
      sortIdx: 7,
      search: (e) => U.evalTitle(e) + ' ' + e.id + ' ' + e.desc,
      rowClass: (e) => (e.status === 'blocked' ? 'row-warn' : ''),
      filters: [
        { key: 'status', label: 'Status', options: U.uniq(D.evaluations.map((e) => e.status)), match: (e, v) => e.status === v },
        { key: 'trigger', label: 'Triggered by', options: U.uniq(D.evaluations.map((e) => e.triggeredBy)), match: (e, v) => e.triggeredBy === v },
        { key: 'job', label: 'Job', options: U.uniq(D.evaluations.map((e) => e.job)), match: (e, v) => e.job === v },
        { key: 'ns', label: 'Namespace', options: U.uniq(D.evaluations.map((e) => e.ns)), match: (e, v) => e.ns === v },
        { key: 'type', label: 'Type', options: U.uniq(D.evaluations.map((e) => e.type)), match: (e, v) => e.type === v },
      ],
    });
  };

  window.PAGES.evaluation = function () {
    const e = IX.eval.get(params.get('id'));
    if (!e) return U.notFound('evaluations', 'Evaluation', params.get('id'), 'evaluations.html');
    const placed = D.allocations.filter((a) => a.eval === e.id);
    const groups = D.nodeGroups.filter((g) => g.status.decision && g.status.decision.evaluations.includes(e.id));
    const j = IX.job.get(e.job);
    const c = U.shell({
      nav: 'evaluations', title: U.evalTitle(e), id: e.id, pretitle: 'Evaluation',
      crumbs: [['Workloads', ''], ['Evaluations', 'evaluations.html'], [U.short(e.id), '']],
      chips: ' ' + chip(e.status),
      sub: `${link('job', e.job)} · ${link('ns', e.ns)} · ${esc(e.type)} · priority ${e.priority} · created ${when(e.createdAt)}`,
    });
    const chainItems = [];
    if (e.prev) chainItems.push(['Previous', link('eval', e.prev)]);
    if (e.next) chainItems.push(['Next', link('eval', e.next)]);
    if (e.blockedEval) chainItems.push(['Blocked eval', link('eval', e.blockedEval)]);
    const prevOf = D.evaluations.filter((x) => x.blockedEval === e.id || x.next === e.id);
    prevOf.forEach((x) => chainItems.push(['Created by', link('eval', x.id)]));
    const fails = e.failed ? Object.entries(e.failed) : [];
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${e.desc ? U.alert(e.status === 'blocked' ? 'warn' : 'info', esc(e.desc)) : ''}
      ${fails.length ? card('Placement failures', fails.map(([gname, f]) => `<div style="margin-bottom:10px"><b>${link('group', e.job + '|' + gname, { label: gname })}</b>: ${f.count} unplaced</div>${kv([
        ['Nodes evaluated', f.nodesEvaluated],
        ['Nodes filtered', f.nodesFiltered + (f.filteredReason ? ` <span class="faint">(${esc(f.filteredReason)})</span>` : '')],
        ['Dimension exhausted', Object.entries(f.exhausted).map(([k, v]) => `<span class="tag">${esc(k)} on ${v} nodes</span>`).join(' ')],
        ['Class exhausted', Object.entries(f.classExhausted).map(([k, v]) => `<span class="tag">${esc(k)}: ${v}</span>`).join(' ')],
        ['Quota limit reached', f.quota || '<span class="muted">no</span>'],
      ])}`).join(''), { icon: 'alert', cls: e.status === 'blocked' ? 'tone-warn' : '' }) : ''}
      ${groups.length ? card('Node scaling decisions made for it', table([{ h: 'Node group', f: (g) => link('nodegroup', g.name) + ' ' + U.health(g.status.conditions) }, { h: 'Decision', f: (g) => `${g.status.decision.previous} → ${g.status.decision.replicas} ${when(g.status.decision.time)}` }, { h: 'Now', f: (g) => `${g.status.replicas} ready of ${g.spec.replicas}` }, { h: 'Provisioned', f: (g) => U.condChip(g.status.conditions.find((x) => x.type === 'Provisioned')) }], groups, { cls: 'compact' }), { flush: true, icon: 'group', hint: 'status.decision.evaluations of the NodeGroups (new back link)' }) : ''}
      ${card('Allocations placed', table([{ h: 'Allocation', f: (a) => link('alloc', a.id) }, { h: 'Node', f: (a) => link('node', a.node) }, { h: 'Status', f: (a) => chip(a.status) }, { h: 'Created', f: (a) => when(a.createdAt) }], placed, { cls: 'compact', empty: e.status === 'blocked' ? 'None yet: waiting for capacity' : 'None in the example data' }), { flush: true, icon: 'allocs' })}
      ${card('Details', kv([['ID', `<span class="mono small">${esc(e.id)}</span>`], ['Type', esc(e.type)], ['Triggered by', `<span class="mono">${esc(e.triggeredBy)}</span>`], ['Status', chip(e.status)], ['Job modify index', '<span class="mono">482090</span>']]))}
    </div>
    ${related([
      ['Job', link('job', e.job)],
      ['Namespace', link('ns', e.ns)],
      ['Node', e.node ? link('node', e.node) : ''],
      ['Deployment', e.deployment ? link('deployment', e.deployment) : '', true],
      ...chainItems.map(([k, v]) => [k, v]),
      ['Node groups', links('nodegroup', groups.map((g) => g.name)), true],
      ['Node pool', j ? link('pool', j.pool) : ''],
      ['Quota', IX.ns.get(e.ns) && IX.ns.get(e.ns).quota ? link('quota', IX.ns.get(e.ns).quota) : ''],
    ])}</div>`;
  };

  // ------------------------------------------------------------ deployments
  const depProgress = (d) => {
    const t = d.groups.reduce((a, g) => ({ desired: a.desired + g.desired, healthy: a.healthy + g.healthy, unhealthy: a.unhealthy + g.unhealthy }), { desired: 0, healthy: 0, unhealthy: 0 });
    return `<div style="min-width:120px">${meter(t.healthy, t.desired, t.unhealthy ? 'danger' : 'ok')}<span class="note">${t.healthy} / ${t.desired} healthy${t.unhealthy ? ', ' + t.unhealthy + ' unhealthy' : ''}</span></div>`;
  };
  const depChip = (d) => chip(d.status, d.status, d.status === 'running' ? 'info' : undefined);
  window.PAGES.deployments = function () {
    const c = U.shell({ nav: 'deployments', title: 'Deployments', pretitle: 'Workloads', crumbs: [['Workloads', ''], ['Deployments', '']], sub: 'Titled “job vN” instead of the deployment ID.' });
    const el = document.createElement('div');
    c.appendChild(el);
    U.listView(el, {
      rows: D.deployments,
      cols: [
        { h: 'Deployment', f: (d) => link('deployment', d.id), sort: (d) => U.depTitle(d) },
        { h: 'Status', f: depChip, sort: (d) => d.status },
        { h: 'Progress', f: depProgress, sort: false },
        { h: 'Job', f: (d) => link('job', d.job), sort: (d) => d.job },
        { h: 'Namespace', f: (d) => link('ns', d.ns), sort: (d) => d.ns },
        { h: 'Description', f: (d) => `<span class="small muted">${esc(d.desc)}</span>` },
        { h: 'Started', f: (d) => when(d.createdAt), sort: (d) => -Date.parse(d.createdAt) },
      ],
      sortIdx: 6,
      search: (d) => U.depTitle(d) + ' ' + d.id,
      rowClass: (d) => (d.status === 'failed' ? 'row-danger' : d.status === 'running' ? 'row-info' : ''),
      filters: [
        { key: 'status', label: 'Status', options: U.uniq(D.deployments.map((d) => d.status)), match: (d, v) => d.status === v },
        { key: 'job', label: 'Job', options: U.uniq(D.deployments.map((d) => d.job)), match: (d, v) => d.job === v },
        { key: 'ns', label: 'Namespace', options: U.uniq(D.deployments.map((d) => d.ns)), match: (d, v) => d.ns === v },
      ],
    });
  };

  window.PAGES.deployment = function () {
    const d = IX.deployment.get(params.get('id'));
    if (!d) return U.notFound('deployments', 'Deployment', params.get('id'), 'deployments.html');
    const allocs = D.allocations.filter((a) => a.deployment === d.id);
    const c = U.shell({
      nav: 'deployments', title: U.depTitle(d), id: d.id, pretitle: 'Deployment',
      crumbs: [['Workloads', ''], ['Deployments', 'deployments.html'], [U.depTitle(d), '']],
      chips: ' ' + depChip(d),
      sub: `${link('job', d.job)} version ${d.version} · ${link('ns', d.ns)} · started ${when(d.createdAt)} · progress deadline ${esc(d.progressDeadline)}`,
      actions: d.status === 'running' ? `<button class="btn" data-mock="pause the deployment">${icon('pause')}Pause</button><button class="btn danger" data-mock="fail the deployment (auto revert)">Fail</button>` : '',
    });
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${card('Task groups', table([
        { h: 'Group', f: (g) => link('group', d.job + '|' + g.name, { label: g.name }) },
        { h: 'Progress', f: (g) => `<div style="min-width:160px">${meter(g.healthy, g.desired, g.unhealthy ? 'danger' : 'ok')}</div>` },
        { h: 'Desired', f: (g) => g.desired, cls: 'right' },
        { h: 'Placed', f: (g) => g.placed, cls: 'right' },
        { h: 'Healthy', f: (g) => g.healthy, cls: 'right' },
        { h: 'Unhealthy', f: (g) => g.unhealthy, cls: 'right' },
        { h: 'Canaries', f: (g) => g.canaries, cls: 'right' },
        { h: 'Auto revert', f: (g) => (g.autoRevert ? 'yes' : 'no') },
      ], d.groups), { flush: true, icon: 'deploy' })}
      ${card('Allocations', table([
        { h: 'Allocation', f: (a) => link('alloc', a.id) },
        { h: 'Node', f: (a) => link('node', a.node) },
        { h: 'Status', f: (a) => chip(a.status) },
        { h: 'Health', f: (a) => (a.health ? chip(a.health) : '<span class="faint">pending</span>') },
        { h: 'Version', f: (a) => 'v' + a.version },
      ], allocs, { cls: 'compact' }), { flush: true, icon: 'allocs' })}
      ${d.diff.length ? card(`Changes from v${d.version - 1}`, `<div class="diff">${d.diff.map(([k, a, b]) => `<div class="chg">+/- ${esc(k)}: <span class="del">${esc(a)}</span> → <span class="add">${esc(b)}</span></div>`).join('')}</div>`, { icon: 'edit', hint: 'job version diff (new link)' }) : ''}
    </div>
    ${related([
      ['Job', link('job', d.job) + ` <span class="faint small">v${d.version}</span>`],
      ['Namespace', link('ns', d.ns)],
      ['Evaluations', d.evals.map((e) => link('eval', e)).join('<br>'), true],
      ['Clients', links('node', Array.from(new Set(allocs.map((a) => a.node))))],
      ['Other versions', links('deployment', D.deployments.filter((x) => x.job === d.job && x.id !== d.id).map((x) => x.id))],
    ])}</div>`;
  };

  // ------------------------------------------------------------ packages (releases)
  window.PAGES.packages = function () {
    const c = U.shell({ nav: 'packages', title: 'Packages', pretitle: 'Workloads', crumbs: [['Workloads', ''], ['Packages', '']], sub: 'Installed releases of packs. Each lists the objects it created; the release page shows them as an ownership tree.', actions: `<button class="btn primary" data-mock="pack catalog and install form">${icon('plus')}Install</button>` });
    c.innerHTML = card('Releases', table([
      { h: 'Release', f: (r) => link('release', r.ns + '/' + r.name) },
      { h: 'Namespace', f: (r) => link('ns', r.ns) },
      { h: 'Pack', f: (r) => `<span class="mono small">${esc(r.registry)}/${esc(r.pack)}</span>` },
      { h: 'Version', f: (r) => esc(r.version) + (r.target ? ` → ${esc(r.target)}` : '') },
      { h: 'Status', f: (r) => chip(r.status) },
      { h: 'Conditions', f: (r) => U.notableConds(r.conditions).map(U.condChip).join(' ') || chip('', 'in sync', 'ok') },
      { h: 'Resources', f: (r) => r.resources.length, cls: 'right' },
      { h: 'Updated', f: (r) => when(r.updatedAt) },
    ], D.releases), { flush: true, icon: 'package' });
  };

  /** The ownership tree of a release. */
  function resourceNode([type, ref]) {
    if (type === 'Job') {
      const id = ref.split('/')[1];
      const al = U.allocsOfJob(id);
      return `<li>${icon('briefcase')} Job ${link('job', id)} ${jobHealth(IX.job.get(id))}<ul class="tree">${al.map((a) => `<li>${link('alloc', a.id)} ${chip(a.status)} on ${link('node', a.node)}</li>`).join('')}</ul></li>`;
    }
    if (type === 'ObjectKind') {
      const objs = ref === 'norca.io/LoadBalancer' ? D.loadBalancers.map((l) => ['object', 'norca.io/LoadBalancer|' + l.ns + '|' + l.name, l.status.conditions, l.owners]) : ref === 'norca.io/LoadBalancerClass' ? D.lbClasses.map((l) => ['lbclass', l.name, [], []]) : D.objects.filter((o) => o.kind === ref).map((o) => ['object', o.kind + '|' + o.ns + '|' + o.name, o.status.conditions, []]);
      return `<li>Kind ${link('kind', ref, { full: true })}<ul class="tree">${objs
        .map(([t, k, conds]) => {
          const owned = t === 'object' ? D.jobs.filter((j) => j.owner && j.owner.kind + '|' + j.owner.ns + '|' + j.owner.name === k) : [];
          return `<li>${link(t, k)} ${conds.length ? U.health(conds) : ''}${owned.length ? `<ul class="tree">${owned.map((j) => `<li>owns job ${link('job', j.id)} ${jobHealth(j)}</li>`).join('')}</ul>` : ''}</li>`;
        })
        .join('')}</ul></li>`;
    }
    if (type === 'Object') {
      const parts = ref.split('/');
      return `<li>Object ${link('lbclass', parts[2])} <span class="badge-kind">${esc(parts[0] + '/' + parts[1])}</span></li>`;
    }
    if (type === 'Variable') return `<li>Variable ${link('variable', ref)}</li>`;
    return `<li>${esc(type)} <span class="mono small">${esc(ref)}</span></li>`;
  }
  window.PAGES.release = function () {
    const r = IX.release.get(params.get('id'));
    if (!r) return U.notFound('packages', 'Release', params.get('id'), 'packages.html');
    const c = U.shell({
      nav: 'packages', title: r.name, pretitle: 'Release', crumbs: [['Workloads', ''], ['Packages', 'packages.html'], [r.name, '']],
      chips: ' ' + chip(r.status) + ' ' + U.health(r.conditions),
      sub: `${link('ns', r.ns)} · pack <span class="mono">${esc(r.registry)}/${esc(r.pack)}</span> ${esc(r.version)}${r.target ? ' → ' + esc(r.target) : ''} · revision ${r.revision} · updated ${when(r.updatedAt)}`,
      conds: U.notableConds(r.conditions).map(U.condChip).join(''),
      actions: `<button class="btn" data-mock="upgrade form with values">Upgrade</button><button class="btn" data-mock="rollback to a previous revision">Rollback</button>`,
    });
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${card('What it created', `<ul class="tree root"><li>${icon('package')} <b>${esc(r.name)}</b><ul class="tree">${r.resources.map(resourceNode).join('')}</ul></li></ul>`, { icon: 'topology', hint: 'ownership tree: release → resources → objects → owned jobs → allocations' })}
      ${card('Conditions', U.condTable(r.conditions), { flush: true })}
      ${card('History', table([{ h: 'Revision', f: (x) => x[0] }, { h: 'Version', f: (x) => esc(x[1]) }, { h: 'Status', f: (x) => chip(x[2]) }, { h: 'When', f: (x) => when(x[3]) }], [[r.revision, r.version, r.status === 'pending-upgrade' ? 'deployed' : r.status, r.updatedAt], [r.revision - 1, 'previous', 'superseded', '2026-10-20T10:00:00Z']].map((x) => [x[0], x[1], x[2] === 'superseded' ? 'complete' : x[2], x[3]]), { cls: 'compact' }), { flush: true })}
    </div>
    ${related([
      ['Namespace', link('ns', r.ns)],
      ['Jobs', links('job', r.resources.filter((x) => x[0] === 'Job').map((x) => x[1].split('/')[1]))],
      ['Kinds', links('kind', r.resources.filter((x) => x[0] === 'ObjectKind').map((x) => x[1]))],
      ['Operator', r.resources.some((x) => x[0] === 'ObjectKind') ? '<a href="operators.html">listed under Operators</a>' : ''],
    ])}</div>`;
  };

  U.evalTable = evalTable;
  U.jobHealth = jobHealth;
  U.allocCols = allocCols;
})();
