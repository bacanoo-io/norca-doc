/*
 * Example data of the Norca UI mockup. Every page includes this file, so the
 * same objects appear everywhere. All names, IDs, addresses and values are
 * made up (documentation ranges 10.x, 203.0.113.0/24, 2001:db8::/32 and the
 * .example.test domain).
 *
 * "now" is fixed so relative times ("5m ago") are the same on every page.
 */
(function () {
  const T = (hm) => '2026-11-06T' + hm + ':00Z';

  // Client node IDs (UUIDs; the UI shows names, the short ID only muted).
  const N = {
    d1def1: '7f3c1a02-5b1e-4c9a-9d27-1e0a6b3f8c11',
    d1def2: '2b8e4d13-9c0a-4f61-8a3e-6d2c5b7e9f02',
    d1edge: '9a41c7e5-3d2f-4b8e-a1c6-0f9e8d7c6b03',
    a1: '4c6d2f81-7a9b-4e3c-b5d1-2a8f6e4c0d04',
    a2: 'd05e9b37-1f4a-4c8d-9e2b-7c3a5f1d8e05',
    x9: '6e2a8c90-4b7d-4a1e-8f3c-9d5b2e7a1f06',
    d2def1: 'b7f10d24-8e3a-4d5c-a2f9-3b6e1c8d4a07',
    b1: '1d9c5e66-2a7f-4b3e-9c1d-5e8a4f2b6c08',
    b2: 'e8a23f4b-6c1d-4e9a-b7f2-8a3c5d1e9b09',
    b3: '53b7a1c8-9d4e-4f2a-8c6b-1e7d3a5f2c10',
    b4: 'f4e6b2d9-3a8c-4d1f-a9e7-6b2c8d4f1a11',
    d2edge: '0c5f8e17-7b2d-4a6c-9f1e-4d8b2a6c3e12',
    d3def1: 'a6d4c3b2-5e9f-4b1a-8d7c-2f6e9a3b5d13',
    d3def2: '8e1b7f5a-1c6d-4e8b-a3f9-7d2e5b8c1f14',
    d3edge: '3a9d6e04-8f1b-4c7e-9a2d-5b3f7e1c4a15',
  };

  // Allocation IDs.
  const A = {
    web0: 'e3b0c442-98fc-4c14-9afb-f4c8996fb924',
    web1: '5d41402a-bc4b-4a76-b971-9d911017c592',
    web2old: '9e107d9d-372b-4b68-8a5c-e5b9b1a3c0d3',
    web2: 'c4ca4238-a0b9-4382-8dcc-509a6f75849b',
    api0: '1679091c-5a88-4faf-9b6e-8b2c2a0f3d10',
    api1: '8f14e45f-ceea-467a-9575-3c3e7a1d4b21',
    api2: 'c9f0f895-fb98-4b91-a6b2-91d2f7e3c832',
    api3: '45c48cce-2e2d-4fbd-9b1e-7a2a3d9e1f43',
    api4: 'd3d94468-02a4-4b1e-8f6c-3a7e5b9c2d54',
    q0: '6512bd43-d9ca-4a6e-9b3f-0e1c7a5d8f65',
    q1old: 'c20ad4d7-6fe9-4759-aa27-a0c99bff6710',
    q1: 'c51ce410-c124-4a10-9e8b-7d0a3b5f1c76',
    q2: 'aab32389-22bc-4c56-8b2d-1e9f4a7c3e87',
    q3: '9bf31c7f-f062-4c3e-8d1a-5b7e2c9f4a98',
    tr0: 'c74d97b0-1eae-4d6a-b8f1-3e5c9a2d7b09',
    tr1: '70efdf2e-c9b0-4a7d-9e3f-1b8c4d6a2e1a',
    tr2: '6f4922f4-5568-4a1b-8c9d-2e7f3a5b1c2b',
    rep1: '1f0e3dad-9990-4e5f-a2b7-8c3d1e6f9a3c',
    rep0: '98f13708-2101-4d4e-b6a8-5c9e3f7a1b4d',
    opNs: '3c59dc04-8e4c-4b9a-a1d7-6f2e8b5c3a5e',
    opLb: 'b6d767d2-f8b3-4e1c-9a6d-2c7f5e1b8d6f',
    opPg: '37693cfc-7480-4c2b-8e9a-1d5f3b7c4e70',
    opPgLost: '1ff1de77-4005-4d8a-b3c6-9e2a7f5d1c81',
    pgOrders: '8e296a06-7a37-4a5c-9f1b-3d8e6c2a4f92',
    pgAnFail: '4e732ced-3463-4d0f-8a2b-6c9e1f5b7da3',
    pgAn: '02e74f10-e032-4b7c-9d6a-1f3e8c5b2ab4',
  };

  const E = {
    web6: '33e75ff0-9dd6-4bbd-a9e2-6b3d8c1f5ac5',
    web7: 'a87ff679-a2f3-4e71-9181-a67b7542122c',
    web7w: 'eccbc87e-4b5c-4e2f-9a1d-8f3e6b7c2ad6',
    wReg: 'e4da3b7f-bbce-4345-9777-2b0674a318d7',
    wBlocked: '1679a1fc-5a88-4f4a-8c6e-3b9d2e7f1ae8',
    wDrain: '8f1ae45f-6c1d-4a2b-9e7f-3c5d8b1a4ef9',
    nodeDown: 'c9f0a895-3e7b-4d1c-8a6f-2b9e5c3d7f0a',
    periodic: '45c4a8ce-7b2e-4f9d-a1c3-6e8b2d5f9c1b',
    pgFail: 'd3d9a468-1c7e-4a3b-9f2d-8e6c5b1a3f2c',
    api12: '6512ad43-3f8b-4e1a-9c7d-2a6e9f4b1c3d',
    apiBlocked: 'c20a14d7-9e3c-4b8a-a7d1-5f2b6e8c3a4e',
    traefik: 'c51ca410-2b7d-4e9f-8a3c-1d6e5f9b2a5f',
  };

  const DEP = {
    web7: '7d2e1c40-3a9f-4b6e-8c1d-5f2a9e7b3c60',
    web6: 'c4a19f02-8b3e-4d7a-9f1c-2e6d5a8b4c71',
    api12: '5be0d9a1-4c7f-4e2b-a8d3-9f1e6c5b2d82',
    worker5: 'e19c3b77-2d8a-4f5e-9b1c-7a3e6d4f8c93',
    traefik3: 'a8f42d6c-9e1b-4a7d-8c5f-3b2e7a6d1fa4',
    pgAn1: '0f6b8e25-5c3a-4b9e-a7d2-1e8f4c6b9ab5',
  };

  // Sizes per node class: cpu in MHz, memory and disk in MB.
  const SIZE = {
    standard: { cpu: 4000, mem: 8192, disk: 80000 },
    edge: { cpu: 2000, mem: 4096, disk: 40000 },
    cx32: { cpu: 8000, mem: 16384, disk: 160000 },
  };

  function node(id, name, dc, pool, cls, extra) {
    return Object.assign(
      {
        id,
        name,
        dc,
        pool,
        class: cls,
        status: 'ready',
        eligible: true,
        drain: null,
        address: '',
        version: '0.9.3',
        drivers: ['docker', 'exec', 'raw_exec'],
        cpu: SIZE[cls].cpu,
        mem: SIZE[cls].mem,
        disk: SIZE[cls].disk,
        reserved: { cpu: 200, mem: 512 },
        meta: {},
        createdAt: '2026-08-14T09:12:00Z',
        lastHeartbeat: T('10:41'),
        hostVolumes: [],
      },
      extra || {}
    );
  }

  const scaleMeta = (group, instance, rev, gen, created, expires) => ({
    'norca.created_by': 'nodescaler',
    'norca.node_group': group,
    'norca.instance': instance,
    'norca.node_group_revision': rev,
    'norca.node_group_generation': String(gen),
    'norca.created_at': created,
    'norca.cert_expires': expires,
  });

  const nodes = [
    node(N.d1def1, 'eu-dc1-default-01', 'eu-dc1', 'default', 'standard', {
      address: '10.10.1.11',
      hostVolumes: ['certs'],
    }),
    node(N.d1def2, 'eu-dc1-default-02', 'eu-dc1', 'default', 'standard', {
      address: '10.10.1.12',
    }),
    node(N.d1edge, 'eu-dc1-edge-01', 'eu-dc1', 'edge', 'edge', {
      address: '10.10.1.13',
      meta: { 'norca.edge': 'true' },
    }),
    node(N.a1, 'eu-dc1-workers-a1', 'eu-dc1', 'workers', 'cx32', {
      address: '10.10.1.21',
      createdAt: '2026-09-18T07:40:00Z',
      meta: scaleMeta('workers-dc1', 'hz-nbg1-4821', '3be2a917', 2, '2026-09-18T07:38:00Z', '2026-11-17T07:38:00Z'),
    }),
    node(N.a2, 'eu-dc1-workers-a2', 'eu-dc1', 'workers', 'cx32', {
      address: '10.10.1.22',
      createdAt: '2026-09-15T13:05:00Z',
      meta: scaleMeta('workers-dc1', 'hz-nbg1-4822', '3be2a917', 2, '2026-09-15T13:02:00Z', '2026-11-14T13:02:00Z'),
    }),
    node(N.x9, 'eu-dc1-workers-x9', 'eu-dc1', 'workers', 'cx32', {
      address: '10.10.1.29',
      eligible: false,
      createdAt: '2026-11-05T16:20:00Z',
      meta: {
        'norca.created_by': 'nodescaler',
        'norca.node_group': 'workers-dc1',
        'norca.instance': 'hz-nbg1-4799',
      },
    }),
    node(N.d2def1, 'eu-dc2-default-01', 'eu-dc2', 'default', 'standard', {
      address: '10.10.2.11',
    }),
    node(N.b1, 'eu-dc2-workers-b1', 'eu-dc2', 'workers', 'cx32', {
      address: '10.10.2.21',
      eligible: false,
      createdAt: '2026-10-02T08:15:00Z',
      meta: scaleMeta('workers-dc2', 'hz-fsn1-7702', '7a41e0c2', 3, '2026-10-02T08:12:00Z', '2026-12-01T08:12:00Z'),
    }),
    node(N.b2, 'eu-dc2-workers-b2', 'eu-dc2', 'workers', 'cx32', {
      address: '10.10.2.22',
      eligible: false,
      drain: {
        started: T('10:38'),
        deadline: T('10:53'),
        remaining: 1,
        reason: 'Rolling replacement of node group workers-dc2 (revision)',
      },
      createdAt: '2026-10-02T08:16:00Z',
      meta: scaleMeta('workers-dc2', 'hz-fsn1-7703', '7a41e0c2', 3, '2026-10-02T08:12:00Z', '2026-12-01T08:12:00Z'),
    }),
    node(N.b3, 'eu-dc2-workers-b3', 'eu-dc2', 'workers', 'cx32', {
      address: '10.10.2.23',
      createdAt: '2026-10-02T08:17:00Z',
      meta: scaleMeta('workers-dc2', 'hz-fsn1-7704', '7a41e0c2', 3, '2026-10-02T08:12:00Z', '2026-12-01T08:12:00Z'),
    }),
    node(N.b4, 'eu-dc2-workers-b4', 'eu-dc2', 'workers', 'cx32', {
      address: '10.10.2.24',
      createdAt: T('09:58'),
      meta: scaleMeta('workers-dc2', 'hz-fsn1-7714', 'c93f5d18', 3, T('09:51'), '2027-01-05T09:51:00Z'),
    }),
    node(N.d2edge, 'eu-dc2-edge-01', 'eu-dc2', 'edge', 'edge', {
      address: '10.10.2.13',
      meta: { 'norca.edge': 'true' },
    }),
    node(N.d3def1, 'eu-dc3-default-01', 'eu-dc3', 'default', 'standard', {
      address: '10.10.3.11',
    }),
    node(N.d3def2, 'eu-dc3-default-02', 'eu-dc3', 'default', 'standard', {
      address: '10.10.3.12',
      status: 'down',
      lastHeartbeat: T('09:57'),
    }),
    node(N.d3edge, 'eu-dc3-edge-01', 'eu-dc3', 'edge', 'edge', {
      address: '10.10.3.13',
      meta: { 'norca.edge': 'true' },
    }),
  ];

  const servers = [
    { id: 'srv-eu-1.eu', name: 'srv-eu-1', raftId: '0b7e1c2a-4d3f-4e8a-9b1c-6f5d2a8e3c01', dc: 'eu-dc1', address: '10.10.0.11:4647', status: 'alive', leader: true, voter: true, lastIndex: 482113, lastTerm: 41, healthy: true, version: '0.9.3', stableSince: '2026-11-02T06:10:00Z' },
    { id: 'srv-eu-2.eu', name: 'srv-eu-2', raftId: '5c2d9e7f-1a6b-4c3e-8d2f-9e4a7b1c5d02', dc: 'eu-dc2', address: '10.10.0.12:4647', status: 'alive', leader: false, voter: true, lastIndex: 482113, lastTerm: 41, healthy: true, version: '0.9.3', stableSince: '2026-11-02T06:11:00Z' },
    { id: 'srv-eu-3.eu', name: 'srv-eu-3', raftId: '9f4a1b6e-7c2d-4a9b-b3e8-2d6f5c1a7e03', dc: 'eu-dc3', address: '10.10.0.13:4647', status: 'alive', leader: false, voter: true, lastIndex: 482112, lastTerm: 41, healthy: true, version: '0.9.3', stableSince: '2026-11-02T06:12:00Z' },
  ];

  const datacenters = [
    { name: 'eu-dc1', location: 'Site A (fake)', description: 'Primary site; ingress and most stateful work' },
    { name: 'eu-dc2', location: 'Site B (fake)', description: 'Batch and queue workers' },
    { name: 'eu-dc3', location: 'Site C (fake)', description: 'Small site for redundancy' },
  ];

  const nodePools = [
    { name: 'default', description: 'General purpose nodes, run by hand', scheduler: 'binpack', memoryOversubscription: false, meta: { owner: 'platform-team' } },
    { name: 'workers', description: 'Autoscaled worker nodes created by the node scaling operator', scheduler: 'spread', memoryOversubscription: true, meta: { owner: 'platform-team', autoscaled: 'true' } },
    { name: 'edge', description: 'Nodes with public addresses behind the load balancers', scheduler: 'binpack', memoryOversubscription: false, meta: { owner: 'network-team' } },
  ];

  const namespaces = [
    { name: 'default', description: 'Product workloads', quota: 'default-quota', pools: { default: 'default', allowed: ['default', 'workers'] } },
    { name: 'infra', description: 'Ingress and shared infrastructure', quota: 'infra-quota', pools: { default: 'edge', allowed: ['edge', 'default'] } },
    { name: 'norca-system', description: 'Operators installed from packs', quota: '', pools: { default: 'default', allowed: ['default'] } },
  ];

  // Task group sizes: cpu MHz, memory MB.
  const jobs = [
    {
      id: 'web', name: 'web', ns: 'default', type: 'service', status: 'running', version: 7, priority: 60,
      pool: 'default', datacenters: ['eu-*'], submittedAt: T('10:30'),
      groups: [{ name: 'frontend', count: 3, cpu: 500, mem: 512, tasks: [{ name: 'nginx', driver: 'docker', image: 'registry.example.test/web:2026.11.2' }], update: { max_parallel: 1, canary: 0, auto_revert: true } }],
      meta: { team: 'storefront' }, release: null, owner: null,
    },
    {
      id: 'api', name: 'api', ns: 'default', type: 'service', status: 'running', version: 12, priority: 70,
      pool: 'workers', datacenters: ['eu-dc1', 'eu-dc2'], submittedAt: '2026-11-04T14:05:00Z',
      groups: [{ name: 'api', count: 5, cpu: 1000, mem: 2048, tasks: [{ name: 'api', driver: 'docker', image: 'registry.example.test/api:4.18.0' }], scaling: 'pol-api', expose: { load_balancer: 'api-internal' } }],
      meta: { team: 'storefront' }, release: null, owner: null,
    },
    {
      id: 'worker', name: 'worker', ns: 'default', type: 'service', status: 'running', version: 5, priority: 50,
      pool: 'workers', datacenters: ['eu-dc2'], submittedAt: '2026-11-02T09:00:00Z',
      groups: [{ name: 'queue', count: 4, cpu: 2000, mem: 4096, tasks: [{ name: 'consumer', driver: 'docker', image: 'registry.example.test/worker:1.9.4' }], scaling: 'pol-worker' }],
      meta: { team: 'orders' }, release: null, owner: null,
    },
    {
      id: 'traefik', name: 'traefik', ns: 'infra', type: 'system', status: 'running', version: 3, priority: 90,
      pool: 'edge', datacenters: ['eu-*'], submittedAt: '2026-10-28T11:20:00Z',
      groups: [{ name: 'traefik', count: 3, cpu: 300, mem: 256, tasks: [{ name: 'traefik', driver: 'docker', image: 'registry.example.test/traefik:3.2.1' }], expose: { load_balancer: 'ingress-public' } }],
      meta: {}, release: 'infra/traefik', owner: null,
    },
    {
      id: 'nightly-report', name: 'nightly-report', ns: 'default', type: 'batch', periodic: '0 0 * * *', status: 'running', version: 2, priority: 40,
      pool: 'workers', datacenters: ['eu-dc1', 'eu-dc2'], submittedAt: '2026-10-20T16:00:00Z',
      groups: [{ name: 'report', count: 1, cpu: 1000, mem: 2048, tasks: [{ name: 'report', driver: 'exec', image: '/opt/report/bin/report' }] }],
      meta: { team: 'finance' }, release: null, owner: null, children: ['nightly-report/periodic-1762387200', 'nightly-report/periodic-1762300800'],
    },
    {
      id: 'nightly-report/periodic-1762387200', name: 'nightly-report/periodic-1762387200', ns: 'default', type: 'batch', status: 'dead', version: 2, priority: 40,
      pool: 'workers', datacenters: ['eu-dc1', 'eu-dc2'], submittedAt: T('00:00'), parent: 'nightly-report',
      groups: [{ name: 'report', count: 1, cpu: 1000, mem: 2048, tasks: [{ name: 'report', driver: 'exec', image: '/opt/report/bin/report' }] }],
      meta: {}, release: null, owner: null,
    },
    {
      id: 'nightly-report/periodic-1762300800', name: 'nightly-report/periodic-1762300800', ns: 'default', type: 'batch', status: 'dead', version: 2, priority: 40,
      pool: 'workers', datacenters: ['eu-dc1', 'eu-dc2'], submittedAt: '2026-11-05T00:00:00Z', parent: 'nightly-report',
      groups: [{ name: 'report', count: 1, cpu: 1000, mem: 2048, tasks: [{ name: 'report', driver: 'exec', image: '/opt/report/bin/report' }] }],
      meta: {}, release: null, owner: null,
    },
    {
      id: 'nodescaler-operator', name: 'nodescaler-operator', ns: 'norca-system', type: 'service', status: 'running', version: 4, priority: 80,
      pool: 'default', datacenters: ['eu-dc1'], submittedAt: '2026-11-01T10:00:00Z',
      groups: [{ name: 'operator', count: 1, cpu: 200, mem: 256, tasks: [{ name: 'nodescaler', driver: 'docker', image: 'registry.example.test/norca-nodescaler:0.6.0' }] }],
      meta: { 'norca.managed-by': 'release/nodescaler-operator' }, release: 'norca-system/nodescaler-operator', owner: null,
    },
    {
      id: 'lb-operator', name: 'lb-operator', ns: 'norca-system', type: 'service', status: 'running', version: 2, priority: 80,
      pool: 'default', datacenters: ['eu-dc1'], submittedAt: '2026-10-30T12:00:00Z',
      groups: [{ name: 'operator', count: 1, cpu: 200, mem: 256, tasks: [{ name: 'loadbalancer', driver: 'docker', image: 'registry.example.test/norca-loadbalancer:0.3.1' }] }],
      meta: { 'norca.managed-by': 'release/lb-operator' }, release: 'norca-system/lb-operator', owner: null,
    },
    {
      id: 'pg-operator', name: 'pg-operator', ns: 'norca-system', type: 'service', status: 'running', version: 3, priority: 80,
      pool: 'default', datacenters: ['eu-dc3'], submittedAt: '2026-11-03T15:00:00Z',
      groups: [{ name: 'operator', count: 1, cpu: 200, mem: 256, tasks: [{ name: 'pg-operator', driver: 'docker', image: 'registry.example.test/postgres-operator:0.2.0' }] }],
      meta: { 'norca.managed-by': 'release/pg-operator' }, release: 'norca-system/pg-operator', owner: null,
    },
    {
      id: 'pg-orders-db', name: 'pg-orders-db', ns: 'default', type: 'service', status: 'running', version: 1, priority: 75,
      pool: 'workers', datacenters: ['eu-dc1'], submittedAt: '2026-11-03T15:10:00Z',
      groups: [{ name: 'postgres', count: 1, cpu: 1000, mem: 4096, tasks: [{ name: 'postgres', driver: 'docker', image: 'registry.example.test/postgres:17.2' }] }],
      meta: { 'norca.owner': 'data.example.test/PostgresCluster/orders-db', 'norca.owner.kind': 'data.example.test/PostgresCluster', 'norca.managed-by': 'pg-operator' },
      release: null, owner: { kind: 'data.example.test/PostgresCluster', ns: 'default', name: 'orders-db' },
    },
    {
      id: 'pg-analytics-db', name: 'pg-analytics-db', ns: 'default', type: 'service', status: 'running', version: 1, priority: 75,
      pool: 'workers', datacenters: ['eu-dc1'], submittedAt: '2026-11-03T15:12:00Z',
      groups: [{ name: 'postgres', count: 1, cpu: 1000, mem: 4096, tasks: [{ name: 'postgres', driver: 'docker', image: 'registry.example.test/postgres:17.2' }] }],
      meta: { 'norca.owner': 'data.example.test/PostgresCluster/analytics-db', 'norca.owner.kind': 'data.example.test/PostgresCluster', 'norca.managed-by': 'pg-operator' },
      release: null, owner: { kind: 'data.example.test/PostgresCluster', ns: 'default', name: 'analytics-db' },
    },
  ];

  function alloc(id, job, group, index, nodeId, status, extra) {
    return Object.assign(
      {
        id,
        name: job + '.' + group + '[' + index + ']',
        job,
        group,
        ns: (jobs.find((j) => j.id === job) || {}).ns,
        node: nodeId,
        status,
        desired: 'run',
        version: (jobs.find((j) => j.id === job) || {}).version,
        eval: null,
        deployment: null,
        health: status === 'running' ? 'healthy' : '',
        prev: null,
        next: null,
        createdAt: '2026-11-04T14:06:00Z',
        cpuUse: 0.45,
        memUse: 0.6,
        desc: '',
        taskEvents: [],
      },
      extra || {}
    );
  }

  const allocations = [
    alloc(A.web0, 'web', 'frontend', 0, N.d1def1, 'running', { eval: E.web7, deployment: DEP.web7, createdAt: T('10:31'), cpuUse: 0.38, memUse: 0.52 }),
    alloc(A.web1, 'web', 'frontend', 1, N.d2def1, 'running', { eval: E.web7, deployment: DEP.web7, createdAt: T('10:34'), cpuUse: 0.41, memUse: 0.55 }),
    alloc(A.web2old, 'web', 'frontend', 2, N.d3def1, 'running', { version: 6, desired: 'stop', eval: E.web6, deployment: DEP.web6, createdAt: '2026-11-03T09:20:00Z', next: A.web2, desc: 'alloc is being updated due to job update', cpuUse: 0.33, memUse: 0.49 }),
    alloc(A.web2, 'web', 'frontend', 2, N.d3def1, 'pending', { eval: E.web7w, deployment: DEP.web7, createdAt: T('10:39'), prev: A.web2old, health: '', cpuUse: 0, memUse: 0, desc: 'Downloading image registry.example.test/web:2026.11.2' }),
    alloc(A.api0, 'api', 'api', 0, N.a1, 'running', { eval: E.api12, deployment: DEP.api12, cpuUse: 0.62, memUse: 0.71 }),
    alloc(A.api1, 'api', 'api', 1, N.a2, 'running', { eval: E.api12, deployment: DEP.api12, cpuUse: 0.58, memUse: 0.69 }),
    alloc(A.api2, 'api', 'api', 2, N.b3, 'running', { eval: E.api12, deployment: DEP.api12, cpuUse: 0.66, memUse: 0.74 }),
    alloc(A.api3, 'api', 'api', 3, N.b4, 'running', { eval: E.wDrain, deployment: DEP.api12, createdAt: T('10:02'), cpuUse: 0.49, memUse: 0.62 }),
    alloc(A.q0, 'worker', 'queue', 0, N.b1, 'running', { eval: E.wReg, deployment: DEP.worker5, createdAt: '2026-11-02T09:01:00Z', cpuUse: 0.81, memUse: 0.77 }),
    alloc(A.q1old, 'worker', 'queue', 1, N.b2, 'running', { eval: E.wReg, deployment: DEP.worker5, desired: 'stop', createdAt: '2026-11-02T09:01:00Z', next: A.q1, desc: 'alloc is being migrated: node eu-dc2-workers-b2 is draining', cpuUse: 0.12, memUse: 0.3 }),
    alloc(A.q1, 'worker', 'queue', 1, N.b4, 'running', { eval: E.wDrain, deployment: DEP.worker5, createdAt: T('10:38'), prev: A.q1old, cpuUse: 0.74, memUse: 0.7 }),
    alloc(A.q2, 'worker', 'queue', 2, N.b3, 'running', { eval: E.wReg, deployment: DEP.worker5, createdAt: '2026-11-02T09:01:00Z', cpuUse: 0.79, memUse: 0.81 }),
    alloc(A.q3, 'worker', 'queue', 3, N.b4, 'running', { eval: E.wBlocked, deployment: DEP.worker5, createdAt: T('09:58'), cpuUse: 0.76, memUse: 0.73 }),
    alloc(A.tr0, 'traefik', 'traefik', 0, N.d1edge, 'running', { eval: E.traefik, deployment: DEP.traefik3, createdAt: '2026-10-28T11:21:00Z', cpuUse: 0.22, memUse: 0.4 }),
    alloc(A.tr1, 'traefik', 'traefik', 0, N.d2edge, 'running', { eval: E.traefik, deployment: DEP.traefik3, createdAt: '2026-10-28T11:21:00Z', cpuUse: 0.19, memUse: 0.38 }),
    alloc(A.tr2, 'traefik', 'traefik', 0, N.d3edge, 'running', { eval: E.traefik, deployment: DEP.traefik3, createdAt: '2026-10-28T11:21:00Z', cpuUse: 0.2, memUse: 0.37 }),
    alloc(A.rep1, 'nightly-report/periodic-1762387200', 'report', 0, N.b3, 'complete', { eval: E.periodic, createdAt: T('00:00'), health: '', cpuUse: 0, memUse: 0, desc: 'Exited with code 0 after 41m' }),
    alloc(A.rep0, 'nightly-report/periodic-1762300800', 'report', 0, N.a1, 'failed', { createdAt: '2026-11-05T00:00:00Z', health: '', cpuUse: 0, memUse: 0, desc: 'Exited with code 1: connection to orders-db refused' }),
    alloc(A.opNs, 'nodescaler-operator', 'operator', 0, N.d1def2, 'running', { createdAt: '2026-11-01T10:01:00Z', cpuUse: 0.18, memUse: 0.44 }),
    alloc(A.opLb, 'lb-operator', 'operator', 0, N.d1def1, 'running', { createdAt: '2026-10-30T12:01:00Z', cpuUse: 0.09, memUse: 0.31 }),
    alloc(A.opPgLost, 'pg-operator', 'operator', 0, N.d3def2, 'lost', { createdAt: '2026-11-03T15:01:00Z', desired: 'stop', next: A.opPg, health: '', cpuUse: 0, memUse: 0, desc: 'alloc is lost since its node is down' }),
    alloc(A.opPg, 'pg-operator', 'operator', 0, N.d3def1, 'running', { eval: E.nodeDown, createdAt: T('10:02'), prev: A.opPgLost, cpuUse: 0.11, memUse: 0.35 }),
    alloc(A.pgOrders, 'pg-orders-db', 'postgres', 0, N.a2, 'running', { createdAt: '2026-11-03T15:11:00Z', cpuUse: 0.36, memUse: 0.82 }),
    alloc(A.pgAnFail, 'pg-analytics-db', 'postgres', 0, N.a1, 'failed', { createdAt: '2026-11-03T15:13:00Z', desired: 'stop', next: A.pgAn, deployment: DEP.pgAn1, health: 'unhealthy', cpuUse: 0, memUse: 0, desc: 'OOM killed: postgres used 4096 MB of 4096 MB' }),
    alloc(A.pgAn, 'pg-analytics-db', 'postgres', 0, N.a1, 'pending', { eval: E.pgFail, createdAt: T('10:40'), prev: A.pgAnFail, deployment: DEP.pgAn1, health: '', cpuUse: 0, memUse: 0, desc: 'Restarting in 25s (reschedule 3 of 5)' }),
  ];

  // Task events of a few allocations (the rest get generic ones).
  allocations.find((a) => a.id === A.web2).taskEvents = [
    { time: T('10:39'), task: 'nginx', type: 'Received', msg: 'Task received by client' },
    { time: T('10:39'), task: 'nginx', type: 'Task Setup', msg: 'Building task directory' },
    { time: T('10:40'), task: 'nginx', type: 'Driver', msg: 'Downloading image registry.example.test/web:2026.11.2' },
  ];
  allocations.find((a) => a.id === A.pgAnFail).taskEvents = [
    { time: '2026-11-06T10:12:00Z', task: 'postgres', type: 'Started', msg: 'Task started by client' },
    { time: '2026-11-06T10:39:00Z', task: 'postgres', type: 'Terminated', msg: 'Exit Code: 137, Exit Message: "OOM Killed"' },
    { time: '2026-11-06T10:39:00Z', task: 'postgres', type: 'Not Restarting', msg: 'Exceeded allowed attempts 2 in interval 30m0s' },
  ];

  const evaluations = [
    { id: E.web6, job: 'web', ns: 'default', triggeredBy: 'job-register', status: 'complete', type: 'service', priority: 60, createdAt: '2026-11-03T09:19:00Z', deployment: DEP.web6, node: null, desc: '' },
    { id: E.web7, job: 'web', ns: 'default', triggeredBy: 'job-register', status: 'complete', type: 'service', priority: 60, createdAt: T('10:30'), deployment: DEP.web7, node: null, next: E.web7w, desc: 'Placed 3 of 3, rolling update with max_parallel 1' },
    { id: E.web7w, job: 'web', ns: 'default', triggeredBy: 'deployment-watcher', status: 'complete', type: 'service', priority: 60, createdAt: T('10:39'), deployment: DEP.web7, node: null, prev: E.web7, desc: 'Next rolling step: web.frontend[2]' },
    { id: E.wReg, job: 'worker', ns: 'default', triggeredBy: 'job-register', status: 'complete', type: 'service', priority: 50, createdAt: T('09:49'), deployment: DEP.worker5, node: null, blockedEval: E.wBlocked, desc: 'Placed 3 of 4; 1 allocation queued' },
    {
      id: E.wBlocked, job: 'worker', ns: 'default', triggeredBy: 'queued-allocs', status: 'complete', type: 'service', priority: 50, createdAt: T('09:49'), deployment: null, node: null, prev: E.wReg,
      desc: 'Was blocked until eu-dc2-workers-b4 joined at 09:58; placed worker.queue[3]',
      failed: { queue: { count: 1, nodesEvaluated: 4, nodesFiltered: 0, exhausted: { memory: 4, cpu: 1 }, classExhausted: { cx32: 4 }, quota: '' } },
    },
    { id: E.wDrain, job: 'worker', ns: 'default', triggeredBy: 'node-drain', status: 'complete', type: 'service', priority: 50, createdAt: T('10:38'), deployment: null, node: N.b2, desc: 'Migrated worker.queue[1] from eu-dc2-workers-b2' },
    { id: E.nodeDown, job: 'pg-operator', ns: 'norca-system', triggeredBy: 'node-update', status: 'complete', type: 'service', priority: 80, createdAt: T('10:02'), deployment: null, node: N.d3def2, desc: 'Node eu-dc3-default-02 down; replaced pg-operator.operator[0]' },
    { id: E.periodic, job: 'nightly-report/periodic-1762387200', ns: 'default', triggeredBy: 'periodic-job', status: 'complete', type: 'batch', priority: 40, createdAt: T('00:00'), deployment: null, node: null, desc: '' },
    { id: E.pgFail, job: 'pg-analytics-db', ns: 'default', triggeredBy: 'alloc-failure', status: 'complete', type: 'service', priority: 75, createdAt: T('10:39'), deployment: DEP.pgAn1, node: null, desc: 'Rescheduled pg-analytics-db.postgres[0] after OOM kill' },
    { id: E.api12, job: 'api', ns: 'default', triggeredBy: 'job-register', status: 'complete', type: 'service', priority: 70, createdAt: '2026-11-04T14:05:00Z', deployment: DEP.api12, node: null, desc: '' },
    {
      id: E.apiBlocked, job: 'api', ns: 'default', triggeredBy: 'job-scaling', status: 'blocked', type: 'service', priority: 70, createdAt: T('10:20'), deployment: null, node: null,
      desc: 'api scaled 4 → 5 by policy api/api; 1 allocation cannot be placed',
      failed: { api: { count: 1, nodesEvaluated: 6, nodesFiltered: 1, exhausted: { memory: 4, cpu: 2 }, classExhausted: { cx32: 5 }, filteredReason: 'eu-dc1-workers-x9: node is ineligible', quota: '' } },
    },
    { id: E.traefik, job: 'traefik', ns: 'infra', triggeredBy: 'job-register', status: 'complete', type: 'system', priority: 90, createdAt: '2026-10-28T11:20:00Z', deployment: DEP.traefik3, node: null, desc: '' },
  ];

  const deployments = [
    { id: DEP.web7, job: 'web', ns: 'default', version: 7, status: 'running', desc: 'Deployment is running', createdAt: T('10:30'), progressDeadline: '10m', groups: [{ name: 'frontend', desired: 3, placed: 3, healthy: 2, unhealthy: 0, canaries: 0, autoRevert: true }], evals: [E.web7, E.web7w], diff: [['task "nginx" config.image', 'registry.example.test/web:2026.11.1', 'registry.example.test/web:2026.11.2'], ['meta.build', '4471', '4502']] },
    { id: DEP.web6, job: 'web', ns: 'default', version: 6, status: 'successful', desc: 'Deployment completed successfully', createdAt: '2026-11-03T09:19:00Z', progressDeadline: '10m', groups: [{ name: 'frontend', desired: 3, placed: 3, healthy: 3, unhealthy: 0, canaries: 0, autoRevert: true }], evals: [E.web6], diff: [] },
    { id: DEP.api12, job: 'api', ns: 'default', version: 12, status: 'successful', desc: 'Deployment completed successfully', createdAt: '2026-11-04T14:05:00Z', progressDeadline: '10m', groups: [{ name: 'api', desired: 4, placed: 4, healthy: 4, unhealthy: 0, canaries: 1, autoRevert: true }], evals: [E.api12], diff: [] },
    { id: DEP.worker5, job: 'worker', ns: 'default', version: 5, status: 'successful', desc: 'Deployment completed successfully', createdAt: '2026-11-02T09:00:00Z', progressDeadline: '15m', groups: [{ name: 'queue', desired: 3, placed: 3, healthy: 3, unhealthy: 0, canaries: 0, autoRevert: false }], evals: [E.wReg], diff: [] },
    { id: DEP.traefik3, job: 'traefik', ns: 'infra', version: 3, status: 'successful', desc: 'Deployment completed successfully', createdAt: '2026-10-28T11:20:00Z', progressDeadline: '5m', groups: [{ name: 'traefik', desired: 3, placed: 3, healthy: 3, unhealthy: 0, canaries: 0, autoRevert: false }], evals: [E.traefik], diff: [] },
    { id: DEP.pgAn1, job: 'pg-analytics-db', ns: 'default', version: 1, status: 'failed', desc: 'Failed due to unhealthy allocations', createdAt: '2026-11-03T15:12:00Z', progressDeadline: '10m', groups: [{ name: 'postgres', desired: 1, placed: 2, healthy: 0, unhealthy: 1, canaries: 0, autoRevert: false }], evals: [E.pgFail], diff: [] },
  ];

  const services = [
    { name: 'web', ns: 'default', job: 'web', group: 'frontend', port: 'http', tags: ['http', 'frontend'], instances: [[A.web0, '10.10.1.11:23110', 'passing'], [A.web1, '10.10.2.11:28431', 'passing'], [A.web2old, '10.10.3.11:21907', 'passing']], lbs: [] },
    { name: 'api', ns: 'default', job: 'api', group: 'api', port: 'http', tags: ['http', 'api'], instances: [[A.api0, '10.10.1.21:24512', 'passing'], [A.api1, '10.10.1.22:29870', 'passing'], [A.api2, '10.10.2.23:22231', 'passing'], [A.api3, '10.10.2.24:20177', 'warning']], lbs: ['default/api-internal'] },
    { name: 'traefik-https', ns: 'infra', job: 'traefik', group: 'traefik', port: 'https', tags: ['https', 'ingress'], instances: [[A.tr0, '10.10.1.13:443', 'passing'], [A.tr1, '10.10.2.13:443', 'passing'], [A.tr2, '10.10.3.13:443', 'passing']], lbs: ['infra/ingress-public'], meta: { norca_lb_class: 'hetzner-lb', norca_lb_port: '443', norca_lb_internal: 'false' } },
    { name: 'nodescaler-operator-join', ns: 'norca-system', job: 'nodescaler-operator', group: 'operator', port: 'join', tags: ['join'], instances: [[A.opNs, '10.10.1.12:8490', 'passing']], lbs: [] },
    { name: 'orders-db', ns: 'default', job: 'pg-orders-db', group: 'postgres', port: 'pg', tags: ['postgres', 'primary'], instances: [[A.pgOrders, '10.10.1.22:25432', 'passing']], lbs: [] },
    { name: 'analytics-db', ns: 'default', job: 'pg-analytics-db', group: 'postgres', port: 'pg', tags: ['postgres', 'primary'], instances: [], lbs: [] },
  ];

  const intentions = [
    { source: 'infra/traefik-https', destination: 'default/web', action: 'allow' },
    { source: 'infra/traefik-https', destination: 'default/api', action: 'allow' },
    { source: 'default/web', destination: 'default/api', action: 'allow' },
    { source: 'default/api', destination: 'default/orders-db', action: 'allow' },
    { source: 'default/worker', destination: 'default/orders-db', action: 'allow' },
    { source: '*/*', destination: 'default/orders-db', action: 'deny' },
  ];

  // Conditions use the shape of custom object status conditions.
  const C = (type, status, reason, message, lastTransitionTime, retryAfter) => ({ type, status, reason, message, lastTransitionTime, retryAfter });

  const nodeGroups = [
    {
      name: 'workers-dc2',
      id: '2f9c8e1a-6b3d-4a7e-9c2f-1e5d8b4a7c21',
      generation: 9,
      createdAt: '2026-09-28T10:00:00Z',
      managedBy: 'nodescaler-operator',
      finalizers: ['norca.io/nodescaler'],
      labels: { tier: 'workers', site: 'b' },
      spec: {
        enabled: true, enforce: true, engine: 'builtin', pool: 'workers', datacenter: 'eu-dc2', node_class: 'cx32',
        replicas: 4, min: 2, max: 6, priority: 10, weight: 1, headroom_nodes: 0, spill: false,
        provider: 'hetzner-eu', group: 'fsn1', network: '10.10.2.0/24',
        node: { capacity: { cpu: 8000, memory: 16384, disk: 160000 }, reserved: { cpu: 200, memory: 512 }, parameters: { server_type: 'cx32', image: 'norca-node-2026-11' }, meta: { tier: 'workers' } },
        rolling: { mode: 'auto', generation: 3, max_node_age: '45d', max_unavailable: 2, max_surge: 1, jitter: '15%' },
        deletion: { policy: 'drain', drain_timeout: '1h' },
        join: { deadline: '15m', slow_after: '5m', max_failures: 3 },
        policy: { evaluation_interval: '30s', cooldown: '5m', scale_down: { unneeded_for: '10m', delay_after_add: '10m', utilization_below: 40, selector: 'least_busy', drain_deadline: '15m' } },
      },
      status: {
        replicas: 2, joining: 1, failed: 0, observedGeneration: 9, lastRequest: 22,
        capacity: { cpu: 8000, memory: 16384, disk: 160000 }, allocatable: { cpu: 7800, memory: 15872, disk: 160000 },
        nodes: [
          { instance: 'hz-fsn1-7702', state: 'running', request: 14, created: '2026-10-02T08:12:00Z', node: N.b1, ready: true },
          { instance: 'hz-fsn1-7703', state: 'running', request: 14, created: '2026-10-02T08:12:00Z', node: N.b2, ready: true },
          { instance: 'hz-fsn1-7704', state: 'running', request: 14, created: '2026-10-02T08:12:00Z', node: N.b3, ready: true },
          { instance: 'hz-fsn1-7714', state: 'running', request: 21, created: T('09:51'), node: N.b4, ready: true },
          { instance: 'hz-fsn1-7716', state: 'creating', request: 22, created: T('10:38') },
        ],
        rollout: {
          replacing: [
            { instance: 'hz-fsn1-7702', name: 'hz-fsn1-7702', node: N.b1, nodeName: 'eu-dc2-workers-b1', reason: 'revision', surge: true, drain: false, phase: 'surging', since: T('10:38'), started: T('10:38'), expires: '2026-11-26T08:12:00Z' },
            { instance: 'hz-fsn1-7703', name: 'hz-fsn1-7703', node: N.b2, nodeName: 'eu-dc2-workers-b2', reason: 'revision', surge: false, drain: true, phase: 'draining', since: T('10:38'), started: T('10:38'), expires: '2026-11-26T08:12:00Z' },
          ],
          outdated: ['eu-dc2-workers-b3'],
          warned: [],
          took: '14m20s',
        },
        decision: {
          time: T('09:50'), replicas: 4, previous: 3, check: 'blocked-demand',
          reason: '1 allocation of default/worker/queue blocked: 2000 MHz CPU, 4096 MB memory in eu-dc2/workers',
          evaluations: [E.wBlocked],
          work: [{ namespace: 'default', job: 'worker', group: 'queue', count: 1 }],
        },
        join: { failures: 0, revision: 'c93f5d18', resumed: 0, lastFailure: '' },
        conditions: [
          C('ProviderAvailable', 'True', 'Available', 'hetzner-eu answered 2s ago (version 0.6.1)', '2026-10-30T08:00:00Z'),
          C('Provisioned', 'True', 'Provisioned', 'request eu/workers-dc2/22 accepted', T('10:38')),
          C('Rolling', 'True', 'Replacing', '2 of 3 outdated nodes being replaced (template revision c93f5d18): eu-dc2-workers-b1 waits for its replacement, eu-dc2-workers-b2 is draining', T('10:38')),
          C('RollBlocked', 'False', 'NotBlocked', '', '2026-10-02T08:20:00Z'),
          C('RollBehind', 'False', 'OnTime', 'last node done by Nov 6, 11:40, 20 days before the first hard limit', T('10:38')),
          C('JoinFailing', 'False', 'Joining', 'no join failures in a row', '2026-10-02T08:20:00Z'),
          C('ForeignNode', 'False', 'NoForeignNode', '', '2026-10-02T08:20:00Z'),
          C('ScaleDownBlocked', 'False', 'NotBlocked', '', '2026-10-15T12:00:00Z'),
          C('NetworkCovered', 'True', 'Covered', '10.10.2.0/24 is inside the published cluster ranges', '2026-09-28T10:01:00Z'),
        ],
      },
      // Lanes of the node lifecycle timeline.
      lifecycle: [
        { label: 'hz-fsn1-7702', node: N.b1, segs: [['running', '07:30', '10:38'], ['surging', '10:38', 'now']] },
        { label: 'hz-fsn1-7703', node: N.b2, segs: [['running', '07:30', '10:38'], ['draining', '10:38', 'now']] },
        { label: 'hz-fsn1-7704', node: N.b3, segs: [['running', '07:30', 'now', 'outdated since 09:40']] },
        { label: 'hz-fsn1-7714', node: N.b4, segs: [['requested', '09:51', '09:52'], ['joining', '09:52', '09:58'], ['running', '09:58', 'now']] },
        { label: 'hz-fsn1-7716', node: null, segs: [['requested', '10:38', '10:39'], ['joining', '10:39', 'now']] },
      ],
      marks: [['09:40', 'template changed (image norca-node-2026-11)'], ['09:50', 'Scaled 3 → 4'], ['10:38', 'rollout started']],
      events: [
        { time: T('09:40'), type: 'Normal', reason: 'TemplateChanged', message: 'spec.node.parameters.image norca-node-2026-10 → norca-node-2026-11; revision 7a41e0c2 → c93f5d18', reporter: 'nodescaler-operator' },
        { time: T('09:41'), type: 'Normal', reason: 'WouldReplace', message: '3 nodes are outdated (revision): eu-dc2-workers-b1, b2, b3; the group grows first', reporter: 'nodescaler-operator' },
        { time: T('09:50'), type: 'Normal', reason: 'Scaled', message: 'replicas 3 → 4 (blocked-demand: 1 allocation of default/worker/queue)', reporter: 'autoscaler' },
        { time: T('09:51'), type: 'Normal', reason: 'InstancesRequested', message: 'request eu/workers-dc2/21: 1 instance (hz-fsn1-7714)', reporter: 'nodescaler-operator' },
        { time: T('09:58'), type: 'Normal', reason: 'NodeJoined', message: 'hz-fsn1-7714 joined as eu-dc2-workers-b4 after 7m', reporter: 'nodescaler-operator' },
        { time: T('09:58'), type: 'Normal', reason: 'CertificateIssued', message: 'certificate of eu-dc2-workers-b4 valid until Jan 5, 2027', reporter: 'nodescaler-operator' },
        { time: T('10:38'), type: 'Normal', reason: 'Replacing', message: 'eu-dc2-workers-b1 (revision): surge, waiting for its replacement', reporter: 'nodescaler-operator' },
        { time: T('10:38'), type: 'Normal', reason: 'InstancesRequested', message: 'request eu/workers-dc2/22: 1 instance (hz-fsn1-7716) for the replacement of eu-dc2-workers-b1', reporter: 'nodescaler-operator' },
        { time: T('10:38'), type: 'Normal', reason: 'Replacing', message: 'eu-dc2-workers-b2 (revision): remove first, draining with deadline 15m', reporter: 'nodescaler-operator' },
      ],
    },
    {
      name: 'workers-dc1',
      id: '8b4e2d7c-1f9a-4c3b-a6e5-7d2c9f1b3e42',
      generation: 14,
      createdAt: '2026-09-10T08:00:00Z',
      managedBy: 'nodescaler-operator',
      finalizers: ['norca.io/nodescaler'],
      labels: { tier: 'workers', site: 'a' },
      spec: {
        enabled: true, enforce: true, engine: 'builtin', pool: 'workers', datacenter: 'eu-dc1', node_class: 'cx32',
        replicas: 3, min: 2, max: 4, priority: 20, weight: 1, headroom_nodes: 0, spill: false,
        provider: 'hetzner-eu', group: 'nbg1', network: '10.10.1.0/24',
        node: { capacity: { cpu: 8000, memory: 16384, disk: 160000 }, reserved: { cpu: 200, memory: 512 }, parameters: { server_type: 'cx32', image: 'norca-node-2026-09' } },
        rolling: { mode: 'auto', generation: 2, max_node_age: '30d', max_unavailable: 1, max_surge: 1, jitter: '15%' },
        deletion: { policy: 'drain', drain_timeout: '1h' },
        join: { deadline: '15m', slow_after: '5m', max_failures: 3 },
        policy: { evaluation_interval: '30s', cooldown: '5m', scale_down: { unneeded_for: '10m', delay_after_add: '10m', utilization_below: 40, selector: 'least_busy', drain_deadline: '15m' } },
      },
      status: {
        replicas: 2, joining: 0, failed: 1, observedGeneration: 14, lastRequest: 37,
        capacity: { cpu: 8000, memory: 16384, disk: 160000 }, allocatable: { cpu: 7800, memory: 15872, disk: 160000 },
        nodes: [
          { instance: 'hz-nbg1-4821', state: 'running', request: 31, created: '2026-09-18T07:38:00Z', node: N.a1, ready: true },
          { instance: 'hz-nbg1-4822', state: 'running', request: 30, created: '2026-09-15T13:02:00Z', node: N.a2, ready: true },
          { instance: '(request 37)', state: 'failed', request: 37, created: T('10:21'), reason: 'Quota: server limit of the project reached in nbg1 (10 of 10)' },
        ],
        rollout: {
          replacing: [],
          outdated: ['eu-dc1-workers-a1', 'eu-dc1-workers-a2'],
          warned: ['eu-dc1-workers-a2'],
          took: '11m05s',
          backoff: { vetoes: 3, retryAfter: T('11:20'), reason: 'Quota', message: 'the provider refused the surge instance: server limit of the project reached in nbg1 (10 of 10)' },
        },
        decision: {
          time: T('10:21'), replicas: 3, previous: 2, check: 'blocked-demand',
          reason: '1 allocation of default/api/api blocked: 1000 MHz CPU, 2048 MB memory in eu-dc1/workers',
          evaluations: [E.apiBlocked],
          work: [{ namespace: 'default', job: 'api', group: 'api', count: 1 }],
        },
        strayNodes: [{ node: N.x9, name: 'eu-dc1-workers-x9', instance: 'hz-nbg1-4799', kind: 'foreign' }],
        join: { failures: 0, revision: '3be2a917', resumed: 0, lastFailure: '' },
        conditions: [
          C('ProviderAvailable', 'True', 'Available', 'hetzner-eu answered 2s ago (version 0.6.1)', '2026-10-30T08:00:00Z'),
          C('Provisioned', 'False', 'Quota', 'the provider refused request eu/workers-dc1/37: server limit of the project reached in nbg1 (10 of 10)', T('10:21')),
          C('Rolling', 'False', 'BackedOff', '2 nodes are outdated (age); replacements backed off after 3 vetoes', T('09:10')),
          C('RollBlocked', 'True', 'Quota', 'eu-dc1-workers-a2 is 3 days from its hard age limit (Nov 9, 13:02) and its replacement is backed off: the provider refuses new instances (quota)', T('09:10'), T('11:20')),
          C('RollBehind', 'False', 'OnTime', 'remove-first at the hard limit keeps the queue on time', T('09:10')),
          C('JoinFailing', 'False', 'Joining', '', '2026-09-18T07:45:00Z'),
          C('ForeignNode', 'True', 'ForeignNode', 'eu-dc1-workers-x9 is ready with the marks of this group (instance hz-nbg1-4799) but the provider has no such instance; made ineligible', '2026-11-05T16:22:00Z'),
          C('ScaleDownBlocked', 'False', 'NotBlocked', '', '2026-10-20T12:00:00Z'),
          C('NetworkCovered', 'Unknown', 'NetworkUnchecked', 'the deployer publishes no cluster ranges', '2026-09-10T08:01:00Z'),
        ],
      },
      lifecycle: [
        { label: 'hz-nbg1-4821', node: N.a1, segs: [['running', '07:30', 'now', 'outdated (age)']] },
        { label: 'hz-nbg1-4822', node: N.a2, segs: [['running', '07:30', 'now', 'outdated, hard limit warned']] },
        { label: 'request 37', node: null, segs: [['failed', '10:21', '10:22']] },
        { label: 'hz-nbg1-4799 (foreign)', node: N.x9, segs: [['foreign', '07:30', 'now']] },
      ],
      marks: [['09:10', 'backoff 3'], ['10:21', 'Scaled 2 → 3']],
      events: [
        { time: '2026-11-05T16:22:00Z', type: 'Warning', reason: 'ForeignNode', message: 'eu-dc1-workers-x9 is ready without an instance the operator asked for (hz-nbg1-4799)', reporter: 'nodescaler-operator' },
        { time: '2026-11-05T16:22:00Z', type: 'Normal', reason: 'NodeIneligible', message: 'eu-dc1-workers-x9 made ineligible for new work', reporter: 'nodescaler-operator' },
        { time: T('07:02'), type: 'Warning', reason: 'ReplacementFailed', message: 'surge instance for eu-dc1-workers-a2 refused: Quota (veto 1)', reporter: 'nodescaler-operator' },
        { time: T('08:05'), type: 'Warning', reason: 'ReplacementFailed', message: 'surge instance for eu-dc1-workers-a2 refused: Quota (veto 2)', reporter: 'nodescaler-operator' },
        { time: T('09:10'), type: 'Warning', reason: 'ReplacementFailed', message: 'surge instance for eu-dc1-workers-a2 refused: Quota (veto 3); backed off until 11:20', reporter: 'nodescaler-operator' },
        { time: T('09:10'), type: 'Warning', reason: 'RollBlocked', message: 'eu-dc1-workers-a2 is 3 days from its hard limit; at the limit it is replaced remove-first', reporter: 'nodescaler-operator' },
        { time: T('10:21'), type: 'Normal', reason: 'Scaled', message: 'replicas 2 → 3 (blocked-demand: 1 allocation of default/api/api)', reporter: 'autoscaler' },
        { time: T('10:21'), type: 'Warning', reason: 'CreateFailed', message: 'request eu/workers-dc1/37 refused: Quota (server limit 10 of 10 in nbg1)', reporter: 'nodescaler-operator' },
      ],
    },
  ];

  const nodeProviders = [
    {
      name: 'hetzner-eu', id: '4a7d1e9c-3b6f-4d2a-8e5c-9f1b7d3a6c51', createdAt: '2026-09-01T09:00:00Z',
      spec: { endpoint: 'https://nodes.provider.example.test:8443', token_variable: 'nodescaler/hetzner-eu/token', groups: [{ name: 'fsn1', max: 20 }, { name: 'nbg1', max: 10 }], parameters: { project: 'norca-demo' } },
      status: { heartbeat: '2026-11-06T10:41:58Z', version: '0.6.1', conditions: [C('Available', 'True', 'Heartbeat', 'heartbeat 2s ago', '2026-10-30T08:00:00Z')] },
      events: [
        { time: '2026-11-05T22:14:00Z', type: 'Warning', reason: 'OrphanedInstance', message: 'instance hz-fsn1-7690 of node group workers-tmp (gone) still runs node eu-dc2-tmp-01; left as it is (-delete-orphans is off)', reporter: 'nodescaler-operator' },
      ],
      orphaned: 1,
    },
    {
      name: 'lab-hyperv', id: '7e2b5c8a-9d1f-4a6e-b3c7-2f8d4e1a9b62', createdAt: '2026-10-12T14:00:00Z',
      spec: { endpoint: 'http://10.20.0.5:8090', token_variable: 'nodescaler/lab-hyperv/token', groups: [{ name: 'lab', max: 6 }], parameters: {} },
      status: { heartbeat: '2026-11-06T07:02:11Z', version: '0.5.0', conditions: [C('Available', 'False', 'HeartbeatStale', 'no heartbeat for 3h40m (TTL 2m)', T('07:04'))] },
      events: [],
      orphaned: 0,
    },
  ];

  const lbClasses = [
    { name: 'hetzner-lb', id: '6c1e8a3f-2d7b-4e9c-a5f1-8b3d6e2c9a71', spec: { endpoint: 'https://lb.provider.example.test:8444', tokenVariable: 'loadbalancer/hetzner-lb/token', capabilities: { internal: false, ports: '80,443,8000-8100' } }, status: { lastHeartbeat: '2026-11-06T10:41:50Z', version: '0.3.1' }, ttl: '60s', release: 'norca-system/lb-operator' },
    { name: 'nomad', id: '9a3f6d1c-8e2b-4c7a-b1d5-3e9f2a6c8b82', spec: { endpoint: 'https://lb-operator.service.internal:9443', capabilities: { internal: true, ports: '' } }, status: { lastHeartbeat: '2026-11-06T10:41:55Z', version: '0.3.1' }, ttl: '60s', release: 'norca-system/lb-operator', builtin: true },
  ];

  const loadBalancers = [
    {
      name: 'ingress-public', ns: 'infra', id: '3d8b1f6e-5a2c-4e7d-9b4f-1c6a8e3d5f91', generation: 2, createdAt: '2026-10-28T11:22:00Z',
      managedBy: 'lb-operator', owners: [{ kind: 'Job', ns: 'infra', name: 'traefik' }],
      spec: { service: 'traefik-https', class: 'hetzner-lb', port: 443, internal: false, replicas: 1, datacenters: ['eu-dc1', 'eu-dc2', 'eu-dc3'] },
      status: { class: 'hetzner-lb', addresses: ['203.0.113.40', '2001:db8:40::1'], targets: ['10.10.1.13:443', '10.10.2.13:443', '10.10.3.13:443'], leavingNodes: [], resource: 'lb-hz-77120', conditions: [C('Ready', 'True', 'Provisioned', '3 targets healthy', '2026-10-28T11:24:00Z')] },
      events: [
        { time: '2026-10-28T11:24:00Z', type: 'Normal', reason: 'Provisioned', message: 'lb-hz-77120 created with 3 targets', reporter: 'lb-operator' },
        { time: T('09:58'), type: 'Normal', reason: 'TargetsUnchanged', message: 'node change in eu-dc2 does not touch the edge pool', reporter: 'lb-operator' },
      ],
    },
    {
      name: 'api-internal', ns: 'default', id: '5f2a9c7e-1b4d-4a8f-8c3e-6d9b2f5a1c02', generation: 1, createdAt: '2026-11-04T14:06:00Z',
      managedBy: 'lb-operator', owners: [{ kind: 'Job', ns: 'default', name: 'api' }],
      spec: { service: 'api', class: 'hetzner-lb', port: 8080, internal: true, replicas: 1, datacenters: ['eu-dc1', 'eu-dc2'] },
      status: { class: 'hetzner-lb', addresses: [], targets: [], leavingNodes: [], resource: '', conditions: [C('Ready', 'False', 'Unsupported', 'class hetzner-lb does not offer internal load balancers (capabilities.internal = false)', '2026-11-04T14:06:00Z')] },
      events: [
        { time: '2026-11-04T14:06:00Z', type: 'Warning', reason: 'Unsupported', message: 'class hetzner-lb does not offer internal load balancers', reporter: 'lb-operator' },
      ],
    },
  ];

  const kinds = [
    { group: 'norca.io', kind: 'NodeGroup', description: 'Capacity group of nodes of a node pool in a datacenter, scaled by the autoscaler and created by an operator (built in)', builtIn: true, namespaced: false, release: null, operator: 'nodescaler-operator', webhooks: [], columns: ['Pool', 'Datacenter', 'Class', 'Replicas', 'Ready', 'Min', 'Max', 'Enforce'], createdAt: '2026-08-14T09:00:00Z', page: 'node-group.html' },
    { group: 'norca.io', kind: 'NodeProvider', description: 'Provider of nodes: an application that creates and deletes machines of a platform (built in)', builtIn: true, namespaced: false, release: null, operator: 'nodescaler-operator', webhooks: [], columns: ['Endpoint', 'Heartbeat', 'Version'], createdAt: '2026-08-14T09:00:00Z', page: 'node-provider.html' },
    { group: 'norca.io', kind: 'LoadBalancer', description: 'A load balancer in front of a service, created by the LoadBalancer operator', builtIn: false, namespaced: true, release: 'norca-system/lb-operator', operator: 'lb-operator', webhooks: ['https://lb-operator.service.internal:9443/validate'], columns: ['Service', 'Class', 'Port', 'Addresses'], createdAt: '2026-10-30T12:00:00Z', page: 'load-balancer.html' },
    { group: 'norca.io', kind: 'LoadBalancerClass', description: 'A provider of load balancers, registered by the provider with a heartbeat', builtIn: false, namespaced: false, release: 'norca-system/lb-operator', operator: 'lb-operator', webhooks: [], columns: ['Endpoint', 'Heartbeat', 'Version'], createdAt: '2026-10-30T12:00:00Z' },
    { group: 'data.example.test', kind: 'PostgresCluster', description: 'A PostgreSQL cluster run as a job by the postgres operator (example kind)', builtIn: false, namespaced: true, release: 'norca-system/pg-operator', operator: 'pg-operator', webhooks: ['https://pg-operator.service.internal:9443/reconcile'], columns: ['Version', 'Instances', 'Storage', 'Phase'], createdAt: '2026-11-03T15:00:00Z' },
  ];

  // Generic custom objects (the kinds without a page of their own).
  const objects = [
    {
      kind: 'data.example.test/PostgresCluster', name: 'orders-db', ns: 'default', id: 'b2e7c4a9-6f1d-4b3e-8a5c-9d2f7e1b4c13', generation: 3, createdAt: '2026-11-03T15:10:00Z',
      managedBy: 'pg-operator', labels: { team: 'orders', tier: 'data' }, finalizers: ['data.example.test/pg-operator'], owners: [],
      spec: { version: '17', instances: 1, storage: '50Gi', backup: { schedule: '0 3 * * *' } },
      status: { phase: 'Running', instances: 1, primary: 'pg-orders-db.postgres[0]', conditions: [C('Ready', 'True', 'PrimaryRunning', 'primary accepts connections', '2026-11-03T15:12:00Z'), C('Degraded', 'False', 'Healthy', '', '2026-11-03T15:12:00Z'), C('Progressing', 'False', 'Stable', '', '2026-11-03T15:12:00Z')] },
      events: [
        { time: '2026-11-03T15:10:00Z', type: 'Normal', reason: 'JobCreated', message: 'created job pg-orders-db', reporter: 'pg-operator' },
        { time: '2026-11-03T15:12:00Z', type: 'Normal', reason: 'Ready', message: 'primary accepts connections', reporter: 'pg-operator' },
      ],
    },
    {
      kind: 'data.example.test/PostgresCluster', name: 'analytics-db', ns: 'default', id: 'c8f3a1d6-2e9b-4c7a-b5d4-1f6e9c3a8d24', generation: 5, createdAt: '2026-11-03T15:12:00Z',
      managedBy: 'pg-operator', labels: { team: 'finance', tier: 'data' }, finalizers: ['data.example.test/pg-operator'], owners: [],
      spec: { version: '17', instances: 1, storage: '200Gi', resources: { memory: 4096 } },
      status: { phase: 'Recovering', instances: 0, primary: '', conditions: [C('Ready', 'False', 'PrimaryDown', 'pg-analytics-db.postgres[0] was OOM killed; restarting (3 of 5)', T('10:39')), C('Degraded', 'True', 'OOMKilled', 'postgres used 4096 MB of 4096 MB; raise spec.resources.memory', T('10:39')), C('Progressing', 'True', 'Restarting', 'waiting for the rescheduled allocation', T('10:40')), C('Drifted', 'True', 'SpecChanged', 'storage 100Gi → 200Gi not applied yet', '2026-11-05T09:00:00Z')] },
      events: [
        { time: '2026-11-05T09:00:00Z', type: 'Normal', reason: 'SpecChanged', message: 'storage 100Gi → 200Gi', reporter: 'pg-operator' },
        { time: T('10:39'), type: 'Warning', reason: 'OOMKilled', message: 'pg-analytics-db.postgres[0] OOM killed', reporter: 'pg-operator' },
        { time: T('10:40'), type: 'Normal', reason: 'Restarting', message: 'rescheduled after alloc-failure', reporter: 'pg-operator' },
      ],
    },
  ];

  const releases = [
    { name: 'nodescaler-operator', ns: 'norca-system', pack: 'nodescaler-operator', registry: 'norca-packs', version: '0.6.0', status: 'deployed', updatedAt: '2026-11-01T10:00:00Z', revision: 6, resources: [['Job', 'norca-system/nodescaler-operator'], ['ACLPolicy', 'nodescaler-operator'], ['Variable', 'nodescaler/hetzner-eu/token']], conditions: [C('Ready', 'True', 'Deployed', '', '2026-11-01T10:02:00Z'), C('Drifted', 'False', 'InSync', '', '2026-11-01T10:02:00Z')] },
    { name: 'lb-operator', ns: 'norca-system', pack: 'loadbalancer-operator', registry: 'norca-packs', version: '0.3.1', status: 'deployed', updatedAt: '2026-10-30T12:00:00Z', revision: 2, resources: [['Job', 'norca-system/lb-operator'], ['ObjectKind', 'norca.io/LoadBalancer'], ['ObjectKind', 'norca.io/LoadBalancerClass'], ['Object', 'norca.io/LoadBalancerClass/nomad'], ['ACLPolicy', 'lb-operator']], conditions: [C('Ready', 'True', 'Deployed', '', '2026-10-30T12:02:00Z'), C('Drifted', 'False', 'InSync', '', '2026-10-30T12:02:00Z')] },
    { name: 'pg-operator', ns: 'norca-system', pack: 'postgres-operator', registry: 'example-packs', version: '0.2.0', target: '0.2.1', status: 'pending-upgrade', updatedAt: T('10:35'), revision: 3, resources: [['Job', 'norca-system/pg-operator'], ['ObjectKind', 'data.example.test/PostgresCluster'], ['ACLPolicy', 'pg-operator']], conditions: [C('Ready', 'True', 'Deployed', 'revision 3 (0.2.0) is running', '2026-11-03T15:02:00Z'), C('Progressing', 'True', 'Upgrading', 'upgrade to 0.2.1 waits for its pre-upgrade hook', T('10:35'))] },
    { name: 'traefik', ns: 'infra', pack: 'traefik', registry: 'norca-packs', version: '3.2.1', status: 'deployed', updatedAt: '2026-10-28T11:20:00Z', revision: 4, resources: [['Job', 'infra/traefik']], conditions: [C('Ready', 'True', 'Deployed', '', '2026-10-28T11:22:00Z'), C('Drifted', 'True', 'ManualChange', 'job traefik was changed outside the release (meta)', '2026-11-02T08:00:00Z')] },
  ];

  const quotas = [
    { name: 'default-quota', description: 'Product workloads', limits: { cpu: 24000, mem: 49152 }, used: { cpu: 19800, mem: 42290 }, namespaces: ['default'] },
    { name: 'infra-quota', description: 'Ingress and shared services', limits: { cpu: 6000, mem: 8192 }, used: { cpu: 900, mem: 768 }, namespaces: ['infra'] },
  ];

  const scalingPolicies = [
    { id: 'pol-api', target: { ns: 'default', job: 'api', group: 'api' }, min: 3, max: 8, check: 'cpu target-value 70%', last: T('10:20') + ' 4 → 5' },
    { id: 'pol-worker', target: { ns: 'default', job: 'worker', group: 'queue' }, min: 2, max: 8, check: 'queue depth target-value 200', last: '2026-11-06T09:49:00Z 3 → 4' },
  ];

  const backups = { last: { id: '20261106T083000Z-48213', time: T('08:30'), status: 'complete', size: '41.2 MB' }, restorePending: { id: 'f1e2d3c4-b5a6-4789-8abc-def012345678', requestedByName: 'ops-anna', mode: 'Selective restore', scope: 'variables of namespace default', time: T('10:12') } };

  // The event stream (newest last). ref: [type, key] for the object link.
  const events = [
    { time: '2026-11-05T16:22:00Z', topic: 'CustomObject', type: 'ObjectEvent', ns: '', key: 'norca.io/NodeGroup/workers-dc1', ref: ['nodegroup', 'workers-dc1'], level: 'warn', text: 'ForeignNode: eu-dc1-workers-x9 is ready without an instance' },
    { time: '2026-11-05T22:14:00Z', topic: 'CustomObject', type: 'ObjectEvent', ns: '', key: 'norca.io/NodeProvider/hetzner-eu', ref: ['provider', 'hetzner-eu'], level: 'warn', text: 'OrphanedInstance hz-fsn1-7690 left running' },
    { time: T('00:00'), topic: 'Job', type: 'JobRegistered', ns: 'default', key: 'nightly-report/periodic-1762387200', ref: ['job', 'nightly-report/periodic-1762387200'], level: 'info', text: 'Periodic run launched' },
    { time: T('00:41'), topic: 'Allocation', type: 'AllocationUpdated', ns: 'default', key: A.rep1, ref: ['alloc', A.rep1], level: 'ok', text: 'complete on eu-dc2-workers-b3' },
    { time: T('07:04'), topic: 'CustomObject', type: 'ObjectUpdated', ns: '', key: 'norca.io/NodeProvider/lab-hyperv', ref: ['provider', 'lab-hyperv'], level: 'danger', text: 'Available = False (HeartbeatStale)' },
    { time: T('08:30'), topic: 'Backup', type: 'BackupCompleted', ns: '', key: '20261106T083000Z-48213', ref: ['stub', 'backups'], level: 'ok', text: 'Backup 20261106T083000Z-48213 complete (41.2 MB)' },
    { time: T('09:10'), topic: 'CustomObject', type: 'ObjectEvent', ns: '', key: 'norca.io/NodeGroup/workers-dc1', ref: ['nodegroup', 'workers-dc1'], level: 'warn', text: 'RollBlocked: eu-dc1-workers-a2 is 3 days from its hard limit' },
    { time: T('09:40'), topic: 'CustomObject', type: 'ObjectUpdated', ns: '', key: 'norca.io/NodeGroup/workers-dc2', ref: ['nodegroup', 'workers-dc2'], level: 'info', text: 'spec.node changed (image norca-node-2026-11) by ops-anna' },
    { time: T('09:49'), topic: 'Evaluation', type: 'EvaluationUpdated', ns: 'default', key: E.wBlocked, ref: ['eval', E.wBlocked], level: 'warn', text: 'blocked: worker.queue needs 4096 MB memory' },
    { time: T('09:50'), topic: 'Scaling', type: 'ScalingDecision', ns: '', key: 'norca.io/NodeGroup/workers-dc2', ref: ['nodegroup', 'workers-dc2'], level: 'info', text: 'Scaled 3 → 4 (blocked-demand)' },
    { time: T('09:57'), topic: 'Node', type: 'NodeEvent', ns: '', key: N.d3def2, ref: ['node', N.d3def2], level: 'danger', text: 'Node heartbeat missed' },
    { time: T('09:58'), topic: 'Node', type: 'NodeRegistration', ns: '', key: N.b4, ref: ['node', N.b4], level: 'ok', text: 'Node registered (hz-fsn1-7714)' },
    { time: T('09:58'), topic: 'Allocation', type: 'PlanResult', ns: 'default', key: A.q3, ref: ['alloc', A.q3], level: 'info', text: 'placed on eu-dc2-workers-b4' },
    { time: T('10:02'), topic: 'Node', type: 'NodeStatusUpdate', ns: '', key: N.d3def2, ref: ['node', N.d3def2], level: 'danger', text: 'Node is down' },
    { time: T('10:02'), topic: 'Allocation', type: 'AllocationUpdated', ns: 'norca-system', key: A.opPgLost, ref: ['alloc', A.opPgLost], level: 'danger', text: 'lost (node down)' },
    { time: T('10:02'), topic: 'Allocation', type: 'PlanResult', ns: 'norca-system', key: A.opPg, ref: ['alloc', A.opPg], level: 'info', text: 'placed on eu-dc3-default-01' },
    { time: T('10:12'), topic: 'Backup', type: 'RestoreRequested', ns: '', key: 'restore', ref: ['stub', 'backups'], level: 'warn', text: 'Selective restore requested by ops-anna, awaiting approval' },
    { time: T('10:20'), topic: 'Scaling', type: 'ScalingDecision', ns: 'default', key: 'api/api', ref: ['job', 'api'], level: 'info', text: 'api/api scaled 4 → 5 (cpu 78% > 70%)' },
    { time: T('10:20'), topic: 'Evaluation', type: 'EvaluationUpdated', ns: 'default', key: E.apiBlocked, ref: ['eval', E.apiBlocked], level: 'warn', text: 'blocked: api.api needs 2048 MB memory' },
    { time: T('10:21'), topic: 'Scaling', type: 'ScalingDecision', ns: '', key: 'norca.io/NodeGroup/workers-dc1', ref: ['nodegroup', 'workers-dc1'], level: 'info', text: 'Scaled 2 → 3 (blocked-demand)' },
    { time: T('10:21'), topic: 'CustomObject', type: 'ObjectEvent', ns: '', key: 'norca.io/NodeGroup/workers-dc1', ref: ['nodegroup', 'workers-dc1'], level: 'danger', text: 'CreateFailed: Quota (10 of 10 in nbg1)' },
    { time: T('10:30'), topic: 'Job', type: 'JobRegistered', ns: 'default', key: 'web', ref: ['job', 'web'], level: 'info', text: 'web version 7 submitted by ci-deployer' },
    { time: T('10:30'), topic: 'Deployment', type: 'DeploymentStatusUpdate', ns: 'default', key: DEP.web7, ref: ['deployment', DEP.web7], level: 'info', text: 'web v7 deployment started' },
    { time: T('10:31'), topic: 'Allocation', type: 'AllocationUpdated', ns: 'default', key: A.web0, ref: ['alloc', A.web0], level: 'ok', text: 'healthy on eu-dc1-default-01' },
    { time: T('10:34'), topic: 'Allocation', type: 'AllocationUpdated', ns: 'default', key: A.web1, ref: ['alloc', A.web1], level: 'ok', text: 'healthy on eu-dc2-default-01' },
    { time: T('10:35'), topic: 'CustomObject', type: 'ObjectUpdated', ns: 'norca-system', key: 'packs.norca.io/Release/pg-operator', ref: ['release', 'norca-system/pg-operator'], level: 'info', text: 'Release pg-operator upgrade 0.2.0 → 0.2.1 started' },
    { time: T('10:38'), topic: 'CustomObject', type: 'ObjectEvent', ns: '', key: 'norca.io/NodeGroup/workers-dc2', ref: ['nodegroup', 'workers-dc2'], level: 'info', text: 'Replacing eu-dc2-workers-b1 (surge) and eu-dc2-workers-b2 (drain)' },
    { time: T('10:38'), topic: 'Node', type: 'NodeDrain', ns: '', key: N.b2, ref: ['node', N.b2], level: 'info', text: 'Drain started, deadline 15m' },
    { time: T('10:38'), topic: 'Allocation', type: 'PlanResult', ns: 'default', key: A.q1, ref: ['alloc', A.q1], level: 'info', text: 'migrated to eu-dc2-workers-b4' },
    { time: T('10:39'), topic: 'Allocation', type: 'AllocationUpdated', ns: 'default', key: A.pgAnFail, ref: ['alloc', A.pgAnFail], level: 'danger', text: 'failed: OOM killed' },
    { time: T('10:39'), topic: 'CustomObject', type: 'ObjectUpdated', ns: 'default', key: 'data.example.test/PostgresCluster/analytics-db', ref: ['object', 'data.example.test/PostgresCluster|default|analytics-db'], level: 'danger', text: 'Degraded = True (OOMKilled)' },
    { time: T('10:39'), topic: 'Allocation', type: 'PlanResult', ns: 'default', key: A.web2, ref: ['alloc', A.web2], level: 'info', text: 'placed on eu-dc3-default-01 (rolling step 3 of 3)' },
    { time: T('10:40'), topic: 'Allocation', type: 'PlanResult', ns: 'default', key: A.pgAn, ref: ['alloc', A.pgAn], level: 'info', text: 'rescheduled on eu-dc1-workers-a1' },
  ];

  // Metric series: deterministic pseudo-random curves, 48 points of 30 minutes
  // (24 h) ending at "now". Values are percent unless the name says otherwise.
  function series(seed, base, amp, noise, trend) {
    const out = [];
    let s = seed;
    for (let i = 0; i < 48; i++) {
      s = (s * 9301 + 49297) % 233280;
      const r = s / 233280 - 0.5;
      const v = base + amp * Math.sin((i / 48) * Math.PI * 2 + seed) + noise * r + (trend || 0) * (i / 47);
      out.push(Math.max(0, Math.min(100, Math.round(v * 10) / 10)));
    }
    return out;
  }
  const flat = (v) => Array.from({ length: 48 }, () => v);
  const steps = (pairs) => {
    const out = [];
    let cur = pairs[0][1];
    for (let i = 0; i < 48; i++) {
      for (const [at, v] of pairs) if (i >= at) cur = v;
      out.push(cur);
    }
    return out;
  };

  // cells: dc/pool -> gauges of norca.cluster.* (labels dc, pool, class "").
  const cells = {
    'eu-dc1/default': { cpuAlloc: series(3, 52, 6, 4), cpuUsed: series(7, 31, 9, 6), memAlloc: series(11, 61, 4, 3), memUsed: series(13, 44, 6, 5), nodesReady: flat(2), blockedCpu: flat(0), blockedMem: flat(0), blockedEvals: flat(0) },
    'eu-dc1/edge': { cpuAlloc: series(17, 15, 1, 1), cpuUsed: series(19, 9, 4, 3), memAlloc: series(23, 6, 1, 1), memUsed: series(29, 5, 2, 1), nodesReady: flat(1), blockedCpu: flat(0), blockedMem: flat(0), blockedEvals: flat(0) },
    'eu-dc1/workers': { cpuAlloc: series(31, 70, 5, 3, 8), cpuUsed: series(37, 52, 10, 6, 6), memAlloc: series(41, 74, 4, 3, 9), memUsed: series(43, 61, 6, 4, 5), nodesReady: steps([[0, 2], [28, 3]]), blockedCpu: steps([[0, 0], [41, 1000]]), blockedMem: steps([[0, 0], [41, 2048]]), blockedEvals: steps([[0, 0], [41, 1]]) },
    'eu-dc2/default': { cpuAlloc: series(47, 26, 3, 2), cpuUsed: series(53, 18, 6, 4), memAlloc: series(59, 22, 2, 2), memUsed: series(61, 16, 4, 3), nodesReady: flat(1), blockedCpu: flat(0), blockedMem: flat(0), blockedEvals: flat(0) },
    'eu-dc2/edge': { cpuAlloc: series(67, 15, 1, 1), cpuUsed: series(71, 10, 4, 3), memAlloc: series(73, 6, 1, 1), memUsed: series(79, 5, 2, 1), nodesReady: flat(1), blockedCpu: flat(0), blockedMem: flat(0), blockedEvals: flat(0) },
    'eu-dc2/workers': { cpuAlloc: series(83, 58, 6, 4, 10), cpuUsed: series(89, 47, 12, 6, 8), memAlloc: series(97, 62, 5, 3, 8), memUsed: series(101, 50, 8, 5, 6), nodesReady: steps([[0, 3], [39, 4]]), blockedCpu: steps([[0, 0], [38, 2000], [40, 0]]), blockedMem: steps([[0, 0], [38, 4096], [40, 0]]), blockedEvals: steps([[0, 0], [38, 1], [40, 0]]) },
    'eu-dc3/default': { cpuAlloc: series(103, 31, 4, 3, 6), cpuUsed: series(107, 22, 7, 4), memAlloc: series(109, 30, 3, 2, 8), memUsed: series(113, 21, 5, 3), nodesReady: steps([[0, 2], [39, 1]]), blockedCpu: flat(0), blockedMem: flat(0), blockedEvals: flat(0) },
    'eu-dc3/edge': { cpuAlloc: series(127, 15, 1, 1), cpuUsed: series(131, 9, 4, 3), memAlloc: series(137, 6, 1, 1), memUsed: series(139, 5, 2, 1), nodesReady: flat(1), blockedCpu: flat(0), blockedMem: flat(0), blockedEvals: flat(0) },
  };

  const metrics = {
    cells,
    autopilot: { healthy: flat(1), failureTolerance: steps([[0, 1]]) },
    quotas: {
      'default-quota': { cpu: series(151, 74, 4, 3, 8).slice(0, 48), mem: series(157, 79, 3, 2, 7) },
      'infra-quota': { cpu: series(163, 15, 1, 1), mem: series(167, 9, 1, 1) },
    },
    store: { series: 1842, maxSeries: 50000, partitions: 26, disk: '182 MB', dropped: 0, sampleInterval: '30s', retention: '30d' },
  };

  // ================================================================ generated bulk
  // The region at scale: five more datacenters, two more servers and a few
  // hundred client nodes, made by a seeded generator so every page sees the
  // same objects on every load. The hand-written story objects above are
  // unchanged; the generator only adds to the lists (and gives the existing
  // metric cells the extra ready nodes).
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = mulberry32(20261107);
  const hexd = (n) => {
    let s = '';
    for (let i = 0; i < n; i++) s += Math.floor(R() * 16).toString(16);
    return s;
  };
  const gid = () => hexd(8) + '-' + hexd(4) + '-4' + hexd(3) + '-' + '89ab'[Math.floor(R() * 4)] + hexd(3) + '-' + hexd(12);
  const p2 = (i) => String(i).padStart(2, '0');
  const last_ = (a) => a[a.length - 1];
  const plus60d = (iso) => new Date(Date.parse(iso) + 60 * 864e5).toISOString().replace('.000Z', 'Z');
  const DAYS = ['10-06', '10-09', '10-13', '10-16', '10-20', '10-23', '10-27', '10-30', '11-02', '11-04'];

  // Datacenters and servers.
  [
    ['eu-dc4', 'Site D (fake)', 'Large worker site'],
    ['eu-dc5', 'Site E (fake)', 'Large worker site, the busiest'],
    ['eu-dc6', 'Site F (fake)', 'Worker site, generation rollout in progress'],
    ['eu-dc7', 'Site G (fake)', 'Worker site'],
    ['eu-dc8', 'Site H (fake)', 'Newest site, still growing'],
  ].forEach(([name, location, description]) => datacenters.push({ name, location, description }));
  servers.push(
    { id: 'srv-eu-4.eu', name: 'srv-eu-4', raftId: gid(), dc: 'eu-dc4', address: '10.10.0.14:4647', status: 'alive', leader: false, voter: true, lastIndex: 482076, lastTerm: 41, healthy: true, version: '0.9.3', stableSince: '2026-11-02T06:14:00Z' },
    { id: 'srv-eu-5.eu', name: 'srv-eu-5', raftId: gid(), dc: 'eu-dc5', address: '10.10.0.15:4647', status: 'alive', leader: false, voter: true, lastIndex: 482113, lastTerm: 41, healthy: true, version: '0.9.3', stableSince: T('10:20') }
  );
  // Raft state per server: /v1/operator/autopilot/health (from the leader),
  // /v1/agent/self stats.raft (each server), badger sizes (each server's /v1/metrics).
  const RAFT = {
    'srv-eu-1': { contact: 0, applied: 482113, commit: 482113, fsm: 0, lsm: 61.2e6, vlog: 402.6e6, levels: [2, 6, 31, 0, 0, 0, 0] },
    'srv-eu-2': { contact: 12, applied: 482113, commit: 482113, fsm: 0, lsm: 60.8e6, vlog: 401.9e6, levels: [1, 7, 30, 0, 0, 0, 0] },
    'srv-eu-3': { contact: 38, applied: 482112, commit: 482113, fsm: 1, lsm: 62.0e6, vlog: 404.1e6, levels: [3, 6, 31, 0, 0, 0, 0] },
    'srv-eu-4': { contact: 214, applied: 482076, commit: 482113, fsm: 11, lsm: 63.5e6, vlog: 398.2e6, levels: [7, 9, 30, 0, 0, 0, 0] },
    'srv-eu-5': { contact: 9, applied: 482113, commit: 482113, fsm: 0, lsm: 22.4e6, vlog: 388.0e6, levels: [1, 3, 12, 0, 0, 0, 0] },
  };
  servers.forEach((s) => {
    const r = RAFT[s.name];
    s.lastContactMs = r.contact;
    s.lastIndex = r.applied;
    s.raft = { state: s.leader ? 'Leader' : 'Follower', term: 41, appliedIndex: r.applied, commitIndex: r.commit, lastLogIndex: r.commit, lastSnapshotIndex: 475904, lastContactMs: r.contact, fsmPending: r.fsm, numPeers: servers.length - 1, protocolVersion: 3 };
    s.raftDb = { lsmBytes: r.lsm, vlogBytes: r.vlog, levels: r.levels };
  });
  const raftComm = {
    commitTimeMs: 2.4,
    peers: [
      { peer: 'srv-eu-2', appendRate: 31.2, latencyMs: 1.8, maxMs: 6.1 },
      { peer: 'srv-eu-3', appendRate: 30.9, latencyMs: 2.6, maxMs: 9.4 },
      { peer: 'srv-eu-4', appendRate: 18.4, latencyMs: 41.0, maxMs: 212.0 },
      { peer: 'srv-eu-5', appendRate: 31.0, latencyMs: 1.6, maxMs: 5.2 },
    ],
  };

  // Provider zones for the new worker groups.
  nodeProviders[0].spec.groups.push({ name: 'hel1', max: 140 }, { name: 'fra1', max: 120 });

  // Client nodes.
  const GEN = [
    ['eu-dc1', 'default', 3, 12], ['eu-dc1', 'edge', 2, 2],
    ['eu-dc2', 'default', 2, 12], ['eu-dc2', 'edge', 2, 2],
    ['eu-dc3', 'default', 3, 10], ['eu-dc3', 'edge', 2, 2],
    ['eu-dc4', 'default', 1, 24], ['eu-dc4', 'workers', 1, 48], ['eu-dc4', 'edge', 1, 3],
    ['eu-dc5', 'default', 1, 20], ['eu-dc5', 'workers', 1, 56], ['eu-dc5', 'edge', 1, 3],
    ['eu-dc6', 'default', 1, 18], ['eu-dc6', 'workers', 1, 44], ['eu-dc6', 'edge', 1, 2],
    ['eu-dc7', 'default', 1, 16], ['eu-dc7', 'workers', 1, 36], ['eu-dc7', 'edge', 1, 2],
    ['eu-dc8', 'default', 1, 12], ['eu-dc8', 'workers', 1, 24], ['eu-dc8', 'edge', 1, 2],
  ];
  const GROUP_OF_DC = { 'eu-dc4': ['workers-dc4', 'hel1'], 'eu-dc5': ['workers-dc5', 'hel1'], 'eu-dc6': ['workers-dc6', 'fra1'], 'eu-dc7': ['workers-dc7', 'fra1'], 'eu-dc8': ['workers-dc8', 'fra1'] };
  const REV = { 'workers-dc4': ['5d0b17e3', 2], 'workers-dc5': ['91c4ae20', 1], 'workers-dc6': ['e7a90c51', 5], 'workers-dc7': ['2fd8b6a4', 1], 'workers-dc8': ['b84e3c07', 1] };
  const groupNodes = {};
  const generatedNodes = [];
  for (const [dc, pool, from, to] of GEN) {
    const dcN = Number(dc.slice(-1));
    for (let i = from; i <= to; i++) {
      const name = `${dc}-${pool}-${p2(i)}`;
      const cls = pool === 'workers' ? 'cx32' : pool === 'edge' ? 'edge' : 'standard';
      const created = '2026-' + DAYS[Math.floor(R() * DAYS.length)] + 'T0' + Math.floor(R() * 9) + ':' + p2(Math.floor(R() * 60)) + ':00Z';
      const extra = { address: `10.10.${dcN}.${pool === 'default' ? 100 + i : pool === 'edge' ? 90 + i : 150 + i}`, createdAt: created };
      let rec = null;
      if (pool === 'edge') extra.meta = { 'norca.edge': 'true' };
      if (pool === 'workers') {
        const [g, zone] = GROUP_OF_DC[dc];
        const [rev, gen] = REV[g];
        const old = g === 'workers-dc6' && i <= 12; // created before rolling.generation was raised
        const inst = `hz-${zone}-${8000 + dcN * 100 + i}`;
        extra.meta = scaleMeta(g, inst, rev, old ? gen - 1 : gen, created, plus60d(created));
        rec = { name, inst, created, old };
      }
      const n = node(gid(), name, dc, pool, cls, extra);
      nodes.push(n);
      generatedNodes.push(n);
      if (rec) (groupNodes[GROUP_OF_DC[dc][0]] = groupNodes[GROUP_OF_DC[dc][0]] || []).push(Object.assign(rec, { id: n.id }));
    }
  }
  const byName = (nm) => nodes.find((x) => x.name === nm);
  // States before placement: not eligible for new work.
  Object.assign(byName('eu-dc7-default-03'), { status: 'initializing', eligible: false, createdAt: T('10:40'), lastHeartbeat: T('10:41') });
  ['eu-dc7-workers-05', 'eu-dc7-workers-06'].forEach((nm) => (byName(nm).eligible = false));

  // Generated jobs, their allocations, evaluations and deployments.
  const GJ = [
    { id: 'search', name: 'search', ns: 'default', type: 'service', status: 'running', version: 4, priority: 65, pool: 'workers', datacenters: ['eu-dc4', 'eu-dc5', 'eu-dc6', 'eu-dc7', 'eu-dc8'], submittedAt: '2026-11-05T13:00:00Z', groups: [{ name: 'query', count: 60, cpu: 2000, mem: 4096, tasks: [{ name: 'query', driver: 'docker', image: 'registry.example.test/search:3.4.1' }] }], meta: { team: 'search' }, release: null, owner: null },
    { id: 'ingest', name: 'ingest', ns: 'default', type: 'service', status: 'running', version: 11, priority: 55, pool: 'workers', datacenters: ['eu-dc4', 'eu-dc5', 'eu-dc6', 'eu-dc7', 'eu-dc8'], submittedAt: '2026-11-06T08:40:00Z', groups: [{ name: 'consumer', count: 82, cpu: 1500, mem: 3072, tasks: [{ name: 'consumer', driver: 'docker', image: 'registry.example.test/ingest:11.0.3' }] }], meta: { team: 'data' }, release: null, owner: null },
    { id: 'cache', name: 'cache', ns: 'default', type: 'service', status: 'running', version: 9, priority: 70, pool: 'default', datacenters: ['eu-*'], submittedAt: '2026-11-01T11:00:00Z', groups: [{ name: 'redis', count: 40, cpu: 500, mem: 2048, tasks: [{ name: 'redis', driver: 'docker', image: 'registry.example.test/redis:7.4' }] }], meta: { team: 'platform' }, release: null, owner: null },
  ];
  GJ.forEach((j) => jobs.push(j));
  const GDEP = { search: gid(), ingest: gid(), cache: gid() };
  const GEV = { search: gid(), ingest: gid(), cache: gid(), ingestBlocked: gid() };
  deployments.push(
    { id: GDEP.search, job: 'search', ns: 'default', version: 4, status: 'successful', desc: 'Deployment completed successfully', createdAt: '2026-11-05T13:00:00Z', progressDeadline: '10m', groups: [{ name: 'query', desired: 60, placed: 60, healthy: 60, unhealthy: 0, canaries: 0, autoRevert: true }], evals: [GEV.search], diff: [] },
    { id: GDEP.ingest, job: 'ingest', ns: 'default', version: 11, status: 'successful', desc: 'Deployment completed successfully', createdAt: '2026-11-06T08:40:00Z', progressDeadline: '10m', groups: [{ name: 'consumer', desired: 80, placed: 80, healthy: 80, unhealthy: 0, canaries: 0, autoRevert: true }], evals: [GEV.ingest], diff: [] },
    { id: GDEP.cache, job: 'cache', ns: 'default', version: 9, status: 'successful', desc: 'Deployment completed successfully', createdAt: '2026-11-01T11:00:00Z', progressDeadline: '10m', groups: [{ name: 'redis', desired: 40, placed: 40, healthy: 40, unhealthy: 0, canaries: 0, autoRevert: false }], evals: [GEV.cache], diff: [] }
  );
  evaluations.push(
    { id: GEV.search, job: 'search', ns: 'default', triggeredBy: 'job-register', status: 'complete', type: 'service', priority: 65, createdAt: '2026-11-05T13:00:00Z', deployment: GDEP.search, node: null, desc: 'Placed 60 of 60' },
    { id: GEV.ingest, job: 'ingest', ns: 'default', triggeredBy: 'job-register', status: 'complete', type: 'service', priority: 55, createdAt: '2026-11-06T08:40:00Z', deployment: GDEP.ingest, node: null, blockedEval: GEV.ingestBlocked, desc: 'Placed 80 of 82; 2 allocations queued' },
    {
      id: GEV.ingestBlocked, job: 'ingest', ns: 'default', triggeredBy: 'queued-allocs', status: 'blocked', type: 'service', priority: 55, createdAt: T('10:36'), deployment: null, node: null, prev: GEV.ingest,
      desc: 'ingest.consumer needs 2 more allocations (3000 MHz, 6144 MB); workers-dc8 is adding 2 nodes for it',
      failed: { consumer: { count: 2, nodesEvaluated: 206, nodesFiltered: 9, exhausted: { memory: 171, cpu: 26 }, classExhausted: { cx32: 197 }, filteredReason: '9 nodes ineligible or down', quota: '' } },
    },
    { id: GEV.cache, job: 'cache', ns: 'default', triggeredBy: 'job-register', status: 'complete', type: 'service', priority: 70, createdAt: '2026-11-01T11:00:00Z', deployment: GDEP.cache, node: null, desc: 'Placed 40 of 40' }
  );
  const eligible = (pool, dcs) =>
    nodes
      .filter((n) => n.pool === pool && n.status === 'ready' && n.eligible && dcs.some((g) => new RegExp('^' + g.replace(/\*/g, '.*') + '$').test(n.dc)))
      .map((n) => [R(), n])
      .sort((a, b) => a[0] - b[0])
      .map((x) => x[1]);
  const services_ = {};
  function place(j, n) {
    const g = j.groups[0];
    const cands = eligible(j.pool, j.datacenters);
    services_[j.id] = [];
    for (let i = 0; i < n; i++) {
      const nd = cands[i % cands.length];
      const a = alloc(gid(), j.id, g.name, i, nd.id, 'running', { eval: GEV[j.id], deployment: GDEP[j.id], createdAt: j.submittedAt.replace(/:00Z$/, ':30Z'), cpuUse: Math.round((0.35 + R() * 0.5) * 100) / 100, memUse: Math.round((0.4 + R() * 0.45) * 100) / 100 });
      allocations.push(a);
      services_[j.id].push(a);
    }
  }
  place(GJ[0], 60);
  place(GJ[1], 80);
  place(GJ[2], 40);
  // traefik is a system job on the edge pool: one allocation per edge node.
  generatedNodes.filter((n) => n.pool === 'edge').forEach((n) => {
    const a = alloc(gid(), 'traefik', 'traefik', 0, n.id, 'running', { eval: E.traefik, deployment: DEP.traefik3, createdAt: '2026-10-28T11:21:00Z', cpuUse: 0.2, memUse: 0.38 });
    allocations.push(a);
    services[2].instances.push([a.id, n.address + ':443', 'passing']);
  });
  services.push(
    { name: 'search', ns: 'default', job: 'search', group: 'query', port: 'http', tags: ['http', 'search'], instances: services_.search.map((a) => [a.id, nodes.find((n) => n.id === a.node).address + ':' + (21000 + Math.floor(R() * 9000)), 'passing']), lbs: [] },
    { name: 'cache', ns: 'default', job: 'cache', group: 'redis', port: 'redis', tags: ['redis'], instances: services_.cache.map((a) => [a.id, nodes.find((n) => n.id === a.node).address + ':' + (21000 + Math.floor(R() * 9000)), 'passing']), lbs: [] }
  );
  services[services.length - 2].instances[7][2] = 'warning';

  // States after placement: down nodes lose their allocations (placed again),
  // draining nodes migrate theirs.
  const replaceAlloc = (a, status, desc) => {
    const j = jobs.find((x) => x.id === a.job);
    const cands = eligible(j.pool, j.datacenters).filter((n) => n.id !== a.node);
    const nd = cands[0];
    const b = alloc(gid(), a.job, a.group, Number(a.name.match(/\[(\d+)\]/)[1]), nd.id, 'running', { eval: a.eval, deployment: a.deployment, createdAt: status === 'lost' ? T('10:13') : T('10:16'), prev: a.id, cpuUse: 0.5, memUse: 0.55 });
    Object.assign(a, { status: status === 'lost' ? 'lost' : 'running', desired: 'stop', next: b.id, desc, health: status === 'lost' ? '' : a.health });
    allocations.push(b);
  };
  [['eu-dc5-workers-13', T('10:12')], ['eu-dc5-workers-41', T('09:31')]].forEach(([nm, hb]) => {
    const n = byName(nm);
    Object.assign(n, { status: 'down', lastHeartbeat: hb });
    allocations.filter((a) => a.node === n.id && a.status === 'running').forEach((a) => replaceAlloc(a, 'lost', 'alloc is lost since its node is down'));
  });
  [['eu-dc4-default-07', T('10:15'), T('11:15'), 'Kernel update (by ops-anna)'], ['eu-dc6-workers-02', T('10:05'), T('10:50'), 'Rolling replacement of node group workers-dc6 (generation)']].forEach(([nm, started, deadline, reason]) => {
    const n = byName(nm);
    const mine = allocations.filter((a) => a.node === n.id && a.status === 'running');
    // Its allocations are being migrated: the replacement runs, the old one stops when it is healthy.
    mine.forEach((a) => replaceAlloc(a, 'running', 'alloc is being migrated: node ' + nm + ' is draining'));
    n.drain = { started, deadline, remaining: mine.length, reason };
    n.eligible = false;
  });
  byName('eu-dc6-workers-01').eligible = false; // surging: gets no new work, keeps its allocations

  // The node groups of the new worker pools.
  const okConds = (net) => [
    C('ProviderAvailable', 'True', 'Available', 'hetzner-eu answered 2s ago (version 0.6.1)', '2026-10-30T08:00:00Z'),
    C('Provisioned', 'True', 'Provisioned', '', '2026-10-30T08:00:00Z'),
    C('Rolling', 'False', 'UpToDate', 'every node is on the current template and generation', '2026-10-30T08:00:00Z'),
    C('RollBlocked', 'False', 'NotBlocked', '', '2026-10-30T08:00:00Z'),
    C('RollBehind', 'False', 'OnTime', '', '2026-10-30T08:00:00Z'),
    C('JoinFailing', 'False', 'Joining', '', '2026-10-30T08:00:00Z'),
    C('ForeignNode', 'False', 'NoForeignNode', '', '2026-10-30T08:00:00Z'),
    C('ScaleDownBlocked', 'False', 'NotBlocked', '', '2026-10-30T08:00:00Z'),
    C('NetworkCovered', 'True', 'Covered', net + ' is inside the published cluster ranges', '2026-10-01T08:00:00Z'),
  ];
  const setCond = (conds, c) => conds.splice(conds.findIndex((x) => x.type === c.type), 1, c);
  function genGroup(name) {
    const dc = 'eu-dc' + name.slice(-1);
    const [, zone] = GROUP_OF_DC[dc];
    const [rev, gen] = REV[name];
    const recs = groupNodes[name];
    const st = {
      replicas: recs.filter((r) => byName(r.name).status === 'ready').length, joining: 0, failed: 0, observedGeneration: 6, lastRequest: 40 + recs.length,
      capacity: { cpu: 8000, memory: 16384, disk: 160000 }, allocatable: { cpu: 7800, memory: 15872, disk: 160000 },
      nodes: recs.map((r, i) => ({ instance: r.inst, state: 'running', request: 1 + Math.floor(i / 8), created: r.created, node: r.id, ready: byName(r.name).status === 'ready' })),
      rollout: { replacing: [], outdated: [], warned: [], took: '12m40s' },
      decision: null,
      join: { failures: 0, revision: rev, resumed: 0, lastFailure: '' },
      conditions: okConds(`10.10.${dc.slice(-1)}.0/24`),
    };
    return {
      name, id: gid(), generation: 6, createdAt: '2026-10-01T08:00:00Z', managedBy: 'nodescaler-operator', finalizers: ['norca.io/nodescaler'], labels: { tier: 'workers', site: dc.slice(-1) },
      spec: {
        enabled: true, enforce: true, engine: 'builtin', pool: 'workers', datacenter: dc, node_class: 'cx32',
        replicas: recs.length, min: Math.max(2, recs.length - 12), max: recs.length + 16, priority: 10, weight: 1, headroom_nodes: 1, spill: false,
        provider: 'hetzner-eu', group: zone, network: `10.10.${dc.slice(-1)}.0/24`,
        node: { capacity: { cpu: 8000, memory: 16384, disk: 160000 }, reserved: { cpu: 200, memory: 512 }, parameters: { server_type: 'cx32', image: 'norca-node-2026-11' } },
        rolling: { mode: 'auto', generation: gen, max_node_age: '45d', max_unavailable: 2, max_surge: 1, jitter: '15%' },
        deletion: { policy: 'drain', drain_timeout: '1h' },
        join: { deadline: '15m', slow_after: '5m', max_failures: 3 },
        policy: { evaluation_interval: '30s', cooldown: '5m', scale_down: { unneeded_for: '10m', delay_after_add: '10m', utilization_below: 40, selector: 'least_busy', drain_deadline: '15m' } },
      },
      status: st,
      lifecycle: recs.slice(0, 5).map((r) => ({ label: r.inst, node: r.id, segs: [['running', '07:30', 'now']] })),
      marks: [],
      events: [{ time: '2026-11-05T14:00:00Z', type: 'Normal', reason: 'Scaled', message: `replicas ${recs.length - 2} → ${recs.length} (headroom)`, reporter: 'autoscaler' }],
    };
  }
  const g4 = genGroup('workers-dc4');
  const g5 = genGroup('workers-dc5');
  const g6 = genGroup('workers-dc6');
  const g7 = genGroup('workers-dc7');
  const g8 = genGroup('workers-dc8');
  // workers-dc5: two nodes down, scale down vetoed.
  g5.status.scaleDown = { vetoes: 2, retryAfter: T('11:22'), reason: 'NoCandidate', message: 'every candidate holds an allocation of search.query under distinct_hosts that no other node could take' };
  setCond(g5.status.conditions, C('ScaleDownBlocked', 'True', 'NoCandidate', 'no node of the group may go: every candidate holds an allocation under distinct_hosts that no other node could take', T('10:02'), T('11:22')));
  g5.lifecycle = [
    { label: 'hz-hel1-8513', node: byName('eu-dc5-workers-13').id, segs: [['running', '07:30', '10:12'], ['failed', '10:12', 'now', 'down']] },
    { label: 'hz-hel1-8541', node: byName('eu-dc5-workers-41').id, segs: [['running', '07:30', '09:31'], ['failed', '09:31', 'now', 'down']] },
  ].concat(g5.lifecycle.slice(0, 4));
  g5.marks = [['09:31', 'eu-dc5-workers-41 down'], ['10:02', 'scale down vetoed (NoCandidate)'], ['10:12', 'eu-dc5-workers-13 down']];
  g5.events.push(
    { time: T('10:02'), type: 'Warning', reason: 'ScaleDownBlocked', message: 'no candidate (distinct_hosts); retry at 11:22 (veto 2)', reporter: 'nodescaler-operator' },
    { time: T('09:31'), type: 'Warning', reason: 'NodeWithoutInstance', message: 'eu-dc5-workers-41 is down; its instance hz-hel1-8541 still runs at the provider', reporter: 'nodescaler-operator' }
  );
  // workers-dc6: rolling.generation raised 4 → 5; two replacements under way.
  const d6 = groupNodes['workers-dc6'];
  const n601 = byName('eu-dc6-workers-01');
  const n602 = byName('eu-dc6-workers-02');
  g6.status.rollout = {
    replacing: [
      { instance: d6[0].inst, name: d6[0].inst, node: n601.id, nodeName: n601.name, reason: 'generation', surge: true, drain: false, phase: 'surging', since: T('10:05'), started: T('10:05'), expires: plus60d(d6[0].created) },
      { instance: d6[1].inst, name: d6[1].inst, node: n602.id, nodeName: n602.name, reason: 'generation', surge: false, drain: true, phase: 'draining', since: T('10:05'), started: T('10:05'), expires: plus60d(d6[1].created) },
    ],
    outdated: d6.filter((r) => r.old).slice(2).map((r) => r.name),
    warned: [],
    took: '13m05s',
  };
  g6.status.replicas -= 2;
  g6.status.joining = 1;
  // The first surge instance did not join by its deadline; the second one is joining now.
  g6.status.nodes.push({ instance: 'hz-fra1-8645', state: 'creating', request: g6.status.lastRequest + 2, created: T('10:38') });
  g6.status.lastRequest += 2;
  setCond(g6.status.conditions, C('Rolling', 'True', 'Replacing', '2 of 12 outdated nodes being replaced (generation 4 → 5)', T('10:05')));
  g6.lifecycle = [
    { label: d6[0].inst, node: n601.id, segs: [['running', '07:30', '10:05'], ['surging', '10:05', 'now']] },
    { label: d6[1].inst, node: n602.id, segs: [['running', '07:30', '10:05'], ['draining', '10:05', 'now']] },
    { label: 'hz-fra1-8644', node: null, segs: [['requested', '10:05', '10:06'], ['joining', '10:06', '10:25'], ['failed', '10:25', '10:27', 'join timeout']] },
    { label: 'hz-fra1-8645', node: null, segs: [['requested', '10:38', '10:39'], ['joining', '10:39', 'now']] },
    { label: d6[2].inst, node: d6[2].id, segs: [['running', '07:30', 'now', 'outdated']] },
  ];
  g6.marks = [['09:55', 'rolling.generation 4 → 5'], ['10:05', 'rollout started']];
  g6.events.push(
    { time: T('09:55'), type: 'Normal', reason: 'WouldReplace', message: '12 nodes are outdated (generation)', reporter: 'nodescaler-operator' },
    { time: T('10:05'), type: 'Normal', reason: 'Replacing', message: `${n601.name} (generation): surge, waiting for its replacement`, reporter: 'nodescaler-operator' },
    { time: T('10:05'), type: 'Normal', reason: 'Replacing', message: `${n602.name} (generation): remove first, draining`, reporter: 'nodescaler-operator' },
    { time: T('10:25'), type: 'Warning', reason: 'JoinTimeout', message: 'hz-fra1-8644 did not join within join.deadline (15m) + 5m; deleted (join failure 1 of 3)', reporter: 'nodescaler-operator' },
    { time: T('10:38'), type: 'Normal', reason: 'InstancesRequested', message: 'hz-fra1-8645 for the replacement of ' + n601.name, reporter: 'nodescaler-operator' }
  );
  g6.status.join.failures = 1;
  g6.status.join.lastFailure = T('10:25');
  // workers-dc8: scale-up 24 → 26 for the blocked ingest allocations, two instances joining.
  g8.spec.replicas = 26;
  g8.spec.max = 40;
  g8.status.joining = 2;
  g8.status.nodes.push({ instance: 'hz-fra1-8825', state: 'creating', request: g8.status.lastRequest + 1, created: T('10:38') }, { instance: 'hz-fra1-8826', state: 'creating', request: g8.status.lastRequest + 1, created: T('10:38') });
  g8.status.lastRequest += 1;
  g8.status.decision = {
    time: T('10:37'), replicas: 26, previous: 24, check: 'blocked-demand',
    reason: '2 allocations of default/ingest/consumer blocked: 3000 MHz CPU, 6144 MB memory in eu-dc8/workers',
    evaluations: [GEV.ingestBlocked], work: [{ namespace: 'default', job: 'ingest', group: 'consumer', count: 2 }],
  };
  g8.lifecycle = [
    { label: 'hz-fra1-8825', node: null, segs: [['requested', '10:38', '10:39'], ['joining', '10:39', 'now']] },
    { label: 'hz-fra1-8826', node: null, segs: [['requested', '10:38', '10:39'], ['joining', '10:39', 'now']] },
  ].concat(g8.lifecycle.slice(0, 3));
  g8.marks = [['10:36', 'ingest blocked'], ['10:37', 'Scaled 24 → 26']];
  g8.events.push(
    { time: T('10:37'), type: 'Normal', reason: 'Scaled', message: 'replicas 24 → 26 (blocked-demand: 2 allocations of default/ingest/consumer)', reporter: 'autoscaler' },
    { time: T('10:38'), type: 'Normal', reason: 'InstancesRequested', message: 'request eu/workers-dc8/' + g8.status.lastRequest + ': 2 instances (hz-fra1-8825, hz-fra1-8826)', reporter: 'nodescaler-operator' }
  );
  g4.marks = [['10:00', 'steady']];
  g7.marks = [['09:40', 'two nodes made ineligible by hand']];
  nodeGroups.push(g4, g5, g6, g7, g8);

  // Events of the generated objects.
  events.push(
    { time: T('09:31'), topic: 'Node', type: 'NodeStatusUpdate', ns: '', key: byName('eu-dc5-workers-41').id, ref: ['node', byName('eu-dc5-workers-41').id], level: 'danger', text: 'Node is down' },
    { time: T('09:55'), topic: 'CustomObject', type: 'ObjectUpdated', ns: '', key: 'norca.io/NodeGroup/workers-dc6', ref: ['nodegroup', 'workers-dc6'], level: 'info', text: 'rolling.generation 4 → 5 by ops-ben' },
    { time: T('10:02'), topic: 'CustomObject', type: 'ObjectEvent', ns: '', key: 'norca.io/NodeGroup/workers-dc5', ref: ['nodegroup', 'workers-dc5'], level: 'warn', text: 'ScaleDownBlocked: no candidate (distinct_hosts)' },
    { time: T('10:05'), topic: 'Node', type: 'NodeDrain', ns: '', key: n602.id, ref: ['node', n602.id], level: 'info', text: 'Drain started (rolling replacement)' },
    { time: T('10:12'), topic: 'Node', type: 'NodeStatusUpdate', ns: '', key: byName('eu-dc5-workers-13').id, ref: ['node', byName('eu-dc5-workers-13').id], level: 'danger', text: 'Node is down' },
    { time: T('10:15'), topic: 'Node', type: 'NodeDrain', ns: '', key: byName('eu-dc4-default-07').id, ref: ['node', byName('eu-dc4-default-07').id], level: 'info', text: 'Drain started by ops-anna (kernel update)' },
    { time: T('10:20'), topic: 'Node', type: 'NodeRegistration', ns: '', key: 'srv-eu-5', ref: ['server', 'srv-eu-5'], level: 'info', text: 'Server srv-eu-5 restarted and rejoined' },
    { time: T('10:36'), topic: 'Evaluation', type: 'EvaluationUpdated', ns: 'default', key: GEV.ingestBlocked, ref: ['eval', GEV.ingestBlocked], level: 'warn', text: 'blocked: ingest.consumer needs 6144 MB memory' },
    { time: T('10:37'), topic: 'Scaling', type: 'ScalingDecision', ns: '', key: 'norca.io/NodeGroup/workers-dc8', ref: ['nodegroup', 'workers-dc8'], level: 'info', text: 'Scaled 24 → 26 (blocked-demand)' },
    { time: T('10:40'), topic: 'Node', type: 'NodeRegistration', ns: '', key: byName('eu-dc7-default-03').id, ref: ['node', byName('eu-dc7-default-03').id], level: 'info', text: 'Node registered, initializing' }
  );
  events.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

  // Quota usage follows the allocations of the namespace.
  {
    const live = allocations.filter((a) => a.ns === 'default' && a.desired === 'run' && ['running', 'pending'].includes(a.status));
    const size = (a) => jobs.find((j) => j.id === a.job).groups.find((g) => g.name === a.group);
    const cpu = live.reduce((s, a) => s + size(a).cpu, 0);
    const mem = live.reduce((s, a) => s + size(a).mem, 0);
    Object.assign(quotas[0], { used: { cpu, mem }, limits: { cpu: Math.round(cpu / 0.82 / 1000) * 1000, mem: Math.round(mem / 0.86 / 1024) * 1024 } });
  }

  // Metric cells for every datacenter and pool, and the ready nodes of the
  // existing cells moved up by the generated nodes.
  {
    let seed = 200;
    for (const dc of datacenters.map((d) => d.name)) {
      for (const pool of nodePools.map((p) => p.name)) {
        const here = nodes.filter((n) => n.dc === dc && n.pool === pool);
        if (!here.length) continue;
        const ready = here.filter((n) => n.status === 'ready').length;
        const key = dc + '/' + pool;
        const c = cells[key];
        if (c) {
          const off = ready - last_(c.nodesReady);
          c.nodesReady = c.nodesReady.map((v) => v + off);
          continue;
        }
        seed += 7;
        const base = pool === 'workers' ? 62 : pool === 'edge' ? 16 : 40;
        const hot = key === 'eu-dc5/workers' ? 24 : key === 'eu-dc8/workers' ? 14 : 0;
        cells[key] = {
          cpuAlloc: series(seed, base + hot, 5, 3, 4), cpuUsed: series(seed + 1, base - 14 + hot, 9, 5, 4),
          memAlloc: series(seed + 2, base + 4 + hot, 4, 3, 4), memUsed: series(seed + 3, base - 10 + hot, 7, 4, 3),
          nodesReady: key === 'eu-dc5/workers' ? steps([[0, ready + 2], [45, ready + 1], [46, ready]]) : flat(ready),
          blockedCpu: key === 'eu-dc8/workers' ? steps([[0, 0], [47, 3000]]) : flat(0),
          blockedMem: key === 'eu-dc8/workers' ? steps([[0, 0], [47, 6144]]) : flat(0),
          blockedEvals: key === 'eu-dc8/workers' ? steps([[0, 0], [47, 1]]) : flat(0),
        };
      }
    }
  }

  // The metrics store of every server (/v1/operator/metrics-store), with the
  // planned retention: 24h–720h, changeable with a reload.
  const GiB = 1073741824;
  metrics.servers = [
    { server: 'srv-eu-1', retention: '168h', oldest: '2026-10-30T10:42:00Z', diskBytes: 412e6, maxDiskSize: 2 * GiB, series: 1384, maxSeries: 50000, dropped: 0, partitions: 28 },
    { server: 'srv-eu-2', retention: '168h', oldest: '2026-10-30T10:42:00Z', diskBytes: 409e6, maxDiskSize: 2 * GiB, series: 1384, maxSeries: 50000, dropped: 0, partitions: 28 },
    { server: 'srv-eu-3', retention: '168h', oldest: '2026-11-01T06:00:00Z', diskBytes: 509e6, maxDiskSize: 0.5 * GiB, series: 1384, maxSeries: 50000, dropped: 0, partitions: 21, note: 'max_disk_size reached: the oldest partitions went before the retention' },
    { server: 'srv-eu-4', retention: '168h', oldest: '2026-10-30T10:42:00Z', diskBytes: 415e6, maxDiskSize: 2 * GiB, series: 1381, maxSeries: 50000, dropped: 3, partitions: 28, note: '3 reports dropped (the server was behind on Raft)' },
    { server: 'srv-eu-5', retention: '720h', oldest: '2026-10-07T10:42:00Z', diskBytes: 1.61e9, maxDiskSize: 2 * GiB, series: 1384, maxSeries: 50000, dropped: 0, partitions: 120, note: 'retention differs from the other servers' },
  ];
  metrics.store = { series: 1384, maxSeries: 50000, partitions: 28, disk: '412 MB', dropped: 0, sampleInterval: '30s', retention: '168h', retentionHours: 168 };
  metrics.raftComm = raftComm;

  window.NORCA = {
    now: T('10:42'),
    user: { name: 'ops-anna', token: 'ops-anna (management)' },
    region: { name: 'eu', leader: 'srv-eu-1', seal: 'unsealed', federation: [] },
    regions: [{ name: 'eu', reachable: true }],
    datacenters, nodePools, namespaces, servers, nodes, jobs, allocations, evaluations, deployments,
    services, intentions, nodeGroups, nodeProviders, lbClasses, loadBalancers, kinds, objects,
    releases, quotas, scalingPolicies, backups, events, metrics,
  };
})();
