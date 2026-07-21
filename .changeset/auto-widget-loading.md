---
'@web-widget/schema': major
'@web-widget/web-widget': major
'@web-widget/vite-plugin': major
'@web-widget/lit': major
'@web-widget/web-components': major
'@web-widget/html': major
'@web-widget/preact': major
'@web-widget/react': major
'@web-widget/solid': major
'@web-widget/svelte': major
'@web-widget/vue': major
'@web-widget/vue2': major
---

Add `loading: 'auto'` and make it the default Widget loading strategy. Auto
loading prioritizes visible and interactive Widgets and loads all remaining
Widgets when the browser is idle, while leaving resource concurrency to the
browser. Explicit `eager`, `lazy`, and `idle` strategies retain their existing
behavior.
