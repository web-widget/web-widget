---
'@web-widget/web-router': patch
'@web-widget/vite-plugin': patch
---

Unify **dev-time behavior** behind one option and expose **which route file rendered a response** for dev tools.

- **`dev` is the single dev knob** — `dev: true` applies sensible defaults; `dev: { exposeErrors, progressive, moduleSource }` merges overrides on manifest and `WebRouter.fromManifest`. Replaces scattered top-level `exposeErrors` / `responseHeaders` options.
- **`x-module-source` header in dev** — vite-plugin sets the matched route module path (e.g. `/routes/index@route.tsx`) so inspector and similar tools can jump to the right file without ad hoc hooks.
- **Removed:** top-level `exposeErrors`, `responseHeaders`, and `ResponseHeadersProvider`.
