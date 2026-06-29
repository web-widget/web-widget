---
'@web-widget/vite-plugin': patch
---

Add user-configurable widget / CSS discovery scope and a unified ignore list.

- **`widget.searchDirs`** — directories scanned for `@widget` / CSS entries during client build. Defaults to `['.']` (vite root), so widgets colocated with routes or placed anywhere under root are discovered without extra configuration.
- **`ignore`** — top-level list applied to both file-system route scanning and widget / CSS asset scanning. Defaults to `['node_modules', 'dist', 'build', 'out', 'coverage', '.git', '.cache', '.vite', '.turbo']`. Replaces the previous hardcoded ignore lists, so users can tune a single list for the whole plugin.
