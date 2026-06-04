---
'@web-widget/vite-plugin': patch
---

On client builds, `remove-exports` replaces `handler` and `config` with `export const name = void 0` stubs and keeps other specifiers on the same `export` statement (for example `default` on `export { … } from`).
