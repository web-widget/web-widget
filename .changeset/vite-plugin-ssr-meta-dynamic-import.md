---
'@web-widget/vite-plugin': minor
---

Align dev SSR HTML `meta` link/CSS discovery with production `getLinks` rules for static `imports` vs `dynamicImports`, using the same optional predicate. Register `dynamicImportPredicate` on `WebRouterPluginApi` from `webWidgetPlugin` instead of a separate API plugin. Rename `ContainDynamicImports` / `isWidgetManifestKey` style names to `DynamicImportPredicate` / `dynamicImportPredicate` on `exportRenderPlugin` options.
