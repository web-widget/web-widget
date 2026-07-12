---
'@web-widget/schema': minor
'@web-widget/vite-plugin': major
'@web-widget/react': major
'@web-widget/vue': major
'@web-widget/vue2': major
---

Introduce the **WebWidgetAdapter protocol**: framework adapters now declare metadata (`name`, `extensions`, `adapter`, `deriveExports`) via the `webWidget` field in `package.json`, and a single `webWidgetPlugin({ adapters: [...] })` replaces all per-framework Vite plugins.

**Breaking changes:**

- `reactWebWidgetPlugin` / `vueWebWidgetPlugin` / `vue2WebWidgetPlugin` and their `./vite` subpath exports are removed. Use `webWidgetPlugin({ adapters: [...] })` instead:

  ```diff
  - import reactWebWidgetPlugin from '@web-widget/react/vite';
  - import vueWebWidgetPlugin from '@web-widget/vue/vite';
  + import { webWidgetPlugin } from '@web-widget/vite-plugin';

    plugins: [
  -   reactWebWidgetPlugin(),
  -   vueWebWidgetPlugin(),
  +   webWidgetPlugin({
  +     adapters: ['@web-widget/react', '@web-widget/vue'],
  +   }),
    ],
  ```

- Adapter packages no longer depend on `@web-widget/vite-plugin` or `vite`.
