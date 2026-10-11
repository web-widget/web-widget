---
'@web-widget/web-router': major
'@web-widget/vite-plugin': patch
---

Enable streaming SSR in dev and simplify the dev configuration surface.

### Features

- **Streaming SSR in dev** — dev no longer buffers responses; `progressive` works the same as in production.

### Breaking Changes

- `Manifest.dev` and `StartOptions.dev` are removed; use `exposeErrors` instead. The `DevRouteModule` and `DevHttpHandler` types are removed. `progressive` now defaults to `false` in all environments (was `true` in production via `!dev`); set `defaultRenderer.progressive` explicitly if you need streaming.
