---
'@web-widget/react': minor
'@web-widget/vue': minor
'@web-widget/vue2': minor
'@web-widget/html': minor
'@web-widget/schema': minor
'@web-widget/vite-plugin': minor
---

Container type inference: `container()` is now a generic function that
automatically infers widget props types from the source module's default export,
enabling cross-framework type interoperability without manual conversion
functions.
