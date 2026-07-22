---
'@web-widget/html': major
'@web-widget/lit': minor
'@web-widget/preact': minor
'@web-widget/react': minor
'@web-widget/schema': minor
'@web-widget/solid': minor
'@web-widget/svelte': minor
'@web-widget/vite-plugin': major
'@web-widget/vue': minor
'@web-widget/vue2': minor
'@web-widget/web-components': minor
---

Add Preact, Solid, Svelte, Lit, and Web Components adapters. Preact, Solid, and Svelte support SSR and client hydration; Lit and Web Components provide client-side rendering adapters.

Widget and route modules now accept either `@widget` / `@route` or `.widget` / `.route` markers. Adapter scopes are arrays of directory prefixes, and shared structural prop extraction improves cross-framework `container()` inference with an explicit `container<Props>()` fallback.

The HTML adapter now matches `.ts` and `.js` under the directories configured in `scopes` instead of requiring `.html.ts` and `.html.js`.
