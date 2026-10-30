# SPDX-FileCopyrightText: 2026 Norca contributors
# SPDX-License-Identifier: MPL-2.0
"""Embed the norca-deployer documentation into norca-doc (content/docs/deployer).

Usage: python3 scripts/sync-deployer-docs.py [norca-deployer checkout, default ../norca-deployer]

The pages are copied in full (not linked): front matter added, the H1 title
moved into the front matter, links between the deployer pages rewritten to
the norca-doc paths, and the example plans embedded with their content. The
originals stay in the norca-deployer repository; run this again after they
change.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '..', 'norca-deployer')
DST = os.path.join(ROOT, 'content', 'docs', 'deployer')
BASE = '/docs/deployer'

# (source file in doc/, target page, weight, linkTitle)
PAGES = [
    ('getting-started.md', 'getting-started', 1, 'Getting started'),
    ('how-apply-works.md', 'how-apply-works', 2, 'How apply works'),
    ('configuration.md', 'configuration', 3, 'Configuration reference'),
    ('security.md', 'security', 4, 'Security'),
    ('host-packages-and-scripts.md', 'host-packages-and-scripts', 5, 'Host packages and scripts'),
    ('networking-and-tuning.md', 'networking-and-tuning', 6, 'Networking and tuning'),
    ('node-labels-and-pools.md', 'node-labels-and-pools', 7, 'Node labels and pools'),
    ('adding-and-removing-nodes.md', 'adding-and-removing-nodes', 8, 'Adding and removing nodes'),
    ('secrets-and-policies.md', 'secrets-and-policies', 9, 'Secrets and ACL policies'),
    ('packs.md', 'packs', 10, 'Packs'),
    ('multi-datacenter.md', 'multi-datacenter', 11, 'Several datacenters with NATS'),
    ('multi-region.md', 'multi-region', 12, 'Multi-region'),
    ('windows.md', 'windows', 13, 'Windows nodes'),
]
PAGE_OF = {src: slug for src, slug, _, _ in PAGES}

# Example plans: slug, title, description, files (label, path, language)
EXAMPLES = [
    ('single-node', 'Single node', 'One machine running the Norca server and client: TLS, gossip encryption, ACLs, host packages, a script.',
     [('YAML', 'examples/single-node.yaml', 'yaml'), ('HCL', 'examples/single-node.hcl', 'hcl')]),
    ('cluster', 'Cluster', 'Three servers, Linux clients with Docker, a Windows client; firewall, PKI and SPIFFE, node labels and pools, secrets, NATS with the event bridge.',
     [('YAML', 'examples/cluster.yaml', 'yaml'), ('HCL', 'examples/cluster.hcl', 'hcl'),
      ('policies/natsbridge.hcl', 'examples/policies/natsbridge.hcl', 'hcl'),
      ('scripts/prepare-data-disk.sh', 'examples/scripts/prepare-data-disk.sh', 'bash')]),
    ('multi-datacenter', 'Several datacenters with NATS', 'One region over three datacenters: a server per datacenter, a NATS cluster with one server per datacenter, the event bridge into a JetStream stream with 3 replicas.',
     [('YAML', 'examples/multi-datacenter.yaml', 'yaml'), ('policies/natsbridge.hcl', 'examples/policies/natsbridge.hcl', 'hcl')]),
    ('local-dev', 'Local development node', 'Norca on the machine the deployer runs on, without SSH, on loopback only.',
     [('YAML', 'examples/local-dev.yaml', 'yaml')]),
    ('add-node', 'Adding a node', 'A client added to a running cluster: only the new node is installed.',
     [('YAML', 'examples/add-node.yaml', 'yaml')]),
    ('decommission-node', 'Removing nodes', 'Clients and servers taken out of a running cluster: drain, Raft removal, uninstall.',
     [('YAML', 'examples/decommission-node.yaml', 'yaml')]),
]
EXAMPLE_FILES = {}
for slug, _, _, files in EXAMPLES:
    for _, path, _ in files:
        EXAMPLE_FILES.setdefault(path.replace('examples/', ''), slug)

LINK_RE = re.compile(r'\]\(([^)\s]+)\)')


def rewrite_link(target):
    if re.match(r'^[a-z]+://', target) or target.startswith('#') or target.startswith('/'):
        return target
    path, _, anchor = target.partition('#')
    anchor = '#' + anchor if anchor else ''
    path = re.sub(r'^(\./|\.\./)+', '', path)
    path = re.sub(r'^doc/', '', path)
    if path in ('README.md', ''):
        return BASE + '/' + anchor
    if path in PAGE_OF:
        return BASE + '/' + PAGE_OF[path] + anchor
    if path == 'examples' or path == 'examples/':
        return BASE + '/examples/' + anchor
    if path.startswith('examples/'):
        rel = path[len('examples/'):]
        if rel in EXAMPLE_FILES:
            return BASE + '/examples/' + EXAMPLE_FILES[rel] + anchor
        return BASE + '/examples/' + anchor
    raise SystemExit('unmapped link: ' + target)


def rewrite_links(text):
    return LINK_RE.sub(lambda m: '](' + rewrite_link(m.group(1)) + ')', text)


def split_title(text):
    lines = text.split('\n')
    assert lines[0].startswith('# '), lines[0]
    return lines[0][2:].strip(), '\n'.join(lines[1:]).lstrip('\n')


def first_sentence(body):
    for para in body.split('\n\n'):
        p = para.strip()
        if p and not p.startswith(('#', '|', '`', '-', '>', '{{', '!', '1.')):
            s = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', p.replace('\n', ' '))
            s = s.split('. ')[0].rstrip('.') + '.'
            return s.replace('"', "'")
    return ''


def front_matter(title, link_title, weight, origin, description):
    fm = ['---', f'title: "{title}"']
    if link_title and link_title != title:
        fm.append(f'linkTitle: "{link_title}"')
    if description:
        fm.append(f'description: "{description}"')
    fm.append(f'weight: {weight}')
    fm.append(f'origin: "{origin}"')
    fm.append('---')
    return '\n'.join(fm) + '\n\n'


def read(rel):
    with open(os.path.join(SRC, rel), encoding='utf-8') as f:
        return f.read().replace('\r\n', '\n')


def write(rel, text):
    path = os.path.join(DST, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def main():
    # Section index: the deployer README (features, build, commands, state),
    # then the overview of doc/README.md (architecture), then the page cards.
    readme_title, readme = split_title(read('README.md'))
    overview_title, overview = split_title(read('doc/README.md'))

    # From the README: everything up to the Documentation list (the cards
    # replace it). The Examples table is replaced by the examples section.
    readme = readme.split('\n## Documentation\n')[0].rstrip() + '\n'
    readme = re.sub(r'\n## Examples\n.*?(?=\n## )',
                    '\n## Examples\n\nComplete plans with a comment on every setting are in the '
                    '[examples](' + BASE + '/examples/) section, in YAML and HCL.\n',
                    readme, flags=re.S)
    arch = overview.split('\n## Architecture in one picture\n', 1)[1]

    cards = ['{{< cards >}}']
    icons = ['play', 'refresh', 'adjustments', 'shield-check', 'cube', 'globe-alt', 'tag', 'switch-horizontal',
             'key', 'archive', 'server', 'globe', 'desktop-computer']
    descs = {}
    for src, slug, weight, link_title in PAGES:
        t, b = split_title(read('doc/' + src))
        descs[slug] = first_sentence(b)
    for (src, slug, weight, link_title), icon in zip(PAGES, icons):
        cards.append(f'  {{{{< card link="{slug}" title="{link_title}" icon="{icon}" >}}}}')
    cards.append('  {{< card link="examples" title="Examples" icon="document-text" >}}')
    cards.append('{{< /cards >}}')

    index = front_matter('Norca Deployer', 'Deployer', 9, 'norca-deployer/README.md',
                         'Install and maintain Norca clusters from a declarative plan: servers and clients over SSH, '
                         'rolling restarts, TLS and ACLs, packages, packs and secrets.')
    index += rewrite_links(readme).rstrip() + '\n\n## Documentation\n\n' + '\n'.join(cards) + '\n\n'
    index += '## Architecture in one picture\n' + rewrite_links(arch)
    write('_index.md', index)

    for src, slug, weight, link_title in PAGES:
        title, body = split_title(read('doc/' + src))
        page = front_matter(title, link_title, weight, 'norca-deployer/doc/' + src, descs[slug])
        page += rewrite_links(body)
        write(slug + '.md', page)

    # Examples section with the full plans.
    rows = ['| Example | Content |', '| --- | --- |']
    for slug, title, desc, _ in EXAMPLES:
        rows.append(f'| [{title}]({BASE}/examples/{slug}) | {desc} |')
    ex_index = front_matter('Deployer examples', 'Examples', 14, 'norca-deployer/examples',
                            'Complete deployment plans with a comment on every setting.')
    ex_index += ('Complete plans with a comment on every setting. YAML and HCL plans use the same keys, and the '
                 'YAML and HCL versions of an example load to the same plan. Paths in a plan (keys, `.deb` files, '
                 'scripts, policies) are relative to the plan file.\n\n' + '\n'.join(rows) + '\n\n'
                 'The cluster example reads the signing key of the Docker APT repository from `keys/docker.asc`; '
                 'download it from <https://download.docker.com/linux/debian/gpg> next to the plan.\n')
    write('examples/_index.md', ex_index)

    for i, (slug, title, desc, files) in enumerate(EXAMPLES, start=1):
        page = front_matter(title, None, i, 'norca-deployer/' + files[0][1], desc.replace('"', "'"))
        page += desc + '\n\n'
        plans = [f for f in files if f[0] in ('YAML', 'HCL')]
        extras = [f for f in files if f[0] not in ('YAML', 'HCL')]
        if len(plans) > 1:
            page += '{{< tabs >}}\n'
            for label, path, lang in plans:
                page += f'{{{{< tab name="{label}" >}}}}\n\n`{os.path.basename(path)}`:\n\n```{lang}\n{read(path).rstrip()}\n```\n\n{{{{< /tab >}}}}\n'
            page += '{{< /tabs >}}\n'
        else:
            label, path, lang = plans[0]
            page += f'`{os.path.basename(path)}`:\n\n```{lang}\n{read(path).rstrip()}\n```\n'
        for label, path, lang in extras:
            page += f'\n## {label}\n\n```{lang}\n{read(path).rstrip()}\n```\n'
        write(f'examples/{slug}.md', page)
    print('written to', DST)


main()
