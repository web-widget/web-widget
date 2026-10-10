---
'@web-widget/vite-plugin': major
'@web-widget/web-widget': patch
---

Migrate to **Vite 8 Environment API** so router builds and dev SSR match how Vite expects frameworks to work today.

### Features

- **One `vite build` for client + server** — a single build now produces both environments; build order is reversed to server → client so the server build no longer depends on the client manifest.
- **Smaller, clearer client bundles** — client chunks come from `entry.client`, widgets, actions, and CSS referenced by routes; `@route` / `@layout` / `@fallback` stay server-only, reducing what ships to the browser.
- **CSS merging for faster first paint** — per-entry CSS is no longer split into many `<link>` tags. By default, CSS under 8 KB is inlined as a single `<style>`; larger sets are merged into one external stylesheet, reducing requests and improving FCP. Configure via `css.inlineStrategy` (`'auto'` | `'always'` | `'never'`) and `css.inlineThreshold`.
- **Convention files auto-ensure** — missing `importmap.client.json` and `routemap.server.json` are created automatically on first `vite dev` / `vite build`; only `entry.client` and `entry.server` must be provided.
- **Faster dev startup on large apps** — dev routemap loads each route on demand via analyzable `import(path)` loaders instead of importing every route at entry cold start.
- **Predictable SSR refresh** — server file changes invalidate the SSR graph and refresh the browser via standard `hotUpdate` / `full-reload`, replacing fragile `ws.send` hijacks and middleware restarts.
- **Server warmup and revision-based caching** — `entry.server` and `routemap.server.json` are pre-warmed at startup; `WebRouter` is cached per-revision and re-imported only when the server module graph is invalidated.

### Fixes

- **Predictable build artifact names** — `index` path segments are folded and chunks are named by module path (e.g. `examples.action@route.js` instead of `index@route4.js`), making `assets/` output easier to map back to source.
- **Steadier dev server** — request and background failures (routemap regen, HMR) are logged instead of crashing the process.
- **Correct request URLs in dev/preview** — origin resolution follows Vite's `server.origin` → `resolvedUrls` → config fallback, fixing misuse of `config.preview` and premature `resolvedUrls` reads.
- **Webworker SSR resolve conditions** — conditions are now derived from Vite's `defaultClientConditions` (prepending `worklet`/`worker`, dropping `browser`) instead of a hardcoded list, so dev mode picks up `development` export conditions for source-level HMR.
- **Respects native Vite manifest config** — the client manifest now follows Vite's `build.manifest` setting instead of a custom `output.manifest` path. The manifest cannot be disabled (server asset resolution depends on it).

### Breaking Changes

- `autoFullBuild` and `output.manifest` config options are removed; `dynamicImportPredicate` is replaced by `widgetModuleFilter`. Use `vite build --ssr` when you only need the server output.
