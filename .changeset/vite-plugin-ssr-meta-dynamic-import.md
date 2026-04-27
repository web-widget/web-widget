---
'@web-widget/vite-plugin': minor
---

Align dev SSR HTML `meta` link/CSS discovery with production `getLinks` behavior for static `imports` and filtered `dynamicImports`, so async CSS inclusion is consistent between dev and build. This also streamlines internal predicate wiring used by the vite plugin.
