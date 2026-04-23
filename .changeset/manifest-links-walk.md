---
'@web-widget/vite-plugin': patch
---

Refine client manifest `<link>` collection: keep visit dedupe and href dedupe in a dedicated walk state, drop the `cache` argument from `getLinks`, and pass the dynamic-import filter from `exportRenderPlugin` so route modules collect intended preload links.
