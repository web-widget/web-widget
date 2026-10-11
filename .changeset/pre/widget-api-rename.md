---
'@web-widget/schema': major
'@web-widget/vite-plugin': major
'@web-widget/react': major
'@web-widget/vue': major
'@web-widget/vue2': major
'@web-widget/html': major
'@web-widget/preact': major
'@web-widget/solid': major
'@web-widget/svelte': major
'@web-widget/lit': major
'@web-widget/web-components': major
---

Rename the adapter widget wrapper API from `container()` to `widget()`.
The `AdapterModule.container` contract field is now `AdapterModule.widget`,
and generated imports use `widget` exclusively. This is a breaking change;
there is no compatibility export for the old API.
