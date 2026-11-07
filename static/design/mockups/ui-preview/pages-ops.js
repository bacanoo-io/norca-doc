/* Operations pages: servers and Raft, the metrics store. */
(function () {
  'use strict';
  const U = window.UI;
  const { D, IX, esc, enc, link, card, chip, kv, spark, last, meter, pct, when, icon, table, related, params } = U;

  const leader = () => D.servers.find((s) => s.leader);
  const lag = (s) => s.raft.commitIndex - s.raft.appliedIndex;
  const bytes = (b) => (b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GiB' : (b / 1048576).toFixed(0) + ' MiB');
  const contactTone = (ms) => (ms > 150 ? 'warn' : 'ok');
  const storeOf = (name) => D.metrics.servers.find((x) => x.server === name);
  const retH = (r) => Number(String(r).replace('h', ''));

  // ------------------------------------------------------------ servers
  window.PAGES.servers = function () {
    const L = leader();
    const c = U.shell({
      nav: 'servers', title: 'Regions and servers', pretitle: 'Cluster', crumbs: [['Cluster', ''], ['Regions and servers', '']],
      sub: 'Autopilot health of every server comes from the leader (/v1/operator/autopilot/health); the Raft statistics of a server come from that server itself (/v1/agent/self, stats.raft), and its Raft database size from its own /v1/metrics.',
    });
    const worst = D.servers.slice().sort((a, b) => lag(b) - lag(a))[0];
    const ap = D.metrics.autopilot;
    const tolerance = D.servers.length >= 5 ? 2 : 1;
    c.innerHTML = `<div class="stack">
      <div class="grid g3">
        ${card('Region eu', kv([['Leader', `${link('server', L.name)} in ${link('dc', L.dc)}`], ['Servers', `${D.servers.length} alive, ${D.servers.filter((s) => s.voter).length} voters`], ['Datacenters', `${D.datacenters.length} (<a href="datacenters.html">list</a>)`], ['Clients', `<a href="nodes.html">${D.nodes.length}</a> (${D.nodes.filter((n) => n.status === 'ready').length} ready)`], ['Secret store', chip('ok', 'unsealed', 'ok')]]), { icon: 'globe' })}
        ${card('Autopilot', kv([['Healthy', chip('', `${D.servers.filter((s) => s.healthy).length} of ${D.servers.length}`, 'ok')], ['Failure tolerance', `<b>${tolerance}</b> ${spark([{ v: ap.failureTolerance.map(() => tolerance), cls: 'a' }], { w: 120, h: 18, max: 3 })}`], ['History', '<span class="mono small">norca.cluster.autopilot_*</span> (family 3, stored)']]), { icon: 'shield', hint: 'from the leader' })}
        ${card('Raft', kv([['Term', L.raft.term], ['Commit index', `<span class="mono">${L.raft.commitIndex}</span>`], ['Largest lag', `${link('server', worst.name)} ${chip('', lag(worst) + ' entries', lag(worst) > 20 ? 'warn' : 'neutral')}`], ['FSM pending', `${Math.max(...D.servers.map((s) => s.raft.fsmPending))} at most`]]), { icon: 'server' })}
      </div>
      ${lag(worst) > 20 ? U.alert('warn', `<b>${esc(worst.name)} is behind:</b> applied index ${worst.raft.appliedIndex} vs commit ${worst.raft.commitIndex} (${lag(worst)} entries), last contact ${worst.lastContactMs} ms, ${worst.raft.fsmPending} entries waiting for the FSM. Still healthy for autopilot; the appended-entries latency from the leader is high (see below).`) : ''}
      ${card('Servers', table([
        { h: 'Name', f: (s) => link('server', s.name) + (s.leader ? ' <span class="chip info nodot">leader</span>' : '') },
        { h: 'Datacenter', f: (s) => link('dc', s.dc) },
        { h: 'Status', f: (s) => chip(s.status) },
        { h: 'Voter', f: (s) => (s.voter ? 'yes' : 'no') },
        { h: 'Healthy', f: (s) => chip('', s.healthy ? 'healthy' : 'unhealthy', s.healthy ? 'ok' : 'danger') },
        { h: 'Last contact', f: (s) => (s.leader ? '<span class="faint">—</span>' : chip('', s.lastContactMs + ' ms', contactTone(s.lastContactMs))) },
        { h: 'Last term', f: (s) => s.lastTerm },
        { h: 'Last index', f: (s) => `<span class="mono small">${s.raft.appliedIndex}</span>${lag(s) ? ` <span class="${lag(s) > 20 ? 'warn-t' : 'faint'} small">−${lag(s)}</span>` : ''}` },
        { h: 'Stable since', f: (s) => when(s.stableSince) },
        { h: 'Raft DB', f: (s) => `${bytes(s.raftDb.lsmBytes + s.raftDb.vlogBytes)} <span class="note">LSM ${bytes(s.raftDb.lsmBytes)}</span>` },
        { h: 'Store retention', f: (s) => { const m = storeOf(s.name); return m.retention !== D.metrics.store.retention ? chip('', m.retention, 'warn') : esc(m.retention); } },
        { h: 'Version', f: (s) => esc(s.version) },
      ], D.servers, { rowClass: (s) => (lag(s) > 20 ? 'row-warn' : '') }), { flush: true, icon: 'server', foot: 'Healthy, voter, last contact, term, index and stable since: /v1/operator/autopilot/health on the leader (available today, unused by the current UI). Raft DB: nomad.badger.raft.* in each server’s /v1/metrics (today only there).' })}
      ${raftCommCard()}
    </div>`;
  };

  function raftCommCard() {
    const rc = D.metrics.raftComm;
    return card(
      'Raft communication',
      `${kv([['Commit time', `${rc.commitTimeMs} ms average (leader)`], ['Append entries', 'per peer, as the leader sees them']])}
      <div style="margin-top:10px">${table([
        { h: 'Peer', f: (p) => link('server', p.peer) },
        { h: 'Append entries / s', f: (p) => p.appendRate.toFixed(1), cls: 'right' },
        { h: 'Latency avg', f: (p) => `<div style="min-width:120px">${meter(p.latencyMs, 50, p.latencyMs > 20 ? 'warn' : 'ok')}<span class="note">${p.latencyMs} ms</span></div>` },
        { h: 'Latency max', f: (p) => `<span class="${p.maxMs > 100 ? 'warn-t' : ''}">${p.maxMs} ms</span>` },
      ], rc.peers, { cls: 'compact', rowClass: (p) => (p.latencyMs > 20 ? 'row-warn' : '') })}</div>
      <div class="grid g3" style="margin-top:12px">${U.plannedChart('Commit time', 8, { seed: 7, note: 'norca.server.raft_commit_time' })}${U.plannedChart('Append entries per peer', 8, { seed: 8, note: 'norca.server.raft_append_entries {peer}' })}${U.plannedChart('Last contact and commit lag', 8, { seed: 9, note: 'norca.server.raft_last_contact, commit_lag' })}</div>`,
      { icon: 'activity', hint: 'live from the raft library’s go-metrics on the leader', foot: 'Live values: the leader’s /v1/metrics. A history needs metric family 8, sampled by every server into its own store.' }
    );
  }

  window.PAGES.server = function () {
    const s = IX.server.get(params.get('id'));
    if (!s) return U.notFound('servers', 'Server', params.get('id'), 'servers.html');
    const L = leader();
    const r = s.raft;
    const m = storeOf(s.name);
    const c = U.shell({
      nav: 'servers', title: s.name, pretitle: 'Server', crumbs: [['Cluster', ''], ['Regions and servers', 'servers.html'], [s.name, '']],
      chips: ' ' + chip(s.status) + (s.leader ? ' <span class="chip info nodot">leader</span>' : '') + ' ' + chip('', s.healthy ? 'healthy' : 'unhealthy', s.healthy ? 'ok' : 'danger'),
      sub: `${link('dc', s.dc)} · <span class="mono">${esc(s.address)}</span> · version ${esc(s.version)} · Raft ID <span class="mono small">${esc(s.raftId)}</span>`,
      actions: `<button class="btn" data-mock="the monitor would stream the server log">${icon('activity')}Monitor</button>`,
    });
    const maxLevel = Math.max(...s.raftDb.levels, 1);
    const peer = D.metrics.raftComm.peers.find((p) => p.peer === s.name);
    const commLive = s.leader
      ? `<p class="small muted" style="margin-top:0">This server is the leader: append entries per peer.</p>${table([{ h: 'Peer', f: (p) => link('server', p.peer) }, { h: 'Append entries / s', f: (p) => p.appendRate.toFixed(1), cls: 'right' }, { h: 'Latency avg / max', f: (p) => `<span class="${p.latencyMs > 20 ? 'warn-t' : ''}">${p.latencyMs} / ${p.maxMs} ms</span>` }], D.metrics.raftComm.peers, { cls: 'compact' })}<div class="note" style="margin-top:6px">Commit time ${D.metrics.raftComm.commitTimeMs} ms average.</div>`
      : kv([['Append entries from the leader', peer ? `${peer.appendRate.toFixed(1)} / s` : '—'], ['Latency seen by the leader', peer ? `<span class="${peer.latencyMs > 20 ? 'warn-t' : ''}">${peer.latencyMs} ms avg, ${peer.maxMs} ms max</span>` : '—'], ['Last contact', r.lastContactMs + ' ms']]);
    const commBody = `${commLive}<div class="grid g2" style="margin-top:12px">${U.plannedChart(s.leader ? 'Commit time' : 'Last contact', 8, { seed: 11, note: s.leader ? 'norca.server.raft_commit_time' : 'norca.server.raft_last_contact' })}${U.plannedChart('Commit lag and FSM pending', 8, { seed: 12, note: 'norca.server.commit_lag, fsm_pending' })}</div>`;
    c.innerHTML = `<div class="with-rail"><div class="stack">
      ${lag(s) > 20 || s.lastContactMs > 150 ? U.alert('warn', `<b>Behind the leader:</b> ${lag(s)} entries not applied yet, last contact ${s.lastContactMs} ms, ${r.fsmPending} entries waiting for the FSM.`) : ''}
      <div class="grid g2">
        ${card('Autopilot health', kv([
          ['Healthy', chip('', s.healthy ? 'yes' : 'no', s.healthy ? 'ok' : 'danger')],
          ['Voter', s.voter ? 'yes' : 'no'],
          ['Last contact', s.leader ? '<span class="faint">— (leader)</span>' : chip('', s.lastContactMs + ' ms', contactTone(s.lastContactMs))],
          ['Last term', s.lastTerm],
          ['Last index', `<span class="mono">${r.appliedIndex}</span>`],
          ['Stable since', when(s.stableSince)],
        ]), { icon: 'shield', hint: `answered by the leader ${esc(L.name)}` })}
        ${card('Raft of this server', kv([
          ['State', r.state],
          ['Term', r.term],
          ['Applied / commit index', `<span class="mono">${r.appliedIndex}</span> / <span class="mono">${r.commitIndex}</span>${lag(s) ? ' ' + chip('', 'lag ' + lag(s), lag(s) > 20 ? 'warn' : 'neutral') : ''}`],
          ['Last log / snapshot index', `<span class="mono">${r.lastLogIndex}</span> / <span class="mono">${r.lastSnapshotIndex}</span>`],
          ['Last contact', s.leader ? '—' : r.lastContactMs + ' ms'],
          ['FSM pending', r.fsmPending ? chip('', String(r.fsmPending), r.fsmPending > 5 ? 'warn' : 'neutral') : '0'],
          ['Peers', r.numPeers],
          ['Protocol version', r.protocolVersion],
        ]), { icon: 'server', hint: '/v1/agent/self stats.raft' })}
      </div>
      ${card('Raft database', `<div class="grid g2"><div>${kv([['LSM tree', bytes(s.raftDb.lsmBytes)], ['Value log', bytes(s.raftDb.vlogBytes)], ['Total', `<b>${bytes(s.raftDb.lsmBytes + s.raftDb.vlogBytes)}</b>`]])}</div>
        <div><div class="small muted">Tables per level</div>${s.raftDb.levels.map((v, i) => `<div class="meter-row" style="grid-template-columns:30px 1fr 30px"><span class="mono small">L${i}</span>${meter(v, maxLevel, 'ok')}<span class="v">${v}</span></div>`).join('')}</div></div>
        <div style="margin-top:12px">${U.plannedChart('Raft DB size over time', 8, { seed: 10, note: 'norca.server.raft_db_bytes, tables per level' })}</div>`, { icon: 'database', hint: 'badger, from nomad.badger.raft.* in this server’s /v1/metrics (today only there)' })}
      ${card('Raft communication', commBody, { icon: 'activity', hint: 'live: the raft library’s go-metrics' })}
      ${card('Metrics store on this server', `${kv([
        ['Retention', m.retention !== D.metrics.store.retention ? `${chip('', m.retention, 'warn')} <span class="small muted">the other servers keep ${esc(D.metrics.store.retention)}</span>` : esc(m.retention)],
        ['Oldest point', `${esc(U.fmt(m.oldest))} <span class="faint">(${esc(U.ago(m.oldest))})</span>`],
        ['Disk', `${meter(m.diskBytes, m.maxDiskSize)}<span class="note">${bytes(m.diskBytes)} of ${bytes(m.maxDiskSize)} (max_disk_size)</span>`],
        ['Series', `${m.series} of ${m.maxSeries}`],
        ['Dropped reports', m.dropped ? chip('', String(m.dropped), 'warn') : '0'],
      ])}${m.note ? `<div class="note" style="margin-top:6px">${esc(m.note)}</div>` : ''}`, { icon: 'chart', tools: '<a href="metrics.html">Metrics →</a>' })}
      ${card('Tags', kv([['region', 'eu'], ['dc', esc(s.dc)], ['role', 'nomad'], ['build', esc(s.version)], ['raft_vsn', '3'], ['expect', String(D.servers.length)]]))}
    </div>
    ${related([
      ['Region', '<a href="servers.html">eu</a>'],
      ['Datacenter', link('dc', s.dc), true],
      ['Clients in DC', `<a href="nodes.html?dc=${enc(s.dc)}">${D.nodes.filter((n) => n.dc === s.dc).length} clients</a>`, true],
      ['Leader', link('server', L.name)],
      ['Peers', D.servers.filter((x) => x !== s).map((x) => link('server', x.name)).join(', ')],
      ['Metrics store', '<a href="metrics.html">status per server</a>', true],
    ])}</div>`;
  };

  // ------------------------------------------------------------ metrics
  const FAMILY_INFO = {
    1: ['norca.group.{cpu, cpu_mhz, cpu_throttled, memory, memory_mb, memory_cache_mb} (.avg/.max), oom_kills, allocs_running, allocs_queued', 'ns, job, group', 'Job → Task groups', [['Job api', 'job.html?id=api&tab=groups']]],
    2: ['norca.group.custom.<name>', 'ns, job, group', 'nothing yet', []],
    3: ['norca.cluster.{cpu,memory}_{allocated,used}, disk_allocated, nodes_ready, blocked_*, autopilot_healthy, autopilot_failure_tolerance', 'dc, pool, class', 'Dashboard capacity, region map aggregates, datacenter and pool pages, node group scaling inputs, servers (autopilot)', [['Dashboard', 'index.html'], ['Region map', 'region-map.html']]],
    4: ['norca.quota.{cpu_mhz,memory_mb}_{allocated,used}', 'quota', 'Quotas, dashboard quota pressure', [['Quotas', 'quotas.html']]],
    5: ['norca.sched.broker_{ready,unacked,pending,waiting}, plan_queue_depth, blocked_*, heartbeats_active; norca.jobs.*; norca.secrets.*; norca.backup.*; norca.security.*; norca.autoscaler.*; norca.store.*', 'mostly none (region), some namespace or server', 'Dashboard control plane (scheduler history)', [['Dashboard', 'index.html']]],
    6: ['norca.group.allocs_{failed,lost,starting}, restarts, memory_swap_mb, memory_peak_mb; norca.nodes.{down,disconnected,draining,ineligible}', 'ns, job, group; dc, pool', 'Region map state counts, dashboard capacity cells, task group failures', [['Region map', 'region-map.html'], ['Job worker', 'job.html?id=worker&tab=groups']]],
    7: ['norca.node.cpu_used, memory_{used,total}_mb, disk_{used,total}_mb, inodes_used_percent, device_utilization', 'node, dc, pool, class', 'Client page: host history', [['A client', 'node.html?id=' + enc(D.nodes[8].id)]]],
    8: ['norca.server.raft_db_bytes, raft_last_contact, commit_lag, fsm_pending, term, raft_commit_time, raft_append_entries, rpc_{requests,errors}; norca.bus.*', 'server (and peer)', 'Servers and server pages: Raft database, Raft communication', [['Servers', 'servers.html'], ['srv-eu-4', 'server.html?id=srv-eu-4']]],
    9: ['norca.nodegroup.{replicas,ready,joining,failed}, rollout_{replacing,outdated}, condition, cert_expires_min_hours; norca.lb.{targets,ready}; norca.objects.{count,degraded}', 'group (and type); ns, name; kind', 'Node group scale history, load balancer health', [['Node group workers-dc2', 'node-group.html?id=workers-dc2'], ['LoadBalancer ingress-public', 'load-balancer.html?id=infra%2Fingress-public']]],
  };

  window.PAGES.metrics = function () {
    const st = D.metrics.store;
    const servers = D.metrics.servers;
    const differs = servers.filter((x) => x.retention !== st.retention);
    const capped = servers.filter((x) => (U.NOW - Date.parse(x.oldest)) / 3.6e6 < retH(x.retention) - 1 && !(x.server === 'srv-eu-5'));
    const c = U.shell({
      nav: 'metrics', title: 'Metrics', pretitle: 'Operations',
      crumbs: [['Operations', ''], ['Metrics', '']],
      sub: 'The internal metrics store: one per server, not replicated. Its retention decides which ranges the charts of the UI can offer.',
    });
    const offered = U.RANGE_DEFS.filter(([, h]) => h <= U.retentionHours()).map(([l]) => l);
    const notOffered = U.RANGE_DEFS.filter(([, h]) => h > U.retentionHours()).map(([l]) => l);
    c.innerHTML = `<div class="stack">
      ${differs.length ? U.alert('warn', `<b>Retention differs between servers:</b> ${differs.map((x) => `${link('server', x.server)} keeps ${esc(x.retention)}`).join(', ')}, the others ${esc(st.retention)}. The same query answers with a different range depending on the server it reaches. The deployer plan should write one value to every server.`) : ''}
      ${capped.length ? U.alert('info', `<b>Disk cap first:</b> ${capped.map((x) => `${link('server', x.server)} reached max_disk_size, so its oldest point (${esc(U.ago(x.oldest))}) is younger than its retention`).join('; ')}.`) : ''}
      <div class="grid g2">
        ${card('Retention', `${kv([
          ['Effective retention', `<b>${st.retention}</b> (${U.retentionHours() / 24} days) on the leader ${link('server', D.servers.find((s) => s.leader).name)}`],
          ['Allowed', '24h to 720h (1 to 30 days); written as hours or days (7d = 168h)'],
          ['Change', 'set <span class="mono">server { metrics_store { retention } }</span> and reload (SIGHUP): no restart. Shorter removes the partitions past it at the next sweep; longer applies to what is still on disk.'],
          ['Ranges the UI offers', offered.map((r) => `<span class="tag">${r}</span>`).join(' ') + (notOffered.length ? ` <span class="faint small">not offered: ${notOffered.join(', ')}</span>` : '')],
        ])}<div class="note" style="margin-top:8px">The retention as a reloadable setting and its status per server are planned; today it is read once at start.</div>`, { icon: 'clock', id: 'retention' })}
        ${card('Configuration', kv([['sample_interval', '30s (restart only)'], ['partition_duration', '6h (restart only)'], ['max_disk_size', '2 GiB on most servers; the oldest partitions go first when it is reached'], ['max_series', '50 000'], ['Stored families', '1, 3, 4 · planned: 2, 5–9']]), { icon: 'cog' })}
      </div>
      ${card('Status per server', table([
        { h: 'Server', f: (x) => link('server', x.server) },
        { h: 'Retention', f: (x) => (x.retention !== st.retention ? chip('', x.retention, 'warn') : esc(x.retention)) },
        { h: 'Oldest point', f: (x) => `${esc(U.fmt(x.oldest))}<div class="note">${esc(U.ago(x.oldest))}</div>` },
        { h: 'Disk vs max_disk_size', f: (x) => `<div style="min-width:150px">${meter(x.diskBytes, x.maxDiskSize)}<span class="note">${bytes(x.diskBytes)} of ${bytes(x.maxDiskSize)}</span></div>` },
        { h: 'Series vs max_series', f: (x) => `<div style="min-width:120px">${meter(x.series, x.maxSeries)}<span class="note">${x.series} of ${x.maxSeries}</span></div>` },
        { h: 'Partitions', f: (x) => x.partitions, cls: 'right' },
        { h: 'Dropped reports', f: (x) => (x.dropped ? chip('', String(x.dropped), 'warn') : '0'), cls: 'right' },
        { h: 'Note', f: (x) => `<span class="small muted">${esc(x.note || '')}</span>` },
      ], servers, { rowClass: (x) => (x.note ? 'row-warn' : '') }), { flush: true, icon: 'server', hint: '/v1/operator/metrics-store per server', foot: 'Effective retention, oldest point, disk bytes vs max_disk_size, series vs max_series and dropped reports per server; a status that differs between servers is marked.' })}
      ${card('Series explorer', `<div class="filters" style="padding:0 0 10px;border:0"><label class="f">Series <select id="mx-metric">${[['cpuAlloc', 'norca.cluster.cpu_allocated'], ['cpuUsed', 'norca.cluster.cpu_used'], ['memAlloc', 'norca.cluster.memory_allocated'], ['memUsed', 'norca.cluster.memory_used'], ['nodesReady', 'norca.cluster.nodes_ready'], ['blockedEvals', 'norca.cluster.blocked_evals']].map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
        <label class="f">dc / pool <select id="mx-cell">${Object.keys(D.metrics.cells).map((k) => `<option>${esc(k)}</option>`).join('')}</select></label>${U.rangeSelect('24h')}</div><div id="mx-chart"></div>`, { icon: 'chart', hint: '/v1/metrics/series and /v1/metrics/history (family 3 shown)' })}
      ${card('Metric families', `<div class="families">${Object.entries(U.FAMILIES)
        .map(([n, [name, status]]) => {
          const [series, labels, used, pages] = FAMILY_INFO[n];
          return `<div class="family" id="family-${n}"><div class="fam-h"><b>Family ${n}: ${esc(name)}</b> ${chip('', status, status === 'stored' ? 'ok' : 'neutral')}</div>
            <div class="small"><span class="muted">Series:</span> <span class="mono small">${esc(series)}</span></div>
            <div class="small"><span class="muted">Labels:</span> ${esc(labels)} · <span class="muted">In the mockup:</span> ${esc(used)} ${pages.map(([l, h]) => `<a href="${h}">${esc(l)}</a>`).join(' · ')}</div>
            ${status === 'stored' ? '' : `<div class="note">Charts that need this family carry a “planned: family ${n}” badge and draw only an outline until the store keeps it.</div>`}</div>`;
        })
        .join('')}</div>`, { icon: 'layers', hint: 'what is stored today and what is planned' })}
    </div>`;
    const draw = () => {
      const m = D.metrics.cells[document.getElementById('mx-cell').value];
      const k = document.getElementById('mx-metric').value;
      const v = m[k];
      const max = k === 'nodesReady' ? Math.max(...v) + 2 : k === 'blockedEvals' ? 3 : 100;
      document.getElementById('mx-chart').innerHTML = spark([{ v, cls: k === 'blockedEvals' ? 'bl' : 'a', area: k !== 'blockedEvals' }], { w: 800, h: 80, max, fluid: true }) + `<div class="note">now ${Math.round(last(v))}${max === 100 ? '%' : ''} · 48 points of 30 minutes</div>`;
    };
    c.querySelectorAll('#mx-cell, #mx-metric').forEach((s) => s.addEventListener('change', draw));
    draw();
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) setTimeout(() => {
        el.scrollIntoView({ block: 'center' });
        el.classList.add('flash');
      }, 60);
    }
  };
})();
