---
'@web-widget/web-router': minor
'@web-widget/schema': minor
'@web-widget/helpers': patch
---

Add runtime internal URL rewrite: `context.rewrite(destination)` re-matches and runs the target route handler chain while keeping `context.request` (the browser URL) unchanged. Supports same-origin destinations, query merge, skipping already-run global (`*`) middleware, nested depth limits, and loop detection.

- **@web-widget/schema**: optional `rewrite()` on `FetchContext`.
- **@web-widget/web-router**: `rewrite` implementation, matched-stack runner, `getPathFromResolvedUrl`, tests, and RFC `rfcs/rewrite.zh.md`.
- **@web-widget/helpers**: `compose` awaits middleware return values so async handlers and `rewrite()` rejections propagate to `onError` reliably.
