---
'@web-widget/web-router': patch
'@web-widget/vite-plugin': patch
---

Expose **which route file rendered a response** for dev tools and **preserve dev-mode error visibility** via private collaboration fields.

- **`manifest.moduleSource`** — vite-plugin injects the matched route module path (e.g. `/routes/index@route.tsx`) into the routemap manifest, written to the `x-module-source` response header so inspector and similar tools can jump to the right file without ad hoc hooks. This is a private collaboration field between `@web-widget/vite-plugin` and `@web-widget/web-router`, not intended for application code.
- **`manifest.exposeErrors`** — vite-plugin sets this to `true` in dev so server error pages always include the underlying error. It takes precedence over the user-facing `exposeErrors` option, preserving the previous `dev: true` behavior where error details are surfaced during development.
- **Removed:** `responseHeaders` and `ResponseHeadersProvider` — the `x-module-source` workflow is now handled internally via `manifest.moduleSource`.
