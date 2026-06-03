---
'@web-widget/vite-plugin': patch
---

Fix client build removing entire route re-exports when stripping server-only `handler`/`config` exports. Bare `export { handler, default } from './page'` now keeps `default` so `page.tsx` and `@widget` assets stay in the client manifest (fixes #752).
