---
'@web-widget/react': minor
'@web-widget/vue': minor
'@web-widget/vue2': minor
'@web-widget/vite-plugin': minor
---

Remove `?as=jsx` / `?as=tsx` query parameter support and rename `toReact` to `asReactWidget`. Use `asReactWidget()` type adapter instead of `?as=jsx` imports. `toReact` is kept as a deprecated alias.
