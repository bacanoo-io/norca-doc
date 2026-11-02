---
title: "search Block"
linkTitle: "search"
description: "The \"search\" block specifies configuration for the search API provided by the Norca servers."
upstream:
  path: "website/content/docs/configuration/search.mdx"
---

**Placement:** `server -> search`

The `search` block specifies configuration for the search API provided by the
Norca servers.

```hcl
server {
  search {
    fuzzy_enabled   = true
    limit_query     = 200
    limit_results   = 1000
    min_term_length = 5
  }
}
```

## `search` Parameters

- `fuzzy_enabled` `(bool: true)` - Specifies whether the [fuzzy search API][fuzzy]
  is enabled. If not enabled, requests to the fuzzy search API endpoint will return
  an error response.

- `limit_query` `(int: 20)` - Specifies the maximum number of Norca objects to
  search through per context type in the Norca server before truncating results.
  Setting this parameter to a high value may degrade Norca server performance.

- `limit_results` `(int: 100)` - Specifies the maximum number of matching results
  to accumulate per context type in the API response before truncating results.
  Setting this parameter to a high value may cause excessively large API response sizes.

- `min_term_length` `(int: 2)` - Specifies the minimum size of the search term
  allowed for matching with the fuzzy search API. Setting this value higher can
  prevent unnecessary load on the Norca server from broad queries.

[fuzzy]: /docs/api/search#fuzzy-searching
