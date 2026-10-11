---
'@web-widget/schema': major
'@web-widget/web-widget': major
'@web-widget/html': major
'@web-widget/preact': major
'@web-widget/react': major
'@web-widget/solid': major
'@web-widget/svelte': major
'@web-widget/vue': major
'@web-widget/vue2': major
---

Unify Widget render-mode configuration around the mutually exclusive
`serverOnly` and `clientOnly` booleans.

**Breaking:** `WidgetContainerOptions` and `WebWidgetRendererOptions` no longer
accept `renderStage`. Pass `serverOnly: true` or `clientOnly: true` through the
per-use `widget` prop instead. Render mode is no longer a definition-time
`widget(loader, options)` default, so adapters can pass the mutually exclusive
props directly to the renderer without a separate merge policy.
