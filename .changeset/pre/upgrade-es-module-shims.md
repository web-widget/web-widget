---
'@web-widget/vite-plugin': patch
---

Upgrade the default `es-module-shims` polyfill URL from `1.10.0` to `2.8.2`.

The `importShim.url` default now points at the latest `es-module-shims` release,
keeping the import-maps polyfill current for browsers without native support.
