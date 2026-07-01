---
'@web-widget/vite-plugin': major
---

Migrate to **Vite 8 Environment API** so router builds and dev SSR match how Vite expects frameworks to work today.

### Build

- **One `vite build` for client + server** — no second build triggered from `writeBundle`; removed `autoFullBuild` (use `vite build --ssr` when you only need the server output).
- **Smaller, clearer client bundles** — client chunks come from `entry.client`, widgets, actions, and CSS referenced by routes; `@route` / `@layout` / `@fallback` stay server-only. SSR `meta.link` is resolved from that asset graph instead of shipping whole route modules to the client.
- **Breaking:** `autoFullBuild` is removed.

### Dev

- **Faster startup on large apps** — dev routemap loads each route on demand instead of importing every route at entry cold start.
- **Predictable SSR refresh** — server file changes invalidate the SSR graph and refresh the browser via standard `hotUpdate` / `full-reload`, replacing fragile `ws.send` hijacks and middleware restarts.
- **Steadier dev server** — request and background failures (routemap regen, HMR) are logged instead of crashing the process.
- **Correct request URLs in dev/preview** — origin resolution follows Vite’s `server.origin` → `resolvedUrls` → config fallback.
