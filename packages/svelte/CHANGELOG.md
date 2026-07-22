# @web-widget/svelte

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
