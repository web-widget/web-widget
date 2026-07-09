---
'@web-widget/react': minor
'@web-widget/vue': patch
'@web-widget/vue2': patch
---

React Widget island error recovery: `defineWebWidget` now integrates
`ErrorBoundary` and `Suspense` internally so a widget rendering failure is
contained within its own island instead of crashing the whole page.

- The `fallback` prop accepts either a `ReactNode` (used for both loading and
  error) or `{ loading?, error? }` to differentiate the two states.
- Widget render errors in streaming SSR no longer leave the loading fallback
  permanently visible — the error UI replaces it via React's `$RC` mechanism.
- `onError` now always calls `console.error` per the React docs.
- Non-streaming mode correctly rejects on shell errors, enabling the
  framework's `_500` error page.

**Breaking**: `@web-widget/react` package entry split — the `.` entry now
exports user-facing API only (`defineRouteComponent`, `defineMeta`, etc.).
Runtime code (`render`, `defineWebWidget`, `useWidgetState`) moved to
`./runtime`. Update imports:

```diff
- import { render, defineWebWidget } from '@web-widget/react';
+ import { render, defineWebWidget } from '@web-widget/react/runtime';
```

`@web-widget/vue` and `@web-widget/vue2` updated to import
`ReactWidgetComponent` from `@web-widget/react/runtime`.
