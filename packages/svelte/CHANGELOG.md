# @web-widget/svelte

## 3.0.0-beta.4

### Major Changes

- d2ccffa: Add `loading: 'auto'` and make it the default Widget loading strategy. Auto
  loading prioritizes visible and interactive Widgets and loads all remaining
  Widgets when the browser is idle, while leaving resource concurrency to the
  browser. Explicit `eager`, `lazy`, and `idle` strategies retain their existing
  behavior.
- 4e19787: Unify Widget render-mode configuration around the mutually exclusive
  `serverOnly` and `clientOnly` booleans.

  **Breaking:** `WidgetContainerOptions` and `WebWidgetRendererOptions` no longer
  accept `renderStage`. Pass `serverOnly: true` or `clientOnly: true` through the
  per-use `widget` prop instead. Render mode is no longer a definition-time
  `widget(loader, options)` default, so adapters can pass the mutually exclusive
  props directly to the renderer without a separate merge policy.

- d2ccffa: Rename the adapter widget wrapper API from `container()` to `widget()`.
  The `AdapterModule.container` contract field is now `AdapterModule.widget`,
  and generated imports use `widget` exclusively. This is a breaking change;
  there is no compatibility export for the old API.

### Minor Changes

- d2ccffa: Add experimental Shadow DOM SSR boundaries with declarative shadow roots,
  native slot projection, isolated widget styles, and an internal HTMLElement
  mount root shared by framework adapters.

  Widget `meta.style` and stylesheet links are installed in shadow boundaries on
  the server and client. Solid widgets conservatively fall back to client
  rendering inside isolated shadow roots until their hydration key namespace can
  be made root-local. Browsers without native Declarative Shadow DOM parsing use
  a client-side fallback before custom elements are registered.

  The new `webWidgetPlugin.defaults` option configures the default `loading` and
  `root` values for transformed Widget containers. In shadow mode, route
  asset collection omits Widget CSS from the document head and keeps it in each
  shadow boundary. Explicit container options override the injected defaults.

  In development, Vite-transformed Widget CSS is embedded in declarative shadow
  roots and tracked by stable style IDs for HMR. CSS updates invalidate the
  server importer chain so CSS Modules class maps and shadow-local selectors stay
  in sync after reloads.

### Patch Changes

- d2ccffa: Add `@web-widget/schema/testing`, a runner-neutral adapter conformance suite,
  and use it to verify the server and client lifecycle contracts of every built-in
  adapter.

  Server render streams may contain either string chunks or UTF-8 encoded byte
  chunks, allowing adapters to expose framework-native streams without decoding
  them first.

- Updated dependencies [d2ccffa]
- Updated dependencies [d2ccffa]
- Updated dependencies [b60f210]
- Updated dependencies [2e0fd18]
- Updated dependencies [d2ccffa]
- Updated dependencies [4e19787]
- Updated dependencies [d2ccffa]
  - @web-widget/schema@3.0.0-beta.4
  - @web-widget/web-widget@3.0.0-beta.4
  - @web-widget/helpers@3.0.0-beta.4

## 3.0.0-beta.3

### Patch Changes

- Updated dependencies [2fe95e0]
  - @web-widget/web-widget@3.0.0-beta.3
  - @web-widget/helpers@3.0.0-beta.3
  - @web-widget/schema@3.0.0-beta.3

## 3.0.0-beta.2

### Minor Changes

- 1a47400: Add Preact, Solid, Svelte, Lit, and Web Components adapters. Preact, Solid, and Svelte support SSR and client hydration; Lit and Web Components provide client-side rendering adapters.

  Widget and route modules now accept either `@widget` / `@route` or `.widget` / `.route` markers. Adapter scopes are arrays of directory prefixes, and shared structural prop extraction improves cross-framework `container()` inference with an explicit `container<Props>()` fallback.

  The HTML adapter now matches `.ts` and `.js` under the directories configured in `scopes` instead of requiring `.html.ts` and `.html.js`.

### Patch Changes

- Updated dependencies [1a47400]
  - @web-widget/schema@3.0.0-beta.2
  - @web-widget/helpers@3.0.0-beta.2
  - @web-widget/web-widget@3.0.0-beta.2
