# @web-widget/web-components

## 3.0.0-beta.4

### Major Changes

- d2ccffa: Add `loading: 'auto'` and make it the default Widget loading strategy. Auto
  loading prioritizes visible and interactive Widgets and loads all remaining
  Widgets when the browser is idle, while leaving resource concurrency to the
  browser. Explicit `eager`, `lazy`, and `idle` strategies retain their existing
  behavior.
- d2ccffa: Rename the adapter widget wrapper API from `container()` to `widget()`.
  The `AdapterModule.container` contract field is now `AdapterModule.widget`,
  and generated imports use `widget` exclusively. This is a breaking change;
  there is no compatibility export for the old API.

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
