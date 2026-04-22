---
'@web-widget/vite-plugin': minor
---

**Problem:** SSR / `meta.link` was preloading almost everything reachable from a `@widget` client chunk—including lazy `import()` subgraphs—so `<head>` filled with **stylesheet** and **modulepreload** links that often belong to UI loaded only after interaction, not first paint.

**Change:** Treat the widget module as the boundary for that preload set: **@widget** `meta.link` now follows **static `imports` only** for tightening; **dynamic `import()`** children no longer contribute their own **CSS** or **entry JS** preload links (route-level and client entry behavior stay fully eager). Routes that `dynamicImport` a widget still prelink **that** widget’s own assets. Accepts the usual trade-off: dynamic-only sub-UI may flash until the chunk runs unless moved into the static graph or styled inline.
