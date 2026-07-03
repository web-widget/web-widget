---
'@web-widget/web-router': major
'@web-widget/vite-plugin': patch
---

Replace the `dev: true` manifest flag with private collaboration fields for dev tooling and error visibility.

### Features

- **`manifest.exposeErrors`** — vite-plugin sets this to `true` in dev so server error pages always include the underlying error. It takes precedence over the user-facing `exposeErrors` option, preserving the previous `dev: true` behavior where error details are surfaced during development.
- **`manifest.moduleSource`** — vite-plugin injects the matched route module path (e.g. `/routes/index@route.tsx`) into the routemap manifest, written to the `x-module-source` response header so inspector and similar tools can jump to the right file without ad hoc hooks. This is a private collaboration field between `@web-widget/vite-plugin` and `@web-widget/web-router`, not intended for application code.
- **`DEV_MODULE_SOURCE_HEADER`** — the `x-module-source` header name is now exported as a constant.

### Breaking Changes

- `Manifest.dev` and `StartOptions.dev` are removed; use `exposeErrors` instead. The `DevRouteModule` and `DevHttpHandler` types are removed. `progressive` now defaults to `false` in all environments (was `true` in production via `!dev`); set `defaultRenderer.progressive` explicitly if you need streaming.
