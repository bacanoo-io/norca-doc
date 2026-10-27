# SPDX-FileCopyrightText: 2026 Norca contributors
# SPDX-License-Identifier: MPL-2.0
"""Check the internal links of the built site and forbidden external domains.

Usage: python3 scripts/check-links.py <public dir> [base path, default /norca-doc/]

The base path is the path part of the site's baseURL. Every href/src that
points into the site must name an existing page or file; links to the
HashiCorp websites are forbidden. Exits with 1 if anything was found.
"""
import os
import re
import sys
from collections import defaultdict
from urllib.parse import unquote, urljoin, urlparse

PUB = sys.argv[1]
BASE = sys.argv[2] if len(sys.argv) > 2 else "/norca-doc/"
if not BASE.endswith("/"):
    BASE += "/"
FORBIDDEN = re.compile(r"nomadproject\.io|developer\.hashicorp\.com|learn\.hashicorp\.com")
ATTR = re.compile(r"""(?:href|src)=["']?([^"'\s>]+)""")

broken = defaultdict(set)
forbidden = defaultdict(set)
pages = 0
for root, _, files in os.walk(PUB):
    for f in files:
        if not f.endswith(".html") or "mockups" in root:
            continue
        path = os.path.join(root, f)
        rel = os.path.relpath(path, PUB).replace("\\", "/")
        page_url = "https://site.example" + BASE + (rel[: -len("index.html")] if rel.endswith("index.html") else rel)
        with open(path, encoding="utf-8", errors="replace") as fh:
            html = fh.read()
        pages += 1
        for url in ATTR.findall(html):
            if FORBIDDEN.search(url):
                forbidden[url].add(rel)
            if url.startswith(("mailto:", "javascript:", "data:", "#")):
                continue
            full = urljoin(page_url, url)
            u = urlparse(full)
            if u.netloc != "site.example":
                continue
            p = unquote(u.path)
            if not p.startswith(BASE):
                broken[url].add(rel)
                continue
            local = os.path.join(PUB, p[len(BASE):])
            if p.endswith("/"):
                local = os.path.join(local, "index.html")
            if not os.path.exists(local) and not os.path.exists(local + ".html") and not os.path.exists(os.path.join(local, "index.html")):
                broken[url].add(rel)

print("pages:", pages, "broken internal links:", len(broken), "forbidden links:", len(forbidden))
for url, where in sorted(broken.items()):
    print("BROKEN", url, "<-", ", ".join(sorted(where)[:3]), "(%d)" % len(where))
for url, where in sorted(forbidden.items()):
    print("FORBIDDEN", url, "<-", ", ".join(sorted(where)[:3]))
sys.exit(1 if broken or forbidden else 0)
